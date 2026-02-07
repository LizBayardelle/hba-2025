class Habit < ApplicationRecord
  SCHEDULE_MODES = %w[flexible specific_days interval].freeze

  belongs_to :category
  belongs_to :user
  belongs_to :importance_level, optional: true
  belongs_to :time_block, optional: true
  has_many :habit_completions, dependent: :destroy
  has_and_belongs_to_many :documents
  has_many :taggings, as: :taggable, dependent: :destroy
  has_many :tags, through: :taggings
  has_many :checklist_items, as: :checklistable, dependent: :destroy
  has_many :list_attachments, as: :attachable, dependent: :destroy
  has_many :attached_lists, through: :list_attachments, source: :list

  validates :name, presence: true
  validates :frequency_type, presence: true
  validates :target_count, presence: true, numericality: { greater_than: 0 }
  validates :schedule_mode, inclusion: { in: SCHEDULE_MODES }
  validate :validate_schedule_config

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

  # Schedule mode helpers
  def due_on?(date)
    case schedule_mode
    when 'flexible'
      true # Always shows, target is per-period
    when 'specific_days'
      (schedule_config['days_of_week'] || []).include?(date.wday)
    when 'interval'
      anchor = Date.parse(schedule_config['anchor_date']) rescue (start_date || created_at.to_date)
      interval = schedule_config['interval_days'] || 1
      unit = schedule_config['interval_unit'] || 'days'

      case unit
      when 'weeks'
        # Match same day of week as anchor, on correct week intervals
        return false unless date.wday == anchor.wday
        weeks_diff = ((date - anchor).to_i / 7.0).round
        (weeks_diff % interval).zero?
      when 'months'
        # Match same day of month as anchor, on correct month intervals
        anchor_day = anchor.day
        # Handle edge cases (31st of month, etc.)
        target_day = [anchor_day, date.end_of_month.day].min
        return false unless date.day == target_day

        months_diff = (date.year * 12 + date.month) - (anchor.year * 12 + anchor.month)
        (months_diff % interval).zero?
      else
        # Days interval
        ((date - anchor).to_i % interval).zero?
      end
    else
      true
    end
  end

  def due_today?
    due_on?(Time.zone.today)
  end

  def schedule_description
    case schedule_mode
    when 'flexible'
      "#{target_count}x/#{frequency_type}"
    when 'specific_days'
      days = schedule_config['days_of_week'] || []
      return 'Weekdays' if days.sort == [1, 2, 3, 4, 5]
      return 'Weekends' if days.sort == [0, 6]
      return 'MWF' if days.sort == [1, 3, 5]
      return 'T/Th' if days.sort == [2, 4]
      days.map { |d| Date::ABBR_DAYNAMES[d] }.join('/')
    when 'interval'
      n = schedule_config['interval_days'] || 1
      unit = schedule_config['interval_unit'] || 'days'
      case unit
      when 'weeks'
        n == 1 ? 'Weekly' : n == 2 ? 'Biweekly' : "Every #{n} weeks"
      when 'months'
        n == 1 ? 'Monthly' : "Every #{n} months"
      else
        n == 1 ? 'Daily' : n == 2 ? 'Every other day' : "Every #{n} days"
      end
    end
  end

  def scheduled?
    schedule_mode != 'flexible'
  end

  # Helper method to assign documents by ID
  def habit_content_ids=(ids)
    self.document_ids = ids.reject(&:blank?)
  end

  def completions_for_date(date)
    completion = habit_completions.find_by(completed_at: date)
    completion ? completion.count : 0
  end

  def calculate_streak!(as_of_date = nil)
    streak = 0
    date = as_of_date || Time.zone.today

    # For specific_days and interval modes, we count consecutive due dates completed
    # For flexible mode, we count consecutive days target met
    if schedule_mode == 'flexible'
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
    else
      # For specific_days and interval modes, skip non-due dates
      max_lookback = 365 # Prevent infinite loops
      lookback_count = 0

      loop do
        break if lookback_count > max_lookback

        if due_on?(date)
          completion = habit_completions.find_by(completed_at: date)

          if completion && completion.count >= 1 # For scheduled habits, completing once counts
            streak += 1
          else
            break
          end
        end

        date -= 1.day
        lookback_count += 1
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
    yesterday = today - 1.day

    # For flexible mode with non-daily frequency, check period end
    if schedule_mode == 'flexible' && frequency_type != 'day'
      # Weekly: check on Monday for last week
      # Monthly: check on 1st for last month
      case frequency_type
      when 'week'
        if today.wday == 1 # Monday - check last week
          week_start = yesterday.beginning_of_week
          week_end = yesterday.end_of_week
          period_completions = habit_completions.where(completed_at: week_start..week_end).sum(:count)
          if period_completions < target_count
            apply_health_penalty(yesterday)
          else
            build_health if consecutive_misses > 0
            update_columns(consecutive_misses: 0, last_missed_date: nil) if consecutive_misses > 0
          end
        end
      when 'month'
        if today.day == 1 # First of month - check last month
          month_start = yesterday.beginning_of_month
          month_end = yesterday.end_of_month
          period_completions = habit_completions.where(completed_at: month_start..month_end).sum(:count)
          if period_completions < target_count
            apply_health_penalty(yesterday)
          else
            build_health if consecutive_misses > 0
            update_columns(consecutive_misses: 0, last_missed_date: nil) if consecutive_misses > 0
          end
        end
      end
    else
      # For daily flexible mode, specific_days, and interval modes
      # Only apply penalty if yesterday was a due date
      yesterday_was_due = due_on?(yesterday)

      if yesterday_was_due
        yesterday_completion = habit_completions.find_by(completed_at: yesterday)
        required_count = schedule_mode == 'flexible' ? target_count : 1
        yesterday_met = yesterday_completion && yesterday_completion.count >= required_count

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
      end
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

  private

  def validate_schedule_config
    case schedule_mode
    when 'specific_days'
      days = schedule_config['days_of_week']
      if days.present?
        unless days.is_a?(Array) && days.all? { |d| d.is_a?(Integer) && d.between?(0, 6) }
          errors.add(:schedule_config, 'days_of_week must be an array of integers 0-6')
        end
      end
    when 'interval'
      interval = schedule_config['interval_days']
      if interval.present? && (!interval.is_a?(Integer) || interval < 1)
        errors.add(:schedule_config, 'interval_days must be a positive integer')
      end
      unit = schedule_config['interval_unit']
      if unit.present? && !%w[days weeks months].include?(unit)
        errors.add(:schedule_config, 'interval_unit must be days, weeks, or months')
      end
    end
  end
end
