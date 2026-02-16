class HabitCompletionsController < ApplicationController
  before_action :authenticate_user!

  def increment
    habit = current_user.habits.find(params[:habit_id])
    date = params[:date] ? Date.parse(params[:date]) : Time.zone.today
    completion = habit.habit_completions.find_by(user: current_user, completed_at: date)

    if completion
      completion.increment!(:count)
    else
      completion = habit.habit_completions.create!(
        user: current_user,
        completed_at: date,
        count: 1
      )
    end

    habit.reload
    habit.calculate_streak! # Update the stored streak for today
    habit.update_health!

    render json: {
      count: completion.count,
      streak: habit.streak_for_date(date),
      health: habit.health,
      health_state: habit.health_state
    }
  end

  def decrement
    habit = current_user.habits.find(params[:habit_id])
    date = params[:date] ? Date.parse(params[:date]) : Time.zone.today
    completion = habit.habit_completions.find_by(user: current_user, completed_at: date)

    if completion
      if completion.count > 1
        completion.decrement!(:count)
        habit.reload
        habit.calculate_streak!
        habit.update_health!

        render json: {
          count: completion.count,
          streak: habit.streak_for_date(date),
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
          streak: habit.streak_for_date(date),
          health: habit.health,
          health_state: habit.health_state
        }
      end
    else
      render json: {
        count: 0,
        streak: habit.streak_for_date(date),
        health: habit.health,
        health_state: habit.health_state
      }
    end
  end
end
