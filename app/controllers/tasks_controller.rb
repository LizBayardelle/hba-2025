class TasksController < ApplicationController
  before_action :authenticate_user!
  before_action :set_task, only: [:show, :update, :destroy]

  def index
    @tasks = current_user.tasks.includes(:category, :tags, :importance_level, :time_block)

    # Filter by status
    case params[:status]
    when 'completed'
      # Show completed tasks (all time)
      @tasks = @tasks.where(completed: true)
    when 'on_hold'
      # Show only on-hold tasks (not completed)
      @tasks = @tasks.where(on_hold: true, completed: false, archived_at: nil)
    when 'active_with_today_completed'
      # Active: not completed OR completed today, not on hold, not archived
      today_start = Time.zone.now.beginning_of_day
      @tasks = @tasks.where(on_hold: false, archived_at: nil)
                     .where('completed = ? OR (completed = ? AND completed_at >= ?)', false, true, today_start)
    when 'active'
      # Active: not completed, not on hold, not archived
      @tasks = @tasks.where(completed: false, on_hold: false, archived_at: nil)
    else
      # Default to active with today's completed
      today_start = Time.zone.now.beginning_of_day
      @tasks = @tasks.where(on_hold: false, archived_at: nil)
                     .where('completed = ? OR (completed = ? AND completed_at >= ?)', false, true, today_start)
    end

    # Filter by category if provided
    if params[:category_id].present?
      @tasks = @tasks.where(category_id: params[:category_id])
    end

    # Filter by tag if provided
    if params[:tag_id].present?
      @tasks = @tasks.joins(:tags).where(tags: { id: params[:tag_id] })
    end

    # Filter by importance if provided
    if params[:importance].present?
      @tasks = @tasks.where(importance: params[:importance])
    end

    # Search by name, category name, importance, or tags
    if params[:search].present?
      search_term = "%#{params[:search]}%"
      @tasks = @tasks.left_outer_joins(:category, :tags)
                     .where(
                       "tasks.name ILIKE :search OR
                        categories.name ILIKE :search OR
                        tasks.importance ILIKE :search OR
                        tags.name ILIKE :search",
                       search: search_term
                     )
                     .group('tasks.id')
    end

    # Order by position or due date
    @tasks = @tasks.order(Arel.sql('COALESCE(tasks.position, 999999), tasks.due_date NULLS LAST, tasks.created_at DESC'))

    respond_to do |format|
      format.html
      format.json {
        render json: @tasks.map { |task|
          task.as_json(
            only: [:id, :name, :importance, :importance_level_id, :completed, :completed_at, :on_hold, :url,
                   :location_name, :location_lat, :location_lng, :position, :due_date,
                   :due_time, :created_at, :updated_at, :category_id, :attached_document_id, :time_block_id],
            include: {
              tags: { only: [:id, :name] },
              category: { only: [:id, :name, :color, :icon] },
              document: { only: [:id, :title] },
              importance_level: { only: [:id, :name, :icon, :color, :rank] },
              time_block: { only: [:id, :name, :icon, :color, :rank] }
            }
          ).merge(notes: task.notes.to_s)
        }
      }
    end
  end

  def show
    respond_to do |format|
      format.json {
        render json: @task.as_json(
          only: [:id, :name, :importance, :importance_level_id, :completed, :completed_at, :on_hold, :url,
                 :location_name, :location_lat, :location_lng, :position, :due_date,
                 :due_time, :created_at, :updated_at, :category_id, :attached_document_id, :time_block_id],
          include: {
            tags: { only: [:id, :name] },
            category: { only: [:id, :name, :color, :icon] },
            document: { only: [:id, :title] },
            importance_level: { only: [:id, :name, :icon, :color, :rank] },
            time_block: { only: [:id, :name, :icon, :color, :rank] }
          }
        ).merge(notes: @task.notes.to_s)
      }
    end
  end

  def create
    @task = current_user.tasks.build(task_params.except(:tag_names))

    if @task.save
      # Handle tags
      if task_params[:tag_names].present?
        tag_names = task_params[:tag_names].reject(&:blank?)
        tag_names.each do |tag_name|
          tag = current_user.tags.find_or_create_by(name: tag_name.strip)
          @task.tags << tag unless @task.tags.include?(tag)
        end
      end

      respond_to do |format|
        format.json { render json: { success: true, message: 'Task created.', task: @task }, status: :created }
      end
    else
      respond_to do |format|
        format.json { render json: { success: false, errors: @task.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def update
    if @task.update(task_params.except(:tag_names))
      # Handle tags
      if task_params[:tag_names]
        @task.tags.clear
        tag_names = task_params[:tag_names].reject(&:blank?)
        tag_names.each do |tag_name|
          tag = current_user.tags.find_or_create_by(name: tag_name.strip)
          @task.tags << tag unless @task.tags.include?(tag)
        end
      end

      respond_to do |format|
        format.json { render json: { success: true, message: 'Task updated.', task: @task }, status: :ok }
      end
    else
      respond_to do |format|
        format.json { render json: { success: false, errors: @task.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @task.destroy
    respond_to do |format|
      format.json { render json: { success: true, message: 'Task deleted.' }, status: :ok }
    end
  end

  private

  def set_task
    @task = current_user.tasks.find(params[:id])
  end

  def task_params
    params.require(:task).permit(
      :name, :importance, :importance_level_id, :category_id, :completed, :completed_at, :on_hold,
      :notes, :url, :location_name, :location_lat, :location_lng,
      :attached_document_id, :position, :due_date, :due_time, :archived_at, :time_block_id,
      tag_names: []
    )
  end
end
