class SettingsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_importance_level, only: [:show_importance_level, :update_importance_level, :destroy_importance_level]

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

  # Importance Levels actions
  def importance_levels
    @importance_levels = current_user.importance_levels.ordered
    render json: @importance_levels
  end

  def show_importance_level
    render json: @importance_level
  end

  def create_importance_level
    @importance_level = current_user.importance_levels.build(importance_level_params)

    if @importance_level.save
      render json: @importance_level, status: :created
    else
      render json: { errors: @importance_level.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update_importance_level
    if @importance_level.update(importance_level_params)
      render json: @importance_level
    else
      render json: { errors: @importance_level.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy_importance_level
    if @importance_level.destroy
      render json: { message: 'Importance level deleted successfully' }
    else
      render json: { errors: @importance_level.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def set_importance_level
    @importance_level = current_user.importance_levels.find(params[:id])
  end

  def importance_level_params
    params.require(:importance_level).permit(:name, :rank, :icon, :color)
  end

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
