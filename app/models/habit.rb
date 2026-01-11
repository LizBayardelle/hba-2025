class Habit < ApplicationRecord
  belongs_to :category
  belongs_to :user
  has_many :habit_completions, dependent: :destroy
  has_and_belongs_to_many :documents
  has_many :taggings, as: :taggable, dependent: :destroy
  has_many :tags, through: :taggings

  IMPORTANCE_LEVELS = %w[critical important normal optional].freeze

  validates :name, presence: true
  validates :frequency_type, presence: true
  validates :target_count, presence: true, numericality: { greater_than: 0 }
  validates :importance, inclusion: { in: IMPORTANCE_LEVELS }, allow_nil: true

  scope :active, -> { where(archived_at: nil) }

  # Helper method to assign tags by name
  def tag_names=(names)
    self.tags = names.map do |name|
      user.tags.find_or_create_by(name: name.strip)
    end
  end

  def tag_names
    tags.pluck(:name)
  end

  def completions_for_date(date)
    completion = habit_completions.find_by(completed_at: date)
    completion ? completion.count : 0
  end

  def calculate_streak!(as_of_date = nil)
    streak = 0
    date = as_of_date || Time.zone.today

    # Count backwards from the specified date while the target is met each day
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

    # Only update the column if calculating for today
    if as_of_date.nil? || as_of_date == Time.zone.today
      update_column(:current_streak, streak)
    end

    streak
  end

  def target_met_today?
    completion = habit_completions.find_by(completed_at: Time.zone.today)
    completion && completion.count >= target_count
  end

  def update_health!
    # Check if we need to update health based on missed days
    today = Time.zone.today

    # Check if target was met yesterday
    yesterday = today - 1.day
    yesterday_completion = habit_completions.find_by(completed_at: yesterday)
    yesterday_met = yesterday_completion && yesterday_completion.count >= target_count

    # If yesterday wasn't met, apply health penalty
    unless yesterday_met
      apply_health_penalty(yesterday)
    else
      # If yesterday was met, reset consecutive misses and build health
      if consecutive_misses > 0
        update_columns(consecutive_misses: 0, last_missed_date: nil)
      end
      # Build health for completing
      build_health
    end

    # Reset weekly miss counter on Monday
    if today.wday == 1 # Monday
      update_column(:misses_this_week, 0)
    end

    # Update last health check timestamp
    update_column(:last_health_check_at, Time.current)

    health
  end

  def apply_health_penalty(missed_date)
    # Skip if we already processed this missed date
    return if last_missed_date == missed_date

    # Determine penalty based on miss pattern
    penalty = calculate_penalty(missed_date)

    # Apply penalty
    new_health = [health - penalty, 0].max
    new_consecutive = was_yesterday_missed? ? consecutive_misses + 1 : 1
    new_weekly_misses = misses_this_week + 1

    update_columns(
      health: new_health,
      last_missed_date: missed_date,
      consecutive_misses: new_consecutive,
      misses_this_week: new_weekly_misses
    )
  end

  def calculate_penalty(missed_date)
    # Single miss: -10% health
    # 2nd miss in same week (not consecutive): -20% health
    # 2 days missed in a row: -10% then -30% (total -40%)
    # 3 days missed in a row: -10%, -30%, -40% (total -80%)
    # 4+ days missed in a row: Drops to 0%

    if was_yesterday_missed?
      # Consecutive miss
      case consecutive_misses + 1
      when 2 then 30  # Second consecutive day
      when 3 then 40  # Third consecutive day
      else 100        # Fourth+ consecutive day - zero it out
      end
    elsif misses_this_week >= 1
      # Second miss in the week but not consecutive
      20
    else
      # First miss
      10
    end
  end

  def was_yesterday_missed?
    return false unless last_missed_date
    yesterday = Time.zone.today - 1.day
    last_missed_date == yesterday
  end

  def build_health
    # Each consecutive day completed: +10-15% health (caps at 100%)
    return if health >= 100

    new_health = [health + 12, 100].min
    update_column(:health, new_health)
  end

  def health_state
    case health
    when 80..100 then { state: 'thriving', color: '#7CB342', label: 'Thriving' }
    when 50..79 then { state: 'steady', color: '#22D3EE', label: 'Steady' }
    when 25..49 then { state: 'struggling', color: '#E5C730', label: 'Struggling' }
    else { state: 'critical', color: '#F8796D', label: 'Critical' }
    end
  end
end
