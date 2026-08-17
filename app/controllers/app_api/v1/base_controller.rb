module AppApi
  module V1
    class BaseController < ActionController::API
      before_action :authenticate_user!
      before_action :set_timezone
      before_action :clear_daily_habits
      before_action :update_habit_health

      private

      def set_timezone
        Time.zone = current_user.timezone if current_user&.timezone.present?
      end

      def clear_daily_habits
        current_user&.clear_daily_habits_if_needed!
      end

      def update_habit_health
        current_user&.habits&.active
          &.where("last_health_check_at < ? OR last_health_check_at IS NULL", Time.zone.today.beginning_of_day)
          &.find_each do |habit|
            habit.calculate_streak!
            habit.update_health!
          end
      end

      # Accepts either a positional payload — render_success({ id: 1 }) — or bare
      # keywords, as in render_success(message: 'Deleted.'). Without **extra the
      # keyword form raises ArgumentError, since :status makes Ruby parse a
      # trailing symbol-keyed hash as keywords rather than the positional arg.
      def render_success(data = {}, status: :ok, **extra)
        render json: data.merge(extra), status: status
      end

      def render_error(message, status: :unprocessable_entity)
        render json: { error: message }, status: status
      end

      def render_errors(errors, status: :unprocessable_entity)
        render json: { errors: errors }, status: status
      end
    end
  end
end
