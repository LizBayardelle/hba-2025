class Prompt < ApplicationRecord
  belongs_to :user
  belongs_to :category, optional: true
  has_many :prompt_responses, dependent: :destroy
  has_many :taggings, as: :taggable, dependent: :destroy
  has_many :tags, through: :taggings

  enum :question_type, {
    short_answer: 0,
    long_answer: 1,
    integer: 2,
    yes_no: 3,
    multiple_choice: 4,
    checkboxes: 5
  }

  validates :title, presence: true
  validates :question_type, presence: true
  validate :options_present_for_choice_types

  scope :active, -> { where(archived_at: nil) }
  scope :archived, -> { where.not(archived_at: nil) }
  scope :ordered, -> { order(:position, :created_at) }

  def archived?
    archived_at.present?
  end

  def archive!
    update(archived_at: Time.current)
  end

  def unarchive!
    update(archived_at: nil)
  end

  def needs_options?
    multiple_choice? || checkboxes?
  end

  def tag_names=(names)
    list = names.is_a?(String) ? names.split(',') : Array(names)
    self.tags = list.map { |n| n.to_s.strip }.reject(&:blank?).map do |name|
      user.tags.find_or_create_by(name: name)
    end
  end

  def tag_names
    tags.pluck(:name)
  end

  private

  def options_present_for_choice_types
    return unless needs_options?
    cleaned = Array(options).map { |o| o.to_s.strip }.reject(&:blank?)
    if cleaned.empty?
      errors.add(:options, "must include at least one option for #{question_type.humanize}")
    end
  end
end
