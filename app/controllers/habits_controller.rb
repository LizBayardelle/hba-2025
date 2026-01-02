class HabitsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_category, except: [:index]
  before_action :set_habit, only: [:update, :destroy]

  def index
    @view_mode = params[:view] || 'category' # 'category' or 'time'
    @selected_date = params[:date] ? Date.parse(params[:date]) : Date.today

    # Get all active habits for current user
    @habits = current_user.habits.active.includes(:category)

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

    # Calculate completion stats
    @total_habits = @habits.count
    @completed_today = @habits.count { |h|
      completion_count = @completions[h.id] || 0
      completion_count >= h.target_count
    }
  end

  def create
    @habit = @category.habits.build(habit_params)
    @habit.user = current_user

    if @habit.save
      redirect_to category_path(@category), notice: 'Habit created successfully.'
    else
      redirect_to category_path(@category), alert: "Error creating habit: #{@habit.errors.full_messages.join(', ')}"
    end
  end

  def update
    if @habit.update(habit_params)
      redirect_to category_path(@category), notice: 'Habit updated successfully.'
    else
      redirect_to category_path(@category), alert: "Error updating habit: #{@habit.errors.full_messages.join(', ')}"
    end
  end

  def destroy
    @habit.update(archived_at: Time.current)
    redirect_to category_path(@category), notice: 'Habit archived successfully.'
  end

  private

  def set_category
    @category = current_user.categories.find(params[:category_id])
  end

  def set_habit
    @habit = @category.habits.find(params[:id])
  end

  def habit_params
    params.require(:habit).permit(:name, :description, :positive, :frequency_type, :target_count, :time_of_day, :difficulty, :start_date, :reminder_enabled)
  end
end
