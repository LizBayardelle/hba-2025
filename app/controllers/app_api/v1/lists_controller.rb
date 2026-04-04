module AppApi
  module V1
    class ListsController < BaseController
      include AppApi::ChecklistRenderable

      before_action :set_list, only: [:show, :update, :destroy, :toggle_pin]

      def index
        lists = current_user.lists.active
          .includes(:category, :checklist_items, :habit_attachments, :task_attachments)
          .pinned_first

        render json: lists.map { |list|
          {
            id: list.id,
            name: list.name,
            pinned: list.pinned,
            category: list.category ? {
              id: list.category.id,
              name: list.category.name,
              color: list.category.color,
              icon: list.category.icon
            } : nil,
            habits: list.habit_attachments.map { |a| { id: a.attachable_id } },
            tasks: list.task_attachments.map { |a| { id: a.attachable_id } },
            checklist_items: list.checklist_items.ordered.map { |item| checklist_item_json(item) }
          }
        }
      end

      def show
        render json: {
          id: @list.id,
          name: @list.name,
          pinned: @list.pinned,
          category_id: @list.category_id,
          category: @list.category ? {
            id: @list.category.id,
            name: @list.category.name,
            color: @list.category.color,
            icon: @list.category.icon
          } : nil,
          checklist_items: @list.checklist_items.ordered.map { |item| checklist_item_json(item) }
        }
      end

      def create
        @list = current_user.lists.build(list_params)

        if @list.save
          render json: { list: { id: @list.id, name: @list.name, category_id: @list.category_id } }, status: :created
        else
          render_errors @list.errors.full_messages
        end
      end

      def update
        if @list.update(list_params)
          render json: { list: { id: @list.id, name: @list.name, category_id: @list.category_id } }
        else
          render_errors @list.errors.full_messages
        end
      end

      def destroy
        @list.destroy
        render_success({ message: 'List deleted.' })
      end

      def toggle_pin
        new_pinned = !@list.pinned
        @list.update_column(:pinned, new_pinned)
        render json: { pinned: new_pinned }
      end

      private

      def set_list
        @list = current_user.lists.find(params[:id])
      end

      def list_params
        params.require(:list).permit(:name, :category_id, :pinned)
      end
    end
  end
end
