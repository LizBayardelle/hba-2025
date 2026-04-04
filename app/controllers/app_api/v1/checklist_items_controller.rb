module AppApi
  module V1
    class ChecklistItemsController < BaseController
      include AppApi::ChecklistRenderable

      PARENT_TYPES = {
        'habits' => 'Habit',
        'tasks' => 'Task',
        'goals' => 'Goal',
        'lists' => 'List'
      }.freeze

      before_action :set_parent
      before_action :set_checklist_item, only: [:update, :destroy]

      def create
        @checklist_item = @parent.checklist_items.build(checklist_item_params)
        @checklist_item.user = current_user

        if @checklist_item.save
          recheck_goal_completion
          render json: { checklist_item: checklist_item_json(@checklist_item) }, status: :created
        else
          render_errors @checklist_item.errors.full_messages
        end
      end

      def update
        if @checklist_item.update(checklist_item_params)
          recheck_goal_completion
          render json: { checklist_item: checklist_item_json(@checklist_item) }
        else
          render_errors @checklist_item.errors.full_messages
        end
      end

      def destroy
        @checklist_item.destroy
        recheck_goal_completion
        render_success({ message: 'Checklist item deleted.' })
      end

      def reorder
        params[:item_ids].each_with_index do |id, index|
          @parent.checklist_items.find(id).update(position: index)
        end
        render_success({ message: 'Reordered.' })
      end

      private

      def set_parent
        parent_type = PARENT_TYPES[params[:parent_type]]
        unless parent_type
          render_error "Invalid parent type: #{params[:parent_type]}", status: :not_found
          return
        end

        klass = parent_type.constantize
        @parent = if klass == Habit || klass == Task || klass == Goal || klass == List
          current_user.send(params[:parent_type]).find(params[:parent_id])
        end
      end

      def set_checklist_item
        @checklist_item = @parent.checklist_items.find(params[:id])
      end

      def checklist_item_params
        params.require(:checklist_item).permit(:name, :completed, :position)
      end

      def recheck_goal_completion
        @parent.save if @parent.is_a?(Goal)
      end
    end
  end
end
