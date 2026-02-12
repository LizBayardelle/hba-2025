class Document < ApplicationRecord
  has_and_belongs_to_many :habits
  has_and_belongs_to_many :tasks
  has_and_belongs_to_many :categories
  has_rich_text :body
  has_many_attached :files
  has_many :taggings, as: :taggable, dependent: :destroy
  has_many :tags, through: :taggings

  CONTENT_TYPES = %w[document youtube video link].freeze

  validates :content_type, presence: true, inclusion: { in: CONTENT_TYPES }
  validates :title, presence: true

  # Validate based on content type
  validate :content_type_requirements

  scope :ordered, -> { order(:position) }
  scope :pinned_first, -> { order(pinned: :desc, created_at: :desc) }

  # Helper method to assign tags by name
  def tag_names=(names)
    # Get user from the first associated habit
    user = habits.first&.user
    return unless user

    self.tags = names.map do |name|
      user.tags.find_or_create_by(name: name.strip)
    end
  end

  def tag_names
    tags.pluck(:name)
  end

  # Extract YouTube video ID from various URL formats
  def youtube_id
    return metadata['youtube_id'] if metadata['youtube_id'].present?
    return nil unless metadata['url'].present?

    url = metadata['url']
    # Handle youtu.be/VIDEO_ID
    if url.match(/youtu\.be\/([^?&]+)/)
      $1
    # Handle youtube.com/watch?v=VIDEO_ID
    elsif url.match(/youtube\.com\/watch\?v=([^&]+)/)
      $1
    # Handle youtube.com/embed/VIDEO_ID
    elsif url.match(/youtube\.com\/embed\/([^?&]+)/)
      $1
    end
  end

  # Get embeddable YouTube URL
  def youtube_embed_url
    return nil unless youtube_id
    "https://www.youtube.com/embed/#{youtube_id}"
  end

  private

  def content_type_requirements
    case content_type
    when 'youtube', 'video', 'link'
      errors.add(:metadata, "must include url") if metadata.blank? || metadata['url'].blank?
    end
  end
end
