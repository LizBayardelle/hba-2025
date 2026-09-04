class PromptAnswer < ApplicationRecord
  belongs_to :prompt_response
  belongs_to :prompt_question

  has_rich_text :body

  delegate :question_type, to: :prompt_question

  # response_value is a jsonb keyed by the *kind* of value, so changing a
  # question's type makes the reader look under a key nothing was written to.
  # The old value is never lost — these maps let us find and show it again.
  VALUE_KEYS = {
    "short_answer"    => "text",
    "integer"         => "number",
    "yes_no"          => "yes",
    "multiple_choice" => "selected",
    "checkboxes"      => "selected"
  }.freeze

  KEY_LABELS = {
    "text"     => "Short text",
    "number"   => "Number",
    "yes"      => "Yes / No",
    "selected" => "Choice"
  }.freeze

  def text_value;     response_value["text"]; end
  def number_value;   response_value["number"]; end
  def yes_value;      response_value["yes"]; end
  def selected_value; response_value["selected"]; end

  def text_value=(val);     self.response_value = (response_value || {}).merge("text" => val); end
  def number_value=(val);   self.response_value = (response_value || {}).merge("number" => val.presence && val.to_i); end
  def yes_value=(val)
    truthy = [true, "true", "1", 1, "yes"].include?(val)
    self.response_value = (response_value || {}).merge("yes" => truthy)
  end
  def selected_value=(val)
    self.response_value = (response_value || {}).merge("selected" => val)
  end

  def display_value
    case question_type
    when "short_answer"     then text_value
    when "integer"          then number_value
    when "yes_no"           then yes_value.nil? ? nil : (yes_value ? "Yes" : "No")
    when "multiple_choice"  then Array(selected_value).join(", ").presence
    when "checkboxes"       then Array(selected_value).join(", ")
    when "long_answer"      then body.to_s
    end
  end

  def blank_value?
    case question_type
    when "short_answer"    then text_value.blank?
    when "integer"         then number_value.nil?
    when "yes_no"          then yes_value.nil?
    when "multiple_choice" then selected_value.blank?
    when "checkboxes"      then Array(selected_value).empty?
    when "long_answer"     then body.to_plain_text.strip.blank?
    end
  end

  # Values written while this question was a different type. Returns
  # [{ label: "Short text", value: "Laser-focused" }, ...] — empty when the
  # question's type never changed, which is the overwhelmingly common case.
  def legacy_values
    current_key = VALUE_KEYS[question_type]

    entries = (response_value || {}).filter_map do |key, raw|
      next if key == current_key
      next if raw.nil? || (raw.respond_to?(:empty?) && raw.empty?)
      { label: KEY_LABELS[key] || key.humanize, value: format_legacy(key, raw) }
    end

    # Long text lives in Action Text rather than the jsonb
    if question_type != "long_answer"
      plain = body.to_plain_text.to_s.strip
      entries << { label: "Long text", value: plain } if plain.present?
    end

    entries
  end

  # Only worth surfacing when the current type has nothing to show.
  def legacy_only?
    blank_value? && legacy_values.any?
  end

  private

  def format_legacy(key, raw)
    case key
    when "yes"      then raw ? "Yes" : "No"
    when "selected" then Array(raw).join(", ")
    else raw.to_s
    end
  end
end
