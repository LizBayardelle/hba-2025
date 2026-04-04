module AppApi
  module V1
    class TimeBlocksController < BaseController
      before_action :set_time_block, only: [:show, :update, :destroy]
      skip_before_action :verify_authenticity_token, only: [:reorder], raise: false

      def index
        render json: current_user.time_blocks.ordered
      end

      def show
        render json: @time_block
      end

      def create
        @time_block = current_user.time_blocks.build(time_block_params)

        if @time_block.save
          render json: @time_block, status: :created
        else
          render_errors @time_block.errors.full_messages
        end
      end

      def update
        if @time_block.update(time_block_params)
          render json: @time_block
        else
          render_errors @time_block.errors.full_messages
        end
      end

      def reorder
        ids = params.require(:ids)
        blocks = current_user.time_blocks.where(id: ids)

        ActiveRecord::Base.transaction do
          blocks.update_all("rank = -rank - 1000")

          ids.each_with_index do |id, index|
            current_user.time_blocks.where(id: id).update_all(rank: index + 1)
          end
        end

        render json: current_user.time_blocks.ordered
      end

      def destroy
        if @time_block.destroy
          render_success({ message: 'Time block deleted.' })
        else
          render_errors @time_block.errors.full_messages
        end
      end

      private

      def set_time_block
        @time_block = current_user.time_blocks.find(params[:id])
      end

      def time_block_params
        params.require(:time_block).permit(:name, :rank, :icon, :color)
      end
    end
  end
end
