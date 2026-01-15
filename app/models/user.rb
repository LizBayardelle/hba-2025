class User < ApplicationRecord
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  has_many :categories, dependent: :destroy
  has_many :habits, dependent: :destroy
  has_many :habit_completions, dependent: :destroy
  has_many :journals, dependent: :destroy
  has_many :tasks, dependent: :destroy
  has_many :tags, dependent: :destroy
  has_many :importance_levels, dependent: :destroy
  has_many :time_blocks, dependent: :destroy

  after_create :create_default_time_blocks

  def clear_daily_habits_if_needed!
    # Only clear if we haven't cleared today yet
    return if last_cleared_at && last_cleared_at >= Time.zone.today.beginning_of_day

    # Find all daily habits
    daily_habits = habits.where(frequency_type: 'daily')

    # Clear completions for daily habits from yesterday and before
    # (keep today's completions)
    habit_completions
      .where(habit_id: daily_habits.pluck(:id))
      .where('completed_at < ?', Time.zone.today.beginning_of_day)
      .delete_all

    # Update the last cleared timestamp
    update_column(:last_cleared_at, Time.current)
  end

  private

  def create_default_time_blocks
    time_blocks.create!([
      { name: 'Morning', rank: 1, icon: 'fa-solid fa-sun', color: '#FFA07A' },
      { name: 'Afternoon', rank: 2, icon: 'fa-solid fa-cloud-sun', color: '#E5C730' },
      { name: 'Evening', rank: 3, icon: 'fa-solid fa-moon', color: '#6366F1' }
    ])
  end
end
