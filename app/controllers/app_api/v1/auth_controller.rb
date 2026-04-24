module AppApi
  module V1
    class AuthController < BaseController
      def me
        render json: { user: user_json(current_user) }
      end

      private

      def user_json(user)
        {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          timezone: user.timezone,
          setup_completed_at: user.setup_completed_at&.iso8601,
          google_calendar_connected: user.google_refresh_token.present?
        }
      end
    end
  end
end
