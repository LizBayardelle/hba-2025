class PrepResponse < ApplicationRecord
  belongs_to :user
  belongs_to :prep_question

  has_rich_text :long_response

  validates :response_date, presence: true
  validates :prep_question_id, uniqueness: { scope: :response_date }

  scope :for_date, ->(date) { where(response_date: date) }
  scope :for_question, ->(question) { where(prep_question: question) }
  scope :chronological, -> { order(response_date: :asc) }
  scope :reverse_chronological, -> { order(response_date: :desc) }

  # Convenience methods for different response types
  def text_value
    response_value["text"]
  end

  def text_value=(val)
    self.response_value = response_value.merge("text" => val)
  end

  def checked?
    response_value["checked"] == true
  end

  def checked=(val)
    self.response_value = response_value.merge("checked" => val)
  end

  def selected_options
    response_value["selected"] || []
  end

  def selected_options=(val)
    self.response_value = response_value.merge("selected" => val)
  end
end
