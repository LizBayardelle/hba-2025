class HabitCompletionsController < ApplicationController
  before_action :authenticate_user!

  def increment
    habit = current_user.habits.find(params[:habit_id])
    completion = habit.habit_completions.find_by(user: current_user, completed_at: Time.zone.today)

    if completion
      completion.increment!(:count)
    else
      completion = habit.habit_completions.create!(
        user: current_user,
        completed_at: Time.zone.today,
        count: 1
      )
    end

    habit.reload
    habit.calculate_streak!
    habit.update_health!

    render json: {
      count: completion.count,
      streak: habit.current_streak,
      health: habit.health,
      health_state: habit.health_state
    }
  end

  def decrement
    habit = current_user.habits.find(params[:habit_id])
    completion = habit.habit_completions.find_by(user: current_user, completed_at: Time.zone.today)

    if completion
      if completion.count > 1
        completion.decrement!(:count)
        habit.reload
        habit.calculate_streak!
        habit.update_health!
        render json: {
          count: completion.count,
          streak: habit.current_streak,
          health: habit.health,
          health_state: habit.health_state
        }
      else
        completion.destroy
        habit.reload
        habit.calculate_streak!
        habit.update_health!
        render json: {
          count: 0,
          streak: habit.current_streak,
          health: habit.health,
          health_state: habit.health_state
        }
      end
    else
      render json: {
        count: 0,
        streak: habit.current_streak,
        health: habit.health,
        health_state: habit.health_state
      }
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
