class Task < ApplicationRecord
  REPEAT_FREQUENCIES = %w[daily weekly monthly yearly].freeze

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
  validates :repeat_frequency, inclusion: { in: REPEAT_FREQUENCIES }, allow_nil: true

  # Set completed_at when task is marked as completed and archive attached lists
  before_save :set_completed_at
  after_save :archive_attached_lists_if_completed
  after_save :create_next_occurrence_if_repeating

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
    # Don't archive lists for repeating tasks (they'll be reused)
    if saved_change_to_completed? && completed? && !repeating?
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

  # Check if task is repeating
  def repeating?
    repeat_frequency.present?
  end

  # Calculate the next due date based on repeat settings
  def next_due_date
    return nil unless repeating? && due_date.present?

    base_date = due_date
    interval = repeat_interval || 1
    today = Date.current

    # Keep advancing until the next date is today or in the future
    next_date = base_date
    loop do
      next_date = case repeat_frequency
      when 'daily'
        next_date + interval.days
      when 'weekly'
        calculate_next_weekly_date(next_date, interval)
      when 'monthly'
        calculate_next_monthly_date(next_date, interval)
      when 'yearly'
        next_date + interval.years
      end

      break if next_date >= today
    end

    # Check if next date exceeds end date
    if repeat_end_date.present? && next_date > repeat_end_date
      nil
    else
      next_date
    end
  end

  private

  def calculate_next_weekly_date(base_date, interval)
    days = repeat_days.presence || []

    if days.empty?
      # Simple weekly repeat (same day each week)
      base_date + interval.weeks
    else
      # Find next valid day of week
      days = days.map(&:to_i).sort
      current_wday = base_date.wday

      # Find next day in the same week or next interval
      next_day = days.find { |d| d > current_wday }

      if next_day
        # Same week, different day
        base_date + (next_day - current_wday).days
      else
        # First day of next interval week
        days_until_next_week = (7 * interval) - current_wday + days.first
        base_date + days_until_next_week.days
      end
    end
  end

  def calculate_next_monthly_date(base_date, interval)
    days = repeat_days.presence || []

    if days.empty?
      # Simple monthly repeat (same day each month)
      base_date + interval.months
    elsif days.first.to_s == 'last'
      # Last day of month
      next_month = base_date + interval.months
      next_month.end_of_month
    else
      # Specific day of month
      target_day = days.first.to_i
      next_month = base_date + interval.months
      # Handle months with fewer days
      actual_day = [target_day, next_month.end_of_month.day].min
      Date.new(next_month.year, next_month.month, actual_day)
    end
  end

  def create_next_occurrence_if_repeating
    return unless saved_change_to_completed? && completed? && repeating?

    next_date = next_due_date
    return unless next_date

    # Create the next occurrence
    new_task = user.tasks.create!(
      name: name,
      category_id: category_id,
      importance_level_id: importance_level_id,
      time_block_id: time_block_id,
      due_date: next_date,
      due_time: due_time,
      url: url,
      location_name: location_name,
      location_lat: location_lat,
      location_lng: location_lng,
      repeat_frequency: repeat_frequency,
      repeat_interval: repeat_interval,
      repeat_days: repeat_days,
      repeat_end_date: repeat_end_date,
      completed: false
    )

    # Copy notes if present
    if notes.body.present?
      new_task.notes = notes.body.to_html
      new_task.save!
    end

    # Copy checklist items (reset to incomplete)
    checklist_items.each do |item|
      new_task.checklist_items.create!(
        user: user,
        name: item.name,
        position: item.position,
        completed: false
      )
    end

    # Copy list attachments and reset their items
    list_attachments.each do |attachment|
      new_task.list_attachments.create!(
        list_id: attachment.list_id,
        user: user
      )
      # Reset list items for the next occurrence
      attachment.list.checklist_items.update_all(completed: false, completed_at: nil)
    end

    # Copy tags
    new_task.tag_names = tag_names if tags.any?
  end
end
