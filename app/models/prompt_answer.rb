class PromptAnswer < ApplicationRecord
  belongs_to :prompt_response
  belongs_to :prompt_question

  has_rich_text :body

  delegate :question_type, to: :prompt_question

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
    when "multiple_choice"  then selected_value
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
end
