module AppApi
  module V1
    class ImportanceLevelsController < BaseController
      before_action :set_importance_level, only: [:show, :update, :destroy]
      skip_before_action :verify_authenticity_token, only: [:reorder], raise: false

      def index
        render json: current_user.importance_levels.ordered
      end

      def show
        render json: @importance_level
      end

      def create
        @importance_level = current_user.importance_levels.build(importance_level_params)

        if @importance_level.save
          render json: @importance_level, status: :created
        else
          render_errors @importance_level.errors.full_messages
        end
      end

      def update
        update_params = @importance_level.optional? ? importance_level_params.except(:name) : importance_level_params

        if @importance_level.update(update_params)
          render json: @importance_level
        else
          render_errors @importance_level.errors.full_messages
        end
      end

      def reorder
        ids = params.require(:ids)
        levels = current_user.importance_levels.where(id: ids)

        ActiveRecord::Base.transaction do
          # Set all ranks to negative temporary values to avoid uniqueness conflicts
          levels.update_all("rank = -rank - 1000")

          ids.each_with_index do |id, index|
            current_user.importance_levels.where(id: id).update_all(rank: index + 1)
          end
        end

        render json: current_user.importance_levels.ordered
      end

      def destroy
        if @importance_level.optional?
          render_error 'Cannot delete the Optional importance level'
          return
        end

        if @importance_level.destroy
          render_success({ message: 'Importance level deleted.' })
        else
          render_errors @importance_level.errors.full_messages
        end
      end

      private

      def set_importance_level
        @importance_level = current_user.importance_levels.find(params[:id])
      end

      def importance_level_params
        params.require(:importance_level).permit(:name, :rank, :icon, :color)
      end
    end
  end
end
