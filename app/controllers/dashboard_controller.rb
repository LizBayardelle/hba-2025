class DashboardController < ApplicationController
  def index
    return redirect_to new_user_session_path unless user_signed_in?

    # === Selected Date ===
    # Allow date parameter for navigation, but default to today
    if params[:date].present?
      @today = Date.parse(params[:date])
      # Don't allow future dates
      @today = Time.zone.today if @today > Time.zone.today
    else
      @today = Time.zone.today
    end

    # === Today's Habits ===
    @habits = current_user.habits.active.includes(:category, :habit_completions, :importance_level, :time_block)

    @today_completions = HabitCompletion.where(
      habit_id: @habits.pluck(:id),
      completed_at: @today
    ).group(:habit_id).sum(:count)

    # Group by time_block
    grouped = @habits.group_by { |h| h.time_block || 'anytime' }
    @today_habits = grouped.sort_by { |key, _| key == 'anytime' ? Float::INFINITY : key.rank }.to_h

    # Today's completion stats
    @completed_today = @habits.count { |h| (@today_completions[h.id] || 0) >= h.target_count }
    @total_habits = @habits.count
    @today_percentage = @total_habits > 0 ? (@completed_today * 100 / @total_habits).round : 0

    # Get importance levels and time blocks for grouping
    @importance_levels = current_user.importance_levels.order(:rank)
    @time_blocks = current_user.time_blocks.order(:rank)

    # === Today's Tasks ===
    @tasks = current_user.tasks.active.includes(:category, :importance_level)
    @tasks_due_today = @tasks.where(due_date: @today)
    @tasks_overdue = @tasks.where('due_date < ?', @today)
    @tasks_no_date = @tasks.where(due_date: nil)

    # === Quick Stats for Today ===
    # Current streak
    @current_streak = 0
    date = @today
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

    # Tasks completed today
    @tasks_completed_today = current_user.tasks.where(completed_at: @today.beginning_of_day..@today.end_of_day).count

    # === Google Calendar Events ===
    if current_user.google_sync_enabled && current_user.google_calendar_id.present?
      calendar_service = GoogleCalendarService.new(current_user)
      @calendar_events = calendar_service.events_for_date(@today)
    else
      @calendar_events = []
    end
  end
end
