class HabitCompletionsController < ApplicationController
  before_action :authenticate_user!

  def increment
    habit = current_user.habits.find(params[:habit_id])
    completion = habit.habit_completions.find_by(user: current_user, completed_at: Date.today)

    if completion
      completion.increment!(:count)
    else
      completion = habit.habit_completions.create!(
        user: current_user,
        completed_at: Date.today,
        count: 1
      )
    end

    habit.reload
    render json: { count: completion.count, streak: habit.current_streak }
  end

  def decrement
    habit = current_user.habits.find(params[:habit_id])
    completion = habit.habit_completions.find_by(user: current_user, completed_at: Date.today)

    if completion
      if completion.count > 1
        completion.decrement!(:count)
        habit.reload
        render json: { count: completion.count, streak: habit.current_streak }
      else
        completion.destroy
        habit.reload
        render json: { count: 0, streak: habit.current_streak }
      end
    else
      render json: { count: 0, streak: habit.current_streak }
    end
  end

  private

  def find_or_create_completion(habit, date)
    habit.habit_completions.find_or_create_by!(
      user: current_user,
      completed_at: date
    )
  end
end
