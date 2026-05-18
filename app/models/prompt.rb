class Prompt < ApplicationRecord
  belongs_to :user
  belongs_to :category, optional: true
  has_many :prompt_questions, -> { ordered }, dependent: :destroy
  has_many :prompt_responses, dependent: :destroy
  has_many :taggings, as: :taggable, dependent: :destroy
  has_many :tags, through: :taggings

  accepts_nested_attributes_for :prompt_questions, allow_destroy: true,
    reject_if: ->(attrs) { attrs[:text].blank? && attrs[:id].blank? }

  validates :title, presence: true

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

  def tag_names=(names)
    list = names.is_a?(String) ? names.split(',') : Array(names)
    self.tags = list.map { |n| n.to_s.strip }.reject(&:blank?).map do |name|
      user.tags.find_or_create_by(name: name)
    end
  end

  def tag_names
    tags.pluck(:name)
  end
end
