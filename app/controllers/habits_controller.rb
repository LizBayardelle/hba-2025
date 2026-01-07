class HabitsController < ApplicationController
  def index
    return redirect_to new_user_session_path unless user_signed_in?

    @view_mode = params[:view] || 'category' # 'category' or 'time'
    @selected_date = params[:date] ? Date.parse(params[:date]) : Time.zone.today

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
      grouped = @habits.group_by do |h|
        case h.time_of_day
        when 'am', 'morning' then 'morning'
        when 'pm', 'afternoon' then 'afternoon'
        when 'night', 'evening' then 'evening'
        else 'anytime'
        end
      end
      # Sort by time of day order
      time_order = ['morning', 'afternoon', 'evening', 'anytime']
      @grouped_habits = grouped.sort_by { |time, _| time_order.index(time) || 999 }.to_h
    else
      @grouped_habits = @habits.group_by(&:category)
    end

    # Today's stats
    @completed_today = @habits.count { |h| (@completions[h.id] || 0) >= h.target_count }
    @total_habits = @habits.count
    @today_percentage = @total_habits > 0 ? (@completed_today * 100 / @total_habits).round : 0
  end

  def create
    @category = current_user.categories.find(params[:category_id])
    @habit = @category.habits.build(habit_params)

    if @habit.save
      redirect_to category_path(@category), notice: 'Habit created successfully.'
    else
      redirect_to category_path(@category), alert: 'Failed to create habit.'
    end
  end

  def update
    @category = current_user.categories.find(params[:category_id])
    @habit = @category.habits.find(params[:id])

    if @habit.update(habit_params)
      redirect_to category_path(@category), notice: 'Habit updated successfully.'
    else
      redirect_to category_path(@category), alert: 'Failed to update habit.'
    end
  end

  def destroy
    @category = current_user.categories.find(params[:category_id])
    @habit = @category.habits.find(params[:id])
    @habit.destroy

    redirect_to category_path(@category), notice: 'Habit deleted successfully.'
  end

  private

  def habit_params
    params.require(:habit).permit(:name, :target_count, :time_of_day, :importance, :category_id)
  end
end
