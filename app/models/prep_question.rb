class PrepQuestion < ApplicationRecord
  belongs_to :user
  has_many :prep_responses, dependent: :destroy

  enum :question_type, {
    short_answer: 0,
    long_answer: 1,
    checkbox: 2,
    multiple_choice: 3
  }

  validates :question_text, presence: true
  validates :question_type, presence: true
  validates :options, presence: true, if: :multiple_choice?

  scope :active, -> { where(archived_at: nil) }
  scope :archived, -> { where.not(archived_at: nil) }
  scope :ordered, -> { order(:position) }

  def archived?
    archived_at.present?
  end

  def archive!
    update(archived_at: Time.current)
  end

  def unarchive!
    update(archived_at: nil)
  end
end
