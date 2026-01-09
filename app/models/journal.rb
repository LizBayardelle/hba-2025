class Journal < ApplicationRecord
  belongs_to :user
  has_rich_text :content
  has_many :taggings, as: :taggable, dependent: :destroy
  has_many :tags, through: :taggings

  validates :user, presence: true

  scope :recent_first, -> { order(created_at: :desc) }
  scope :search_content, ->(query) { where("content ILIKE ?", "%#{query}%") if query.present? }

  # Helper method to assign tags by name
  def tag_names=(names)
    self.tags = names.map do |name|
      user.tags.find_or_create_by(name: name.strip)
    end
  end

  def tag_names
    tags.pluck(:name)
  end
end
