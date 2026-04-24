module AppApi
  module V1
    class SessionsController < Devise::SessionsController
      skip_before_action :verify_authenticity_token
      respond_to :json

      private

      def respond_with(resource, _opts = {})
        render json: {
          user: {
            id: resource.id,
            email: resource.email,
            first_name: resource.first_name,
            timezone: resource.timezone,
            setup_completed_at: resource.setup_completed_at&.iso8601,
            google_calendar_connected: resource.google_refresh_token.present?
          },
          message: 'Signed in successfully.'
        }, status: :ok
      end

      def respond_to_on_destroy
        if current_user
          render json: { message: 'Signed out successfully.' }, status: :ok
        else
          render json: { message: 'No active session.' }, status: :unauthorized
        end
      end
    end
  end
end
