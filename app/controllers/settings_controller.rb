class SettingsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_importance_level, only: [:show_importance_level, :update_importance_level, :destroy_importance_level]
  before_action :set_time_block, only: [:show_time_block, :update_time_block, :destroy_time_block]

  def index
  end

  def update
    update_params = settings_params.to_h

    # Handle dashboard_layout separately since it's an array of hashes
    if params[:user][:dashboard_layout].present?
      update_params[:dashboard_layout] = params[:user][:dashboard_layout].map do |item|
        {
          'block' => item['block'],
          'column' => item['column'],
          'position' => item['position'].to_i,
          'visible' => item['visible']
        }
      end
    end

    if current_user.update(update_params)
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
    # For Optional level, only allow editing color and icon (not name)
    update_params = if @importance_level.optional?
      importance_level_params.except(:name)
    else
      importance_level_params
    end

    if @importance_level.update(update_params)
      render json: @importance_level
    else
      render json: { errors: @importance_level.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy_importance_level
    # Prevent deletion of Optional level (also handled in model, but double-check here)
    if @importance_level.optional?
      render json: { errors: ['Cannot delete the Optional importance level'] }, status: :unprocessable_entity
      return
    end

    if @importance_level.destroy
      render json: { message: 'Importance level deleted successfully' }
    else
      render json: { errors: @importance_level.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # Time Blocks actions
  def time_blocks
    @time_blocks = current_user.time_blocks.ordered
    render json: @time_blocks
  end

  def show_time_block
    render json: @time_block
  end

  def create_time_block
    @time_block = current_user.time_blocks.build(time_block_params)

    if @time_block.save
      render json: @time_block, status: :created
    else
      render json: { errors: @time_block.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update_time_block
    if @time_block.update(time_block_params)
      render json: @time_block
    else
      render json: { errors: @time_block.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy_time_block
    if @time_block.destroy
      render json: { message: 'Time block deleted successfully' }
    else
      render json: { errors: @time_block.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def set_importance_level
    @importance_level = current_user.importance_levels.find(params[:id])
  end

  def set_time_block
    @time_block = current_user.time_blocks.find(params[:id])
  end

  def importance_level_params
    params.require(:importance_level).permit(:name, :rank, :icon, :color)
  end

  def time_block_params
    params.require(:time_block).permit(:name, :rank, :icon, :color)
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
      :root_location,
      :default_habits_grouping,
      :default_tasks_grouping,
      :default_lists_grouping,
      :default_documents_grouping
    )
  end
end
