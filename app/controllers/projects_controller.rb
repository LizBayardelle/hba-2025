class ProjectsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_project, only: [:show, :update, :destroy]

  def index
    @projects = current_user.projects.active.ordered

    respond_to do |format|
      format.json {
        render json: @projects.map { |project|
          project.as_json(only: [:id, :name, :color, :icon, :description]).merge(
            sections: project.sections.active.ordered.map { |section|
              section.as_json(only: [:id, :name, :position]).merge(
                project_tasks_count: section.project_tasks.active.top_level.count
              )
            },
            total_tasks: project.project_tasks.active.count,
            completed_tasks: project.project_tasks.active.where(completed: true).count
          )
        }
      }
    end
  end

  def show
    @project = current_user.projects.find(params[:id])

    respond_to do |format|
      format.html
      format.json {
        render json: {
          project: @project.as_json(only: [:id, :name, :description, :color, :icon]),
          sections: @project.sections.active.ordered.map { |section|
            section.as_json(only: [:id, :name, :position]).merge(
              project_tasks: section.project_tasks.active.top_level.ordered.map { |task|
                task.as_json(only: [:id, :name, :description, :completed, :completed_at, :due_date, :position]).merge(
                  subtasks: task.subtasks.active.ordered.map { |sub|
                    sub.as_json(only: [:id, :name, :completed, :completed_at, :due_date, :position])
                  }
                )
              }
            )
          }
        }
      }
    end
  end

  def create
    @project = current_user.projects.build(project_params)

    if @project.save
      redirect_to project_path(@project), notice: 'Project created successfully.'
    else
      redirect_to root_path, alert: "Error creating project: #{@project.errors.full_messages.join(', ')}"
    end
  end

  def update
    if @project.update(project_params)
      respond_to do |format|
        format.html { redirect_to project_path(@project), notice: 'Project updated successfully.' }
        format.json { render json: { success: true, message: 'Project updated successfully.' }, status: :ok }
      end
    else
      respond_to do |format|
        format.html { redirect_to project_path(@project), alert: "Error updating project: #{@project.errors.full_messages.join(', ')}" }
        format.json { render json: { success: false, errors: @project.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @project.update(archived: true)
    respond_to do |format|
      format.html { redirect_to root_path, notice: 'Project archived successfully.' }
      format.json { render json: { success: true, message: 'Project archived successfully.' }, status: :ok }
    end
  end

  private

  def set_project
    @project = current_user.projects.find(params[:id])
  end

  def project_params
    params.require(:project).permit(:name, :color, :icon, :description)
  end
end
