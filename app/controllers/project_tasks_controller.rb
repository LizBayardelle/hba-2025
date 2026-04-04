class ProjectTasksController < ApplicationController
  before_action :authenticate_user!
  before_action :set_project_task, only: [:update, :destroy]

  def create
    project = current_user.projects.find(params[:project_id])
    section = project.sections.find(params[:section_id])
    @task = section.project_tasks.build(project_task_params)
    @task.project = project
    @task.user = current_user

    if @task.save
      respond_to do |format|
        format.html { redirect_to project_path(project), notice: 'Task created.' }
        format.json {
          render json: @task.as_json(only: [:id, :name, :description, :completed, :due_date, :position, :parent_id]).merge(
            subtasks: []
          ), status: :created
        }
      end
    else
      respond_to do |format|
        format.html { redirect_to project_path(project), alert: @task.errors.full_messages.join(', ') }
        format.json { render json: { errors: @task.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def update
    if @task.update(project_task_params)
      respond_to do |format|
        format.html { redirect_to project_path(@task.project), notice: 'Task updated.' }
        format.json { render json: { success: true, task: @task.as_json(only: [:id, :name, :description, :completed, :completed_at, :due_date, :position, :section_id]) }, status: :ok }
      end
    else
      respond_to do |format|
        format.html { redirect_to project_path(@task.project), alert: @task.errors.full_messages.join(', ') }
        format.json { render json: { errors: @task.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    project = @task.project
    @task.update(archived: true)
    respond_to do |format|
      format.html { redirect_to project_path(project), notice: 'Task archived.' }
      format.json { render json: { success: true }, status: :ok }
    end
  end

  def reorder
    params[:tasks].each do |task_data|
      task = current_user.project_tasks.find(task_data[:id])
      task.update(position: task_data[:position], section_id: task_data[:section_id])
    end
    render json: { success: true }, status: :ok
  end

  private

  def set_project_task
    @task = current_user.project_tasks.find(params[:id])
  end

  def project_task_params
    params.require(:project_task).permit(:name, :description, :completed, :due_date, :position, :parent_id, :section_id)
  end
end
