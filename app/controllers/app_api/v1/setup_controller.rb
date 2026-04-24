module AppApi
  module V1
    class SetupController < BaseController
      def complete
        current_user.update!(setup_completed_at: Time.current)
        render json: {
          user: {
            id: current_user.id,
            email: current_user.email,
            first_name: current_user.first_name,
            timezone: current_user.timezone,
            setup_completed_at: current_user.setup_completed_at.iso8601,
            google_calendar_connected: current_user.google_refresh_token.present?
          }
        }
      end
    end
  end
end
