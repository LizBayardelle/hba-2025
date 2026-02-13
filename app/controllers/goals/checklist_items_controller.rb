module Goals
  class ChecklistItemsController < ApplicationController
    before_action :authenticate_user!
    before_action :set_goal
    before_action :set_checklist_item, only: [:update, :destroy]

    def create
      @checklist_item = @goal.checklist_items.build(checklist_item_params)
      @checklist_item.user = current_user

      if @checklist_item.save
        @goal.save # Re-check completion status
        render json: {
          success: true,
          checklist_item: checklist_item_json(@checklist_item)
        }, status: :created
      else
        render json: {
          success: false,
          errors: @checklist_item.errors.full_messages
        }, status: :unprocessable_entity
      end
    end

    def update
      if @checklist_item.update(checklist_item_params)
        @goal.save # Re-check completion status
        render json: {
          success: true,
          checklist_item: checklist_item_json(@checklist_item)
        }
      else
        render json: {
          success: false,
          errors: @checklist_item.errors.full_messages
        }, status: :unprocessable_entity
      end
    end

    def destroy
      @checklist_item.destroy
      @goal.save # Re-check completion status
      render json: { success: true }
    end

    def reorder
      params[:item_ids].each_with_index do |id, index|
        @goal.checklist_items.find(id).update(position: index)
      end
      render json: { success: true }
    end

    private

    def set_goal
      @goal = current_user.goals.find(params[:goal_id])
    end

    def set_checklist_item
      @checklist_item = @goal.checklist_items.find(params[:id])
    end

    def checklist_item_params
      params.require(:checklist_item).permit(:name, :completed, :position)
    end

    def checklist_item_json(item)
      {
        id: item.id,
        name: item.name,
        completed: item.completed,
        completed_at: item.completed_at,
        position: item.position
      }
    end
  end
end
