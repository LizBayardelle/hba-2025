module AppApi
  module V1
    class HabitCompletionsController < BaseController
      before_action :set_habit

      def increment
        date = params[:date] ? Date.parse(params[:date]) : Time.zone.today
        completion = @habit.habit_completions.find_by(user: current_user, completed_at: date)

        if completion
          completion.increment!(:count)
        else
          completion = @habit.habit_completions.create!(
            user: current_user,
            completed_at: date,
            count: 1
          )
        end

        @habit.reload
        @habit.calculate_streak!
        @habit.update_health!

        render json: {
          count: completion.count,
          streak: @habit.streak_for_date(date),
          health: @habit.health,
          health_state: @habit.health_state
        }
      end

      def decrement
        date = params[:date] ? Date.parse(params[:date]) : Time.zone.today
        completion = @habit.habit_completions.find_by(user: current_user, completed_at: date)

        if completion
          if completion.count > 1
            completion.decrement!(:count)
          else
            completion.destroy
          end
        end

        @habit.reload
        @habit.calculate_streak!
        @habit.update_health!

        render json: {
          count: completion&.persisted? ? completion.count : 0,
          streak: @habit.streak_for_date(date),
          health: @habit.health,
          health_state: @habit.health_state
        }
      end

      private

      def set_habit
        @habit = current_user.habits.find(params[:habit_id])
      end
    end
  end
end
