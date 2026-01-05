class HabitContentsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_habit
  before_action :set_habit_content, only: [:show, :edit, :update, :destroy]

  def index
    @habit_contents = @habit.habit_contents.ordered
  end

  def show
    # For modal display
    respond_to do |format|
      format.html
      format.json { render json: @habit_content }
    end
  end

  def new
    @habit_content = @habit.habit_contents.build
  end

  def create
    @habit_content = @habit.habit_contents.build(habit_content_params)

    if @habit_content.save
      redirect_to category_path(@habit.category), notice: 'Content added successfully.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @habit_content.update(habit_content_params)
      redirect_to category_path(@habit.category), notice: 'Content updated successfully.'
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @habit_content.destroy
    redirect_to category_path(@habit.category), notice: 'Content deleted successfully.'
  end

  private

  def set_habit
    @habit = current_user.habits.find(params[:habit_id])
  end

  def set_habit_content
    @habit_content = @habit.habit_contents.find(params[:id])
  end

  def habit_content_params
    params.require(:habit_content).permit(:content_type, :title, :body, :position, metadata: {})
  end
end
