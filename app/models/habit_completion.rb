class HabitCompletion < ApplicationRecord
  belongs_to :habit
  belongs_to :user

  validates :completed_at, presence: true
  validates :count, presence: true, numericality: { greater_than: 0 }
  validates :habit_id, uniqueness: { scope: :completed_at }

  after_save :update_habit_streak
  after_destroy :update_habit_streak

  private

  def update_habit_streak
    habit.calculate_streak!
  end
end
