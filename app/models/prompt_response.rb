class PromptResponse < ApplicationRecord
  belongs_to :user
  belongs_to :prompt

  has_rich_text :body

  scope :recent_first, -> { order(created_at: :desc) }
  scope :chronological, -> { order(created_at: :asc) }

  def text_value
    response_value["text"]
  end

  def text_value=(val)
    self.response_value = (response_value || {}).merge("text" => val)
  end

  def number_value
    response_value["number"]
  end

  def number_value=(val)
    self.response_value = (response_value || {}).merge("number" => val.presence && val.to_i)
  end

  def yes_value
    response_value["yes"]
  end

  def yes_value=(val)
    truthy = [true, "true", "1", 1, "yes"].include?(val)
    self.response_value = (response_value || {}).merge("yes" => truthy)
  end

  def selected_value
    response_value["selected"]
  end

  def selected_value=(val)
    self.response_value = (response_value || {}).merge("selected" => val)
  end

  def display_value
    case prompt&.question_type
    when "short_answer"     then text_value
    when "integer"          then number_value
    when "yes_no"           then yes_value ? "Yes" : "No"
    when "multiple_choice"  then selected_value
    when "checkboxes"       then Array(selected_value).join(", ")
    when "long_answer"      then body.to_s
    end
  end
end
