class Note < ApplicationRecord
  belongs_to :user
  belongs_to :category, optional: true
  has_many :taggings, as: :taggable, dependent: :destroy
  has_many :tags, through: :taggings

  scope :active, -> { where(archived_at: nil) }
  scope :pinned, -> { where(pinned: true) }
  scope :recent_first, -> { order(created_at: :desc) }

  def tag_names=(names)
    self.tags = names.map do |name|
      user.tags.find_or_create_by(name: name.strip)
    end
  end

  def tag_names
    tags.pluck(:name)
  end
end
