class Goal < ApplicationRecord
  GOAL_TYPES = %w[named_steps counted].freeze

  belongs_to :user
  belongs_to :category, optional: true
  belongs_to :importance_level, optional: true
  belongs_to :time_block, optional: true
  has_and_belongs_to_many :documents
  has_many :taggings, as: :taggable, dependent: :destroy
  has_many :tags, through: :taggings
  has_many :checklist_items, as: :checklistable, dependent: :destroy
  has_many :list_attachments, as: :attachable, dependent: :destroy
  has_many :attached_lists, through: :list_attachments, source: :list

  validates :name, presence: true
  validates :goal_type, inclusion: { in: GOAL_TYPES }
  validates :target_count, numericality: { greater_than: 0 }, if: -> { goal_type == 'counted' }

  before_save :check_completion

  scope :active, -> { where(archived_at: nil, completed: false) }
  scope :completed, -> { where(completed: true) }

  def progress
    if goal_type == 'counted'
      return 0 if target_count.to_i.zero?
      [(current_count.to_f / target_count * 100).round, 100].min
    else
      total = checklist_items.count
      return 0 if total.zero?
      completed_steps = checklist_items.where(completed: true).count
      [(completed_steps.to_f / total * 100).round, 100].min
    end
  end

  def increment_count!(amount = 1)
    update!(current_count: [current_count + amount, target_count].min)
  end

  def decrement_count!(amount = 1)
    update!(current_count: [current_count - amount, 0].max)
  end

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
  def goal_content_ids=(ids)
    self.document_ids = ids.reject(&:blank?)
  end

  # Helper method to assign lists by ID
  def list_attachment_ids=(ids)
    list_ids = ids.reject(&:blank?).map(&:to_i)
    list_attachments.where.not(list_id: list_ids).destroy_all
    list_ids.each do |list_id|
      list_attachments.find_or_create_by(list_id: list_id)
    end
  end

  private

  def check_completion
    if goal_type == 'counted'
      if current_count >= target_count && !completed
        self.completed = true
        self.completed_at = Time.current
      elsif current_count < target_count && completed
        self.completed = false
        self.completed_at = nil
      end
    else
      total = checklist_items.count
      if total > 0 && checklist_items.where(completed: true).count >= total && !completed
        self.completed = true
        self.completed_at = Time.current
      elsif total > 0 && checklist_items.where(completed: true).count < total && completed
        self.completed = false
        self.completed_at = nil
      end
    end
  end
end
