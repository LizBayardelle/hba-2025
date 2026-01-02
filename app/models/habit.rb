class Habit < ApplicationRecord
  belongs_to :category
  belongs_to :user
  has_many :habit_completions, dependent: :destroy

  validates :name, presence: true
  validates :frequency_type, presence: true
  validates :target_count, presence: true, numericality: { greater_than: 0 }

  def calculate_streak!
    streak = 0
    date = Date.today

    # Count backwards from today while the target is met each day
    loop do
      completion = habit_completions.find_by(completed_at: date)

      # Check if target was met for this date
      if completion && completion.count >= target_count
        streak += 1
        date -= 1.day
      else
        break
      end
    end

    # Update the current streak
    update_column(:current_streak, streak)
    streak
  end

  def target_met_today?
    completion = habit_completions.find_by(completed_at: Date.today)
    completion && completion.count >= target_count
  end
end
