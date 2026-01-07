class CategoriesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_category, only: [:show, :update, :destroy]

  def show
    @sort_by = params[:sort] || 'priority'
    habits = @category.habits.where(archived_at: nil).to_a

    # Define sort orders
    importance_order = { 'critical' => 1, 'important' => 2, 'normal' => 3, 'optional' => 4 }
    time_order = { 'am' => 1, 'pm' => 2, 'night' => 3, 'any' => 4, nil => 5 }

    # Sort habits
    @habits = habits.sort_by do |habit|
      if @sort_by == 'priority'
        # Primary: importance, Secondary: time_of_day, Tertiary: alphabetical
        [
          importance_order[habit.importance] || 3,
          time_order[habit.time_of_day&.downcase] || 5,
          habit.name.downcase
        ]
      else # time_of_day
        # Primary: time_of_day, Secondary: importance, Tertiary: alphabetical
        [
          time_order[habit.time_of_day&.downcase] || 5,
          importance_order[habit.importance] || 3,
          habit.name.downcase
        ]
      end
    end

    @today_completions = current_user.habit_completions
                                      .where(completed_at: Time.zone.today)
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
