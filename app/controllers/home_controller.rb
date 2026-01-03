class HomeController < ApplicationController
  def index
    return redirect_to new_user_session_path unless user_signed_in?

    @view_mode = params[:view] || 'category' # 'category' or 'time'
    @selected_date = params[:date] ? Date.parse(params[:date]) : Date.today

    @habits = current_user.habits.active.includes(:category, :habit_completions)

    # Get today's completions
    @completions = HabitCompletion.where(
      habit_id: @habits.pluck(:id),
      completed_at: @selected_date.beginning_of_day..@selected_date.end_of_day
    ).group(:habit_id).sum(:count)

    # Calculate streaks as of the selected date
    @streaks = {}
    @habits.each do |habit|
      streak = 0
      date = @selected_date

      # Count backwards from selected date while the target is met each day
      loop do
        completion = HabitCompletion.find_by(
          habit_id: habit.id,
          completed_at: date.beginning_of_day..date.end_of_day
        )

        if completion && completion.count >= habit.target_count
          streak += 1
          date -= 1.day
        else
          break
        end
      end

      @streaks[habit.id] = streak
    end

    # Group habits based on view mode
    if @view_mode == 'time'
      @grouped_habits = @habits.group_by { |h| h.time_of_day || 'anytime' }
    else
      @grouped_habits = @habits.group_by(&:category)
    end

    # Today's stats
    @completed_today = @habits.count { |h| (@completions[h.id] || 0) >= h.target_count }
    @total_habits = @habits.count
    @today_percentage = @total_habits > 0 ? (@completed_today * 100 / @total_habits).round : 0
  end
end
