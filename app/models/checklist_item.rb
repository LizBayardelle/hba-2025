class ChecklistItem < ApplicationRecord
  belongs_to :checklistable, polymorphic: true
  belongs_to :user

  validates :name, presence: true

  scope :ordered, -> { order(:position, :created_at) }
  scope :completed, -> { where(completed: true) }
  scope :incomplete, -> { where(completed: false) }

  before_save :set_completed_at

  private

  def set_completed_at
    if completed_changed?
      if completed?
        self.completed_at = Time.current if completed_at.nil?
      else
        self.completed_at = nil
      end
    end
  end
end
