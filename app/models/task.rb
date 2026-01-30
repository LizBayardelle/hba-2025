class Task < ApplicationRecord
  belongs_to :user
  belongs_to :category, optional: true
  belongs_to :document, optional: true, foreign_key: :attached_document_id
  belongs_to :importance_level, optional: true
  belongs_to :time_block, optional: true
  has_and_belongs_to_many :documents
  has_many :taggings, as: :taggable, dependent: :destroy
  has_many :tags, through: :taggings
  has_many :checklist_items, as: :checklistable, dependent: :destroy
  has_many :list_attachments, as: :attachable, dependent: :destroy
  has_many :attached_lists, through: :list_attachments, source: :list
  has_rich_text :notes

  validates :name, presence: true

  # Set completed_at when task is marked as completed and archive attached lists
  before_save :set_completed_at
  after_save :archive_attached_lists_if_completed

  def set_completed_at
    if completed_changed?
      if completed?
        self.completed_at = Time.current if completed_at.nil?
      else
        self.completed_at = nil
      end
    end
  end

  def archive_attached_lists_if_completed
    if saved_change_to_completed? && completed?
      attached_lists.update_all(archived_at: Time.current)
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

  # Helper method to assign documents by ID
  def task_content_ids=(ids)
    self.document_ids = ids.reject(&:blank?)
  end

  # Helper method to assign lists by ID
  def list_attachment_ids=(ids)
    list_ids = ids.reject(&:blank?).map(&:to_i)
    # Remove attachments not in the new list
    list_attachments.where.not(list_id: list_ids).destroy_all
    # Add new attachments
    list_ids.each do |list_id|
      list_attachments.find_or_create_by(list_id: list_id)
    end
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
