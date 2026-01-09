class Tagging < ApplicationRecord
  belongs_to :taggable, polymorphic: true
  belongs_to :tag

  validates :tag_id, uniqueness: { scope: [:taggable_type, :taggable_id] }
end
