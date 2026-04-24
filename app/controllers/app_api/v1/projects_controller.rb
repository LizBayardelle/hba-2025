module AppApi
  module V1
    class ProjectsController < BaseController
      before_action :set_project, only: [:show, :update, :destroy]

      def index
        projects = current_user.projects.active.ordered
          .includes(sections: { project_tasks: :subtasks })

        render_success({ projects: projects.map { |p| project_json(p, full: true) } })
      end

      def show
        render_success({ project: project_json(@project, full: true) })
      end

      def create
        @project = current_user.projects.build(project_params)

        if @project.save
          render json: { project: project_json(@project) }, status: :created
        else
          render_errors @project.errors.full_messages
        end
      end

      def update
        if @project.update(project_params)
          render_success({ project: project_json(@project) })
        else
          render_errors @project.errors.full_messages
        end
      end

      def destroy
        @project.update(archived: true)
        render_success({ message: 'Project archived successfully.' })
      end

      def reorder
        ActiveRecord::Base.transaction do
          Array(params[:items]).each do |item|
            current_user.projects.where(id: item[:id]).update_all(position: item[:position])
          end
        end
        render_success({ message: 'Projects reordered.' })
      end

      private

      def set_project
        @project = current_user.projects.find(params[:id])
      end

      def project_params
        params.require(:project).permit(:name, :description, :color, :icon)
      end

      def project_json(project, full: false)
        data = project.as_json(
          only: [:id, :name, :description, :color, :icon, :position, :archived]
        )

        data[:task_count] = project.project_tasks.active.count
        data[:completed_task_count] = project.project_tasks.active.where(completed: true).count

        if full
          data[:sections] = project.sections.active.ordered.map { |section|
            section_json(section, include_tasks: true)
          }
        end

        data
      end

      def section_json(section, include_tasks: false)
        data = section.as_json(only: [:id, :name, :position, :archived]).merge(
          project_id: section.project_id
        )

        if include_tasks
          data[:project_tasks] = section.project_tasks.active.top_level.ordered.map { |task|
            project_task_json(task)
          }
        end

        data
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
