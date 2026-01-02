class CategoriesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_category, only: [:show, :update, :destroy]

  def show
    @habits = @category.habits.where(archived_at: nil).order(:position, :created_at)
    @today_completions = current_user.habit_completions
                                      .where(completed_at: Date.today)
                                      .index_by(&:habit_id)
  end

  def create
    @category = current_user.categories.build(category_params)

    if @category.save
      redirect_to root_path, notice: 'Category created successfully.'
    else
      redirect_to root_path, alert: "Error creating category: #{@category.errors.full_messages.join(', ')}"
    end
  end

  def update
    if @category.update(category_params)
      redirect_to category_path(@category), notice: 'Category updated successfully.'
    else
      redirect_to category_path(@category), alert: "Error updating category: #{@category.errors.full_messages.join(', ')}"
    end
  end

  def destroy
    @category.update(archived: true)
    redirect_to root_path, notice: 'Category archived successfully.'
  end

  private

  def set_category
    @category = current_user.categories.find(params[:id])
  end

  def category_params
    params.require(:category).permit(:name, :color, :icon, :description)
  end
end
