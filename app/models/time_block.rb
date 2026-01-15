class TimeBlock < ApplicationRecord
  belongs_to :user
  has_many :habits, dependent: :nullify

  validates :name, presence: true
  validates :rank, presence: true, uniqueness: { scope: :user_id }
  validates :user_id, presence: true

  scope :ordered, -> { order(:rank) }
end
