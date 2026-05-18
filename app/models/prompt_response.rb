class PromptResponse < ApplicationRecord
  belongs_to :user
  belongs_to :prompt
  has_many :prompt_answers, dependent: :destroy

  accepts_nested_attributes_for :prompt_answers

  scope :recent_first, -> { order(created_at: :desc) }
  scope :chronological, -> { order(created_at: :asc) }

  def answer_for(question)
    prompt_answers.find { |a| a.prompt_question_id == question.id }
  end
end
