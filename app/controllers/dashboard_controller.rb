class DashboardController < ApplicationController
  def index
    return redirect_to new_user_session_path unless user_signed_in?

    @habits = current_user.habits.active.includes(:category, :habit_completions, :importance_level)

    # === Calendar Heatmap Data (last 90 days) ===
    @heatmap_data = {}
    @category_heatmap_data = {}

    # Get all categories
    categories = current_user.categories.includes(:habits)

    90.downto(0) do |days_ago|
      date = Time.zone.today - days_ago.days

      completions = HabitCompletion.where(
        habit_id: @habits.pluck(:id),
        completed_at: date
      ).group(:habit_id).sum(:count)

      # Overall heatmap
      completed_count = @habits.count { |h| (completions[h.id] || 0) >= h.target_count }
      total_count = @habits.count
      percentage = total_count > 0 ? (completed_count * 100 / total_count) : 0
      @heatmap_data[date.to_s] = percentage

      # Per-category heatmap
      categories.each do |category|
        category_habits = @habits.select { |h| h.category_id == category.id }
        next if category_habits.empty?

        @category_heatmap_data[category.id] ||= {}

        completed_in_category = category_habits.count { |h| (completions[h.id] || 0) >= h.target_count }
        category_total = category_habits.count
        category_percentage = category_total > 0 ? (completed_in_category * 100 / category_total) : 0

        @category_heatmap_data[category.id][date.to_s] = category_percentage
      end
    end

    @categories = categories.select { |c| @category_heatmap_data[c.id].present? }

    # === Quick Stats ===
    # Current streak (consecutive days of 100% completion)
    @current_streak = 0
    date = Time.zone.today
    loop do
      completions = HabitCompletion.where(
        habit_id: @habits.pluck(:id),
        completed_at: date
      ).group(:habit_id).sum(:count)

      completed_count = @habits.count { |h| (completions[h.id] || 0) >= h.target_count }

      if completed_count == @habits.count && @habits.count > 0
        @current_streak += 1
        date -= 1.day
      else
        break
      end
    end

    # Total habits completed this week
    week_start = Time.zone.today.beginning_of_week
    week_completions = HabitCompletion.where(
      habit_id: @habits.pluck(:id),
      completed_at: week_start..Time.zone.today
    )
    @weekly_completions = week_completions.sum(:count)

    # Overall health score (average of all habits)
    # Each habit's health should be capped at 100, then averaged
    if @habits.count > 0
      total_health = @habits.sum { |h| [h.health, 100].min }
      @overall_health = (total_health.to_f / @habits.count).round
    else
      @overall_health = 0
    end

    # Habits at risk (health < 50)
    @habits_at_risk = @habits.count { |h| h.health < 50 }

    # === Today's Focus ===
    @today = Time.zone.today
    @today_completions = HabitCompletion.where(
      habit_id: @habits.pluck(:id),
      completed_at: @today
    ).group(:habit_id).sum(:count)

    # Group by time of day
    grouped = @habits.group_by do |h|
      case h.time_of_day
      when 'am', 'morning' then 'morning'
      when 'pm', 'afternoon' then 'afternoon'
      when 'night', 'evening' then 'evening'
      else 'anytime'
      end
    end

    time_order = ['morning', 'afternoon', 'evening', 'anytime']
    @today_habits = grouped.sort_by { |time, _| time_order.index(time) || 999 }.to_h

    # Today's completion stats
    @completed_today = @habits.count { |h| (@today_completions[h.id] || 0) >= h.target_count }
    @total_habits = @habits.count
    @today_percentage = @total_habits > 0 ? (@completed_today * 100 / @total_habits).round : 0

    # Get importance levels for priority grouping
    @importance_levels = current_user.importance_levels.order(:rank)
  end
end
