class Tag < ApplicationRecord
  belongs_to :user
  has_many :taggings, dependent: :destroy
  has_many :journals, through: :taggings, source: :taggable, source_type: 'Journal'
  has_many :habits, through: :taggings, source: :taggable, source_type: 'Habit'
  has_many :habit_contents, through: :taggings, source: :taggable, source_type: 'HabitContent'

  validates :name, presence: true, uniqueness: { scope: :user_id }
end
