class TasksController < ApplicationController
  before_action :authenticate_user!
  before_action :set_task, only: [:show, :update, :destroy]

  def index
    @tasks = current_user.tasks.includes(:category, :tags, :importance_level, :time_block, :checklist_items, list_attachments: { list: [:category, :checklist_items] })

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
                   :due_time, :created_at, :updated_at, :category_id, :attached_document_id, :time_block_id,
                   :repeat_frequency, :repeat_interval, :repeat_days, :repeat_end_date],
            include: {
              tags: { only: [:id, :name] },
              category: { only: [:id, :name, :color, :icon] },
              document: { only: [:id, :title] },
              importance_level: { only: [:id, :name, :icon, :color, :rank] },
              time_block: { only: [:id, :name, :icon, :color, :rank] }
            }
          ).merge(
            notes: task.notes.to_s,
            checklist_items: task.checklist_items.ordered.map { |item|
              { id: item.id, name: item.name, completed: item.completed, completed_at: item.completed_at, position: item.position }
            },
            list_attachments: task.list_attachments.includes(list: [:category, :checklist_items]).map { |la|
              {
                id: la.id,
                list_id: la.list_id,
                list_name: la.list.name,
                list_category: la.list.category ? {
                  id: la.list.category.id,
                  name: la.list.category.name,
                  color: la.list.category.color,
                  icon: la.list.category.icon
                } : nil,
                checklist_items: la.list.checklist_items.ordered.map { |item|
                  { id: item.id, name: item.name, completed: item.completed, completed_at: item.completed_at, position: item.position }
                }
              }
            }
          )
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
                 :due_time, :created_at, :updated_at, :category_id, :attached_document_id, :time_block_id,
                 :repeat_frequency, :repeat_interval, :repeat_days, :repeat_end_date],
          include: {
            tags: { only: [:id, :name] },
            category: { only: [:id, :name, :color, :icon] },
            document: { only: [:id, :title] },
            importance_level: { only: [:id, :name, :icon, :color, :rank] },
            time_block: { only: [:id, :name, :icon, :color, :rank] }
          }
        ).merge(
          notes: @task.notes.to_s,
          checklist_items: @task.checklist_items.ordered.map { |item|
            { id: item.id, name: item.name, completed: item.completed, completed_at: item.completed_at, position: item.position }
          },
          task_contents: @task.documents.map { |doc| { id: doc.id, title: doc.title } },
          list_attachments: @task.list_attachments.map { |la| { list_id: la.list_id } }
        )
      }
    end
  end

  def create
    @task = current_user.tasks.build(task_params.except(:tag_names, :task_content_ids, :list_attachment_ids))

    if @task.save
      # Handle tags
      if task_params[:tag_names].present?
        tag_names = task_params[:tag_names].reject(&:blank?)
        tag_names.each do |tag_name|
          tag = current_user.tags.find_or_create_by(name: tag_name.strip)
          @task.tags << tag unless @task.tags.include?(tag)
        end
      end

      # Handle document attachments
      if task_params[:task_content_ids].present?
        @task.task_content_ids = task_params[:task_content_ids]
      end

      # Handle list attachments
      sync_list_attachments(@task)

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
    if @task.update(task_params.except(:tag_names, :task_content_ids, :list_attachment_ids))
      # Handle tags
      if task_params[:tag_names]
        @task.tags.clear
        tag_names = task_params[:tag_names].reject(&:blank?)
        tag_names.each do |tag_name|
          tag = current_user.tags.find_or_create_by(name: tag_name.strip)
          @task.tags << tag unless @task.tags.include?(tag)
        end
      end

      # Handle document attachments
      if task_params[:task_content_ids]
        @task.task_content_ids = task_params[:task_content_ids]
      end

      # Handle list attachments
      sync_list_attachments(@task)

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
      :repeat_frequency, :repeat_interval, :repeat_end_date,
      tag_names: [], task_content_ids: [], list_attachment_ids: [], repeat_days: []
    )
  end

  def list_attachment_ids
    params[:task][:list_attachment_ids]&.reject(&:blank?)&.map(&:to_i) || []
  end

  def sync_list_attachments(task)
    new_ids = list_attachment_ids
    current_ids = task.list_attachments.pluck(:list_id)

    # Remove attachments no longer selected
    task.list_attachments.where.not(list_id: new_ids).destroy_all

    # Add new attachments
    (new_ids - current_ids).each do |list_id|
      task.list_attachments.create!(list_id: list_id, user: current_user)
    end
  end
end
