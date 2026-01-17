class Task < ApplicationRecord
  belongs_to :user
  belongs_to :category, optional: true
  belongs_to :document, optional: true, foreign_key: :attached_document_id
  belongs_to :importance_level, optional: true
  belongs_to :time_block, optional: true
  has_many :taggings, as: :taggable, dependent: :destroy
  has_many :tags, through: :taggings
  has_rich_text :notes

  validates :name, presence: true

  # Set completed_at when task is marked as completed
  before_save :set_completed_at

  def set_completed_at
    if completed_changed?
      if completed?
        self.completed_at = Time.current if completed_at.nil?
      else
        self.completed_at = nil
      end
    end
  end

  scope :active, -> { where(archived_at: nil, completed: false) }
  scope :completed, -> { where(completed: true) }
  scope :incomplete, -> { where(completed: false, archived_at: nil) }
  scope :on_hold, -> { where(on_hold: true) }
  scope :overdue, -> { where('due_date < ?', Date.today).active }
  scope :new_tasks, -> { where('created_at >= ?', 24.hours.ago) }
  scope :added_this_week, -> { where('created_at >= ?', Time.zone.now.beginning_of_week) }
  scope :added_this_month, -> { where('created_at >= ?', Time.zone.now.beginning_of_month) }
  scope :festering, -> { where('created_at <= ?', 1.month.ago).incomplete }

  # Helper method to assign tags by name
  def tag_names=(names)
    self.tags = names.map do |name|
      user.tags.find_or_create_by(name: name.strip)
    end
  end

  def tag_names
    tags.pluck(:name)
  end

  # Mark task as completed
  def complete!
    update(completed: true, completed_at: Time.current)
  end

  # Reopen a completed task
  def reopen!
    update(completed: false, completed_at: nil)
  end

  # Archive task
  def archive!
    update(archived_at: Time.current)
  end

  # Unarchive task
  def unarchive!
    update(archived_at: nil)
  end
end
