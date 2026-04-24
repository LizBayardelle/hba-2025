module AppApi
  module V1
    class ProjectTasksController < BaseController
      before_action :set_project_task, only: [:update, :destroy]

      def create
        project = current_user.projects.find(params[:project_id])
        section = project.sections.find(params[:section_id])
        @task = section.project_tasks.build(project_task_params)
        @task.project = project
        @task.user = current_user

        if @task.save
          render json: { project_task: project_task_json(@task) }, status: :created
        else
          render_errors @task.errors.full_messages
        end
      end

      def update
        if @task.update(project_task_params)
          render_success({ project_task: project_task_json(@task) })
        else
          render_errors @task.errors.full_messages
        end
      end

      def destroy
        @task.update(archived: true)
        render_success({ message: 'Task archived.' })
      end

      def reorder
        ActiveRecord::Base.transaction do
          Array(params[:items]).each do |item|
            task = current_user.project_tasks.find(item[:id])
            attrs = { position: item[:position] }
            attrs[:section_id] = item[:section_id] if item[:section_id].present?
            attrs[:parent_id] = item.key?(:parent_id) ? item[:parent_id] : task.parent_id
            task.update!(attrs)
          end
        end
        render_success({ message: 'Tasks reordered.' })
      end

      private

      def set_project_task
        @task = current_user.project_tasks.find(params[:id])
      end

      def project_task_params
        params.require(:project_task).permit(
          :name, :description, :completed, :due_date, :parent_id, :section_id
        )
      end

      def project_task_json(task)
        task.as_json(
          only: [:id, :name, :description, :completed, :completed_at, :due_date,
                 :parent_id, :section_id, :project_id, :position, :archived]
        ).merge(
          subtasks: task.subtasks.active.ordered.map { |sub|
            sub.as_json(only: [:id, :name, :completed, :completed_at, :due_date,
                               :parent_id, :section_id, :project_id, :position, :archived])
          }
        )
      end
    end
  end
end
