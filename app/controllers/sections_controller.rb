class SectionsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_project
  before_action :set_section, only: [:update, :destroy]

  def create
    @section = @project.sections.build(section_params)

    if @section.save
      respond_to do |format|
        format.html { redirect_to project_path(@project), notice: 'Section created.' }
        format.json { render json: @section.as_json(only: [:id, :name, :position]), status: :created }
      end
    else
      respond_to do |format|
        format.html { redirect_to project_path(@project), alert: @section.errors.full_messages.join(', ') }
        format.json { render json: { errors: @section.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def update
    if @section.update(section_params)
      respond_to do |format|
        format.html { redirect_to project_path(@project), notice: 'Section updated.' }
        format.json { render json: { success: true }, status: :ok }
      end
    else
      respond_to do |format|
        format.html { redirect_to project_path(@project), alert: @section.errors.full_messages.join(', ') }
        format.json { render json: { errors: @section.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @section.update(archived: true)
    respond_to do |format|
      format.html { redirect_to project_path(@project), notice: 'Section archived.' }
      format.json { render json: { success: true }, status: :ok }
    end
  end

  private

  def set_project
    @project = current_user.projects.find(params[:project_id])
  end

  def set_section
    @section = @project.sections.find(params[:id])
  end

  def section_params
    params.require(:section).permit(:name, :position)
  end
end
