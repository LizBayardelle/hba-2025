class PromptQuestion < ApplicationRecord
  belongs_to :prompt
  has_many :prompt_answers, dependent: :destroy

  enum :question_type, {
    short_answer: 0,
    long_answer: 1,
    integer: 2,
    yes_no: 3,
    multiple_choice: 4,
    checkboxes: 5
  }

  before_validation :clean_options

  validates :text, presence: true
  validates :question_type, presence: true
  validate :options_present_for_choice_types

  scope :ordered, -> { order(:position, :id) }

  def needs_options?
    multiple_choice? || checkboxes?
  end

  private

  def clean_options
    return unless options.is_a?(Array)
    self.options = options.map { |o| o.to_s.strip }.reject(&:blank?)
  end

  def options_present_for_choice_types
    return unless needs_options?
    cleaned = Array(options).map { |o| o.to_s.strip }.reject(&:blank?)
    if cleaned.empty?
      errors.add(:options, "must include at least one option")
    end
  end
end
