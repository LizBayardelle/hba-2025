class AnalyticsController < ApplicationController
  before_action :authenticate_user!

  def index
    @habits = current_user.habits.active.includes(:category, :importance_level, :time_block)
    @all_habits = current_user.habits.includes(:category) # including archived
    habit_ids = @habits.pluck(:id)

    # ═══════════════════════════════════════════
    # 1. HERO STATS — the big numbers
    # ═══════════════════════════════════════════

    # Account age
    @days_active = (Time.zone.today - current_user.created_at.to_date).to_i

    # Total lifetime completions
    @lifetime_completions = current_user.habit_completions.sum(:count)

    # Total tasks completed
    @tasks_completed = current_user.tasks.where(completed: true).count

    # Total journal entries
    @journal_entries = current_user.journals.count

    # Goals completed
    @goals_completed = current_user.goals.where(completed: true).count
    @goals_total = current_user.goals.count

    # ═══════════════════════════════════════════
    # 2. STREAKS & HEALTH — current state
    # ═══════════════════════════════════════════

    # Current perfect-day streak (all habits done)
    @perfect_streak = 0
    date = Time.zone.today
    loop do
      break if @habits.empty?
      completions = HabitCompletion.where(habit_id: habit_ids, completed_at: date).group(:habit_id).sum(:count)
      all_done = @habits.all? { |h| (completions[h.id] || 0) >= h.target_count }
      if all_done
        @perfect_streak += 1
        date -= 1.day
      else
        break
      end
    end

    # Best ever perfect-day streak
    @best_streak = 0
    current = 0
    if @habits.any?
      oldest_completion = current_user.habit_completions.minimum(:completed_at)
      if oldest_completion
        (oldest_completion.to_date..Time.zone.today).each do |d|
          completions = HabitCompletion.where(habit_id: habit_ids, completed_at: d).group(:habit_id).sum(:count)
          if @habits.all? { |h| (completions[h.id] || 0) >= h.target_count }
            current += 1
            @best_streak = current if current > @best_streak
          else
            current = 0
          end
        end
      end
    end

    # Overall health score
    @overall_health = @habits.any? ? (@habits.sum { |h| [h.health, 100].min }.to_f / @habits.count).round : 0

    # Individual habit streaks (top 5 by streak)
    @top_streaks = @habits.map { |h|
      { name: h.name, streak: h.current_streak, color: h.category.color, health: h.health }
    }.sort_by { |h| -h[:streak] }.first(5)

    # Habits at risk (health < 40)
    @at_risk = @habits.select { |h| h.health < 40 }.map { |h|
      { name: h.name, health: h.health, color: h.category.color, last_completed: h.last_completed_at }
    }.sort_by { |h| h[:health] }

    # ═══════════════════════════════════════════
    # 3. HEATMAP — 90-day calendar
    # ═══════════════════════════════════════════

    @heatmap_data = {}
    90.downto(0) do |days_ago|
      d = Time.zone.today - days_ago.days
      completions = HabitCompletion.where(habit_id: habit_ids, completed_at: d).group(:habit_id).sum(:count)
      completed_count = @habits.count { |h| (completions[h.id] || 0) >= h.target_count }
      total = @habits.count
      @heatmap_data[d.to_s] = total > 0 ? (completed_count * 100.0 / total).round : 0
    end

    # ═══════════════════════════════════════════
    # 4. WEEKLY TREND — last 12 weeks
    # ═══════════════════════════════════════════

    @weekly_trend = []
    12.downto(0) do |weeks_ago|
      week_start = Time.zone.today.beginning_of_week - weeks_ago.weeks
      week_end = week_start.end_of_week
      week_end = Time.zone.today if week_end > Time.zone.today

      days_in_week = (week_start..week_end).count
      perfect_days = 0

      (week_start..week_end).each do |d|
        completions = HabitCompletion.where(habit_id: habit_ids, completed_at: d).group(:habit_id).sum(:count)
        all_done = @habits.all? { |h| (completions[h.id] || 0) >= h.target_count }
        perfect_days += 1 if all_done && @habits.any?
      end

      @weekly_trend << {
        label: week_start.strftime('%b %-d'),
        perfect_days: perfect_days,
        total_days: days_in_week,
        pct: days_in_week > 0 ? (perfect_days * 100.0 / days_in_week).round : 0
      }
    end

    # ═══════════════════════════════════════════
    # 5. CATEGORY BREAKDOWN
    # ═══════════════════════════════════════════

    @category_stats = current_user.categories.active.ordered.includes(:habits).map do |cat|
      cat_habits = @habits.select { |h| h.category_id == cat.id }
      next if cat_habits.empty?

      avg_health = (cat_habits.sum(&:health).to_f / cat_habits.count).round
      total_completions = current_user.habit_completions.where(habit_id: cat_habits.map(&:id)).sum(:count)

      {
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        habits_count: cat_habits.count,
        avg_health: avg_health,
        total_completions: total_completions,
        best_habit: cat_habits.max_by(&:current_streak)&.name,
        best_streak: cat_habits.max_by(&:current_streak)&.current_streak || 0,
      }
    end.compact

    # ═══════════════════════════════════════════
    # 6. ACTIVITY SUMMARY — this week
    # ═══════════════════════════════════════════

    week_start = Time.zone.today.beginning_of_week
    @this_week = {
      completions: current_user.habit_completions.where(completed_at: week_start..Time.zone.today).sum(:count),
      tasks_done: current_user.tasks.where(completed: true, completed_at: week_start.beginning_of_day..Time.zone.now).count,
      journal_entries: current_user.journals.where(created_at: week_start.beginning_of_day..Time.zone.now).count,
      notes_created: current_user.notes.where(created_at: week_start.beginning_of_day..Time.zone.now).count,
      prep_answered: current_user.prep_responses.where(response_date: week_start..Time.zone.today).count,
    }
  end
end
