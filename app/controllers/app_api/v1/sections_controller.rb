module AppApi
  module V1
    class SectionsController < BaseController
      before_action :set_project
      before_action :set_section, only: [:update, :destroy]

      def create
        @section = @project.sections.build(section_params)

        if @section.save
          render json: { section: section_json(@section) }, status: :created
        else
          render_errors @section.errors.full_messages
        end
      end

      def update
        if @section.update(section_params)
          render_success({ section: section_json(@section) })
        else
          render_errors @section.errors.full_messages
        end
      end

      def destroy
        @section.update(archived: true)
        render_success({ message: 'Section archived.' })
      end

      def reorder
        ActiveRecord::Base.transaction do
          Array(params[:items]).each do |item|
            @project.sections.where(id: item[:id]).update_all(position: item[:position])
          end
        end
        render_success({ message: 'Sections reordered.' })
      end

      private

      def set_project
        @project = current_user.projects.find(params[:project_id])
      end

      def set_section
        @section = @project.sections.find(params[:id])
      end

      def section_params
        params.require(:section).permit(:name)
      end

      def section_json(section)
        section.as_json(only: [:id, :name, :position, :archived]).merge(
          project_id: section.project_id
        )
      end
    end
  end
end
