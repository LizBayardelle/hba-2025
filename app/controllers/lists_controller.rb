class ListsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_list, only: [:show, :update, :destroy, :toggle_pin]

  def index
    @lists = current_user.lists.active.includes(:category, :checklist_items, :habit_attachments, :task_attachments).pinned_first

    respond_to do |format|
      format.html
      format.json {
        render json: {
          lists: @lists.map { |list|
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
              checklist_items: list.checklist_items.ordered.map { |item|
                {
                  id: item.id,
                  name: item.name,
                  completed: item.completed,
                  completed_at: item.completed_at,
                  position: item.position
                }
              }
            }
          }
        }
      }
    end
  end

  def show
    respond_to do |format|
      format.json {
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
          checklist_items: @list.checklist_items.ordered.map { |item|
            {
              id: item.id,
              name: item.name,
              completed: item.completed,
              completed_at: item.completed_at,
              position: item.position
            }
          }
        }
      }
    end
  end

  def create
    @list = current_user.lists.build(list_params)

    if @list.save
      respond_to do |format|
        format.json {
          render json: {
            success: true,
            message: 'List created successfully.',
            list: {
              id: @list.id,
              name: @list.name,
              category_id: @list.category_id
            }
          }, status: :created
        }
      end
    else
      respond_to do |format|
        format.json {
          render json: { success: false, errors: @list.errors.full_messages }, status: :unprocessable_entity
        }
      end
    end
  end

  def update
    if @list.update(list_params)
      respond_to do |format|
        format.json {
          render json: {
            success: true,
            message: 'List updated successfully.',
            list: {
              id: @list.id,
              name: @list.name,
              category_id: @list.category_id
            }
          }, status: :ok
        }
      end
    else
      respond_to do |format|
        format.json {
          render json: { success: false, errors: @list.errors.full_messages }, status: :unprocessable_entity
        }
      end
    end
  end

  def destroy
    @list.destroy

    respond_to do |format|
      format.json { render json: { success: true, message: 'List deleted successfully.' }, status: :ok }
    end
  end

  def toggle_pin
    new_pinned = !@list.pinned
    @list.update_column(:pinned, new_pinned)

    respond_to do |format|
      format.json { render json: { success: true, pinned: new_pinned }, status: :ok }
    end
  end

  private

  def set_list
    @list = current_user.lists.find(params[:id])
  end

  def list_params
    params.require(:list).permit(:name, :category_id, :pinned)
  end
end
