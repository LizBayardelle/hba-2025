class HabitsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_category
  before_action :set_habit, only: [:update, :destroy]

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
