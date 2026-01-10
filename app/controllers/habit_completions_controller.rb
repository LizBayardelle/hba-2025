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

    # Calculate streak as of the selected date for the response (with "at risk" logic)
    streak_as_of_date = calculate_streak_with_at_risk(habit, date)

    render json: {
      count: completion.count,
      streak: streak_as_of_date,
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
        habit.calculate_streak! # Update the stored streak for today
        habit.update_health!

        # Calculate streak as of the selected date for the response (with "at risk" logic)
        streak_as_of_date = calculate_streak_with_at_risk(habit, date)

        render json: {
          count: completion.count,
          streak: streak_as_of_date,
          health: habit.health,
          health_state: habit.health_state
        }
      else
        completion.destroy
        habit.reload
        habit.calculate_streak! # Update the stored streak for today
        habit.update_health!

        # Calculate streak as of the selected date for the response (with "at risk" logic)
        streak_as_of_date = calculate_streak_with_at_risk(habit, date)

        render json: {
          count: 0,
          streak: streak_as_of_date,
          health: habit.health,
          health_state: habit.health_state
        }
      end
    else
      # Calculate streak as of the selected date for the response (with "at risk" logic)
      streak_as_of_date = calculate_streak_with_at_risk(habit, date)

      render json: {
        count: 0,
        streak: streak_as_of_date,
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

  # Calculate streak with "at risk" logic - shows yesterday's streak if today is incomplete
  def calculate_streak_with_at_risk(habit, date)
    # Calculate current streak (including selected date if completed)
    current_streak = 0
    check_date = date

    loop do
      completion = habit.habit_completions.find_by(completed_at: check_date)

      if completion && completion.count >= habit.target_count
        current_streak += 1
        check_date -= 1.day
      else
        break
      end
    end

    # If selected date is not completed, check if there's a streak from yesterday
    if current_streak == 0
      yesterday = date - 1.day
      yesterday_completion = habit.habit_completions.find_by(completed_at: yesterday)

      if yesterday_completion && yesterday_completion.count >= habit.target_count
        # Count the streak from yesterday backwards
        streak_from_yesterday = 0
        check_date = yesterday

        loop do
          completion = habit.habit_completions.find_by(completed_at: check_date)

          if completion && completion.count >= habit.target_count
            streak_from_yesterday += 1
            check_date -= 1.day
          else
            break
          end
        end

        return streak_from_yesterday
      else
        return 0
      end
    else
      return current_streak
    end
  end
end
