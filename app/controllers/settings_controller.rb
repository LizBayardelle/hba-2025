class SettingsController < ApplicationController
  before_action :authenticate_user!

  def index
  end

  def update
    if current_user.update(settings_params)
      respond_to do |format|
        format.html { redirect_to settings_path, notice: 'Settings updated successfully.' }
        format.json { render json: { success: true, message: 'Settings updated successfully.' } }
      end
    else
      respond_to do |format|
        format.html { redirect_to settings_path, alert: 'Error updating settings: ' + current_user.errors.full_messages.join(', ') }
        format.json { render json: { success: false, message: current_user.errors.full_messages.join(', ') }, status: :unprocessable_entity }
      end
    end
  end

  private

  def settings_params
    params.require(:user).permit(
      :timezone,
      :week_starts_on,
      :date_format,
      :time_format,
      :email_reminders,
      :push_notifications,
      :theme,
      :default_view,
      :root_location
    )
  end
end
