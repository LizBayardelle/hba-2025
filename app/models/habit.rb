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

  # Single source of truth for streak display on any date.
  # Returns the "at risk" streak (previous due date's streak) when the given date is incomplete.
  def streak_for_date(date)
    current_streak = calculate_streak!(date)
    return current_streak if current_streak > 0

    # If 0, look back to find an "at risk" streak from the previous due date
    if schedule_mode == 'flexible'
      calculate_streak!(date - 1.day)
    else
      check_date = date - 1.day
      365.times do
        if due_on?(check_date)
          return calculate_streak!(check_date)
        end
        check_date -= 1.day
      end
      0
    end
  end

  def target_met_today?
    completion = habit_completions.find_by(completed_at: Time.zone.today)
    completion && completion.count >= target_count
  end

  # First day this habit could be expected. Health is never penalised for
  # days before this — a habit created today has not missed anything yet.
  def started_on
    start_date || created_at&.to_date || Time.zone.today
  end

  # Every missed due day costs a flat 10 points; every completed one earns 12
  # back, capped at 100. A habit only ever loses health for days it existed
  # for, and every un-judged day since the last check is evaluated — so the
  # decay is the same whether the app is opened daily or once a fortnight.
  HEALTH_PENALTY_PER_MISS = 10
  HEALTH_GAIN_PER_COMPLETION = 12
  MAX_HEALTH_BACKFILL_DAYS = 365

  # Health is recomputed from completion history rather than accumulated, so
  # it is idempotent: calling this repeatedly always lands on the same number.
  # That is what lets today count the moment it is completed — today earns its
  # +12 immediately, but is never counted as a miss until the day is over.
  def update_health!
    return health if user.tracking_paused

    today = Time.zone.today
    value = if schedule_mode == 'flexible' && frequency_type != 'day'
      health_from_periods(today)
    else
      health_from_days(today)
    end

    update_columns(health: value, last_health_check_at: Time.current)
    health
  end

  # Day-by-day modes: daily flexible, specific_days, interval.
  def health_from_days(today)
    required = schedule_mode == 'flexible' ? target_count : 1
    window_start = health_window_start(today)
    counts = completion_counts_between(window_start, today)

    value = 100
    all_misses = []
    streak_of_misses = 0

    (window_start..today).each do |date|
      next unless due_on?(date)

      if (counts[date] || 0) >= required
        value = [value + HEALTH_GAIN_PER_COMPLETION, 100].min
        streak_of_misses = 0
      elsif date < today
        # Today is not a miss until it is over
        value = [value - HEALTH_PENALTY_PER_MISS, 0].max
        all_misses << date
        streak_of_misses += 1
      end
    end

    sync_miss_counters(all_misses, streak_of_misses, today)
    value
  end

  # Flexible weekly/monthly: judged per whole period, current period counts
  # as soon as its target is hit.
  def health_from_periods(today)
    weekly = frequency_type == 'week'
    cursor = health_window_start(today)
    cursor = weekly ? cursor.beginning_of_week : cursor.beginning_of_month
    current_period_start = weekly ? today.beginning_of_week : today.beginning_of_month

    value = 100
    all_misses = []
    streak_of_misses = 0
    guard = 0

    while cursor <= current_period_start && guard < 400
      guard += 1
      period_end = weekly ? cursor.end_of_week : cursor.end_of_month

      # Only judge a period the habit existed through in full
      if cursor >= started_on
        completed = habit_completions.where(completed_at: cursor..period_end).sum(:count)
        if completed >= target_count
          value = [value + HEALTH_GAIN_PER_COMPLETION, 100].min
          streak_of_misses = 0
        elsif cursor < current_period_start
          # The period in progress is not a miss until it closes
          value = [value - HEALTH_PENALTY_PER_MISS, 0].max
          all_misses << period_end
          streak_of_misses += 1
        end
      end

      cursor = weekly ? cursor + 1.week : cursor.next_month
    end

    sync_miss_counters(all_misses, streak_of_misses, today)
    value
  end

  # Bound the walk so a long-lived habit can't scan unbounded history.
  # Health saturates well inside this window, so the result is unaffected.
  def health_window_start(today)
    [started_on, today - MAX_HEALTH_BACKFILL_DAYS].max
  end

  def completion_counts_between(from, to)
    habit_completions.where(completed_at: from..to).pluck(:completed_at, :count).to_h
  end

  # These columns are informational only — health no longer derives from them.
  def sync_miss_counters(all_misses, streak_of_misses, today)
    week_start = today.beginning_of_week
    update_columns(
      consecutive_misses: streak_of_misses,
      last_missed_date: all_misses.last,
      misses_this_week: all_misses.count { |d| d >= week_start }
    )
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
