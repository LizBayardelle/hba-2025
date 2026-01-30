class ListAttachment < ApplicationRecord
  belongs_to :attachable, polymorphic: true
  belongs_to :list
  belongs_to :user

  validates :attachable_type, inclusion: { in: %w[Task Habit] }
  validates :list_id, uniqueness: { scope: [:attachable_type, :attachable_id] }
end
