class HabitContentsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_habit_content, only: [:show, :edit, :update, :destroy, :attach_habit, :detach_habit]

  def index
    # Redirect to documents page if accessed directly
    redirect_to documents_path
  end

  def show
    # For modal display
    respond_to do |format|
      format.html { render layout: false }
      format.json { render json: @habit_content }
    end
  end

  def new
    @habit_content = @habit.habit_contents.build
  end

  def create
    @habit_content = HabitContent.new(habit_content_params.except(:habit_ids))

    # Attach selected habits if any
    habit_ids = params[:habit_content][:habit_ids].reject(&:blank?) if params[:habit_content][:habit_ids]

    if @habit_content.save
      @habit_content.habit_ids = habit_ids if habit_ids.present?

      if request.format.json? || request.content_type == 'application/json'
        render json: { success: true, message: 'Content added successfully.', content: @habit_content }, status: :created
      else
        redirect_back fallback_location: documents_path, notice: 'Content added successfully.'
      end
    else
      if request.format.json? || request.content_type == 'application/json'
        render json: { success: false, errors: @habit_content.errors.full_messages }, status: :unprocessable_entity
      else
        render :new, status: :unprocessable_entity
      end
    end
  end

  def edit
  end

  def update
    # Handle habit associations separately
    habit_ids = params[:habit_content][:habit_ids].reject(&:blank?) if params[:habit_content][:habit_ids]

    if @habit_content.update(habit_content_params.except(:habit_ids))
      @habit_content.habit_ids = habit_ids if habit_ids

      if request.format.json? || request.content_type == 'application/json'
        render json: { success: true, message: 'Content updated successfully.', content: @habit_content }, status: :ok
      else
        redirect_back fallback_location: documents_path, notice: 'Content updated successfully.'
      end
    else
      if request.format.json? || request.content_type == 'application/json'
        render json: { success: false, errors: @habit_content.errors.full_messages }, status: :unprocessable_entity
      else
        render :edit, status: :unprocessable_entity
      end
    end
  end

  def attach_habit
    habit = current_user.habits.find(params[:habit_id])
    @habit_content.habits << habit unless @habit_content.habits.include?(habit)

    respond_to do |format|
      format.json { render json: { success: true, message: 'Habit attached successfully.' }, status: :ok }
    end
  end

  def detach_habit
    habit = current_user.habits.find(params[:habit_id])
    @habit_content.habits.delete(habit)

    respond_to do |format|
      format.json { render json: { success: true, message: 'Habit detached successfully.' }, status: :ok }
    end
  end

  def destroy
    @habit_content.destroy

    if request.format.json? || request.content_type == 'application/json'
      render json: { success: true, message: 'Content deleted successfully.' }, status: :ok
    else
      redirect_back fallback_location: documents_path, notice: 'Content deleted successfully.'
    end
  end

  private

  def set_habit_content
    @habit_content = HabitContent.find(params[:id])
    # Ensure user has access through at least one of their habits, or if unattached
    unless @habit_content.habits.empty? ? true : @habit_content.habits.joins(:user).where(users: { id: current_user.id }).exists?
      redirect_to documents_path, alert: 'Access denied'
    end
  end

  def habit_content_params
    params.require(:habit_content).permit(:content_type, :title, :body, :position, metadata: {}, habit_ids: [])
  end
end
