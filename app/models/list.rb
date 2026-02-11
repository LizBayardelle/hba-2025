class List < ApplicationRecord
  belongs_to :user
  belongs_to :category, optional: true
  has_many :checklist_items, as: :checklistable, dependent: :destroy
  has_many :list_attachments, dependent: :destroy
  has_many :habit_attachments, -> { where(attachable_type: 'Habit') }, class_name: 'ListAttachment'
  has_many :task_attachments, -> { where(attachable_type: 'Task') }, class_name: 'ListAttachment'

  validates :name, presence: true

  scope :ordered, -> { order(:name) }
  scope :pinned_first, -> { order(pinned: :desc, name: :asc) }
  scope :active, -> { where(archived_at: nil) }
  scope :archived, -> { where.not(archived_at: nil) }

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
