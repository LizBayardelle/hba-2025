class AnalyticsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_category, except: [:index]
  before_action :set_habit, only: [:update, :destroy]

  def index
    @view_mode = params[:view] || 'category' # 'category', 'time', or 'importance'
    @selected_date = params[:date] ? Date.parse(params[:date]) : Time.zone.today

    # Get all active habits for current user
    @habits = current_user.habits.active.includes(:category)

    # Update health for any habits that haven't been checked today
    @habits.each do |habit|
      if habit.last_health_check_at.nil? || habit.last_health_check_at.to_date < Time.zone.today
        habit.calculate_streak!
        habit.update_health!
      end
    end

    # Get today's completions
    @completions = HabitCompletion.where(
      habit_id: @habits.pluck(:id),
      completed_at: @selected_date
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
          completed_at: date
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
    elsif @view_mode == 'importance'
      grouped = @habits.group_by { |h| h.importance || 'normal' }
      # Sort by importance order
      importance_order = ['critical', 'important', 'normal', 'optional']
      @grouped_habits = grouped.sort_by { |importance, _| importance_order.index(importance) || 999 }.to_h
    else
      @grouped_habits = @habits.group_by(&:category)
    end

    # Calculate completion stats
    @total_habits = @habits.count
    @completed_today = @habits.count { |h|
      completion_count = @completions[h.id] || 0
      completion_count >= h.target_count
    }

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
    if @habits.count > 0
      total_health = @habits.sum { |h| [h.health, 100].min }
      @overall_health = (total_health.to_f / @habits.count).round
    else
      @overall_health = 0
    end

    # Habits at risk (health < 50)
    @habits_at_risk = @habits.count { |h| h.health < 50 }
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
    params.require(:habit).permit(:name, :description, :positive, :frequency_type, :target_count, :time_of_day, :difficulty, :start_date, :reminder_enabled, :importance)
  end
end
