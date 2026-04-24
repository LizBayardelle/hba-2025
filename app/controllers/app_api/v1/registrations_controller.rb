module AppApi
  module V1
    class RegistrationsController < Devise::RegistrationsController
      skip_before_action :verify_authenticity_token
      respond_to :json

      private

      def respond_with(resource, _opts = {})
        if resource.persisted?
          render json: {
            user: {
              id: resource.id,
              email: resource.email,
              first_name: resource.first_name,
              timezone: resource.timezone,
              setup_completed_at: resource.setup_completed_at&.iso8601,
              google_calendar_connected: resource.google_refresh_token.present?
            },
            message: 'Signed up successfully.'
          }, status: :created
        else
          render json: {
            errors: resource.errors.full_messages
          }, status: :unprocessable_entity
        end
      end

      def sign_up_params
        params.require(:user).permit(:email, :password, :password_confirmation, :timezone)
      end
    end
  end
end
