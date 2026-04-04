module AppApi
  module V1
    class TasksController < BaseController
      include AppApi::ListAttachable
      include AppApi::TagAssignable
      include AppApi::ChecklistRenderable

      before_action :set_task, only: [:show, :update, :destroy]

      def index
        tasks = current_user.tasks
          .includes(:category, :tags, :importance_level, :time_block, :checklist_items,
                    list_attachments: { list: [:category, :checklist_items] })

        case params[:status]
        when 'completed'
          tasks = tasks.where(completed: true)
        when 'on_hold'
          tasks = tasks.where(on_hold: true, completed: false, archived_at: nil)
        when 'active'
          tasks = tasks.where(completed: false, on_hold: false, archived_at: nil)
        else
          today_start = Time.zone.now.beginning_of_day
          tasks = tasks.where(on_hold: false, archived_at: nil)
                       .where('completed = ? OR (completed = ? AND completed_at >= ?)', false, true, today_start)
        end

        tasks = tasks.where(category_id: params[:category_id]) if params[:category_id].present?

        if params[:tag_id].present?
          tasks = tasks.joins(:tags).where(tags: { id: params[:tag_id] })
        end

        tasks = tasks.where(importance: params[:importance]) if params[:importance].present?

        if params[:search].present?
          search_term = "%#{params[:search]}%"
          tasks = tasks.left_outer_joins(:category, :tags)
                       .where(
                         "tasks.name ILIKE :search OR categories.name ILIKE :search OR tasks.importance ILIKE :search OR tags.name ILIKE :search",
                         search: search_term
                       )
                       .group('tasks.id')
        end

        tasks = tasks.order(Arel.sql('COALESCE(tasks.position, 999999), tasks.due_date NULLS LAST, tasks.created_at DESC'))

        render json: tasks.map { |task| task_json(task) }
      end

      def show
        render json: task_json(@task, full: true)
      end

      def create
        @task = current_user.tasks.build(task_params.except(:tag_names, :task_content_ids, :list_attachment_ids))

        if @task.save
          create_tags(@task, task_params[:tag_names])
          @task.task_content_ids = task_params[:task_content_ids] if task_params[:task_content_ids].present?
          sync_list_attachments(@task, :task) if params[:task][:list_attachment_ids]
          render json: { task: task_json(@task) }, status: :created
        else
          render_errors @task.errors.full_messages
        end
      end

      def update
        if @task.update(task_params.except(:tag_names, :task_content_ids, :list_attachment_ids))
          assign_tags(@task, task_params[:tag_names]) if task_params.key?(:tag_names)
          @task.task_content_ids = task_params[:task_content_ids] if task_params.key?(:task_content_ids)
          sync_list_attachments(@task, :task) if params[:task][:list_attachment_ids]
          render json: { task: task_json(@task) }
        else
          render_errors @task.errors.full_messages
        end
      end

      def destroy
        @task.destroy
        render_success({ message: 'Task deleted.' })
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

      def task_json(task, full: false)
        data = task.as_json(
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
          checklist_items: task.checklist_items.ordered.map { |item| checklist_item_json(item) },
          list_attachments: task.list_attachments.includes(list: [:category, :checklist_items]).map { |la|
            list_attachment_json(la)
          }
        )

        if full
          data.merge!(
            task_contents: task.documents.map { |doc| { id: doc.id, title: doc.title } }
          )
        end

        data
      end
    end
  end
end
