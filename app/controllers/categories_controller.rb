class CategoriesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_category, only: [:show, :update, :destroy]

  def index
    @categories = current_user.categories.where(archived: false).order(:position, :name)

    respond_to do |format|
      format.json {
        render json: @categories.map { |category|
          category.as_json(only: [:id, :name, :color, :icon, :description]).merge(
            habits: category.habits.active.includes(:time_block, :importance_level).map { |habit|
              habit.as_json(
                only: [:id, :name, :target_count, :frequency_type, :time_of_day, :importance, :category_id, :time_block_id, :importance_level_id, :schedule_mode, :schedule_config],
                include: {
                  tags: { only: [:id, :name] },
                  documents: { only: [:id, :title, :content_type] },
                  time_block: { only: [:id, :name, :icon, :color, :rank] },
                  importance_level: { only: [:id, :name, :icon, :color, :rank] }
                }
              ).merge(
                today_count: habit.completions_for_date(Date.today),
                current_streak: habit.current_streak,
                is_due_today: habit.due_today?,
                schedule_description: habit.schedule_description
              )
            }
          )
        }
      }
    end
  end

  def show
    @sort_by = params[:sort] || 'priority'
    habits = @category.habits.where(archived_at: nil).includes(:documents, :tags, :importance_level, :time_block).to_a

    # Sort habits
    @habits = habits.sort_by do |habit|
      if @sort_by == 'priority'
        # Primary: importance_level rank, Secondary: time_block rank, Tertiary: alphabetical
        [
          habit.importance_level&.rank || 999,
          habit.time_block&.rank || 999,
          habit.name.downcase
        ]
      else # time
        # Primary: time_block rank, Secondary: importance_level rank, Tertiary: alphabetical
        [
          habit.time_block&.rank || 999,
          habit.importance_level&.rank || 999,
          habit.name.downcase
        ]
      end
    end

    @today_completions = current_user.habit_completions
                                      .where(completed_at: Time.zone.today)
                                      .index_by(&:habit_id)

    respond_to do |format|
      format.html
      format.json {
        render json: {
          category: @category.as_json(only: [:id, :name, :description, :color, :icon]),
          habits: @habits.map { |habit|
            completion = @today_completions[habit.id]
            habit.as_json(
              only: [:id, :name, :target_count, :frequency_type, :time_of_day, :importance, :category_id, :importance_level_id, :time_block_id, :schedule_mode, :schedule_config],
              methods: [:current_streak],
              include: {
                tags: { only: [:id, :name] },
                importance_level: { only: [:id, :name, :icon, :color, :rank] },
                time_block: { only: [:id, :name, :icon, :color, :rank] }
              }
            ).merge(
              today_count: completion ? completion.count : 0,
              documents: habit.documents.map { |content|
                { id: content.id, title: content.title, content_type: content.content_type }
              },
              is_due_today: habit.due_today?,
              schedule_description: habit.schedule_description
            )
          }
        }
      }
    end
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
      respond_to do |format|
        format.html { redirect_to category_path(@category), notice: 'Category updated successfully.' }
        format.json { render json: { success: true, message: 'Category updated successfully.' }, status: :ok }
      end
    else
      respond_to do |format|
        format.html { redirect_to category_path(@category), alert: "Error updating category: #{@category.errors.full_messages.join(', ')}" }
        format.json { render json: { success: false, errors: @category.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @category.update(archived: true)
    respond_to do |format|
      format.html { redirect_to root_path, notice: 'Category archived successfully.' }
      format.json { render json: { success: true, message: 'Category archived successfully.' }, status: :ok }
    end
  end

  private

  def set_category
    @category = current_user.categories.find(params[:id])
  end

  def category_params
    params.require(:category).permit(:name, :color, :icon, :description)
  end
end
