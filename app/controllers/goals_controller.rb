class GoalsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_goal, only: [:show, :update, :destroy, :increment, :decrement]

  def index
    @goals = current_user.goals.includes(:category, :tags, :importance_level, :time_block, :checklist_items, list_attachments: { list: [:category, :checklist_items] })

    case params[:status]
    when 'completed'
      @goals = @goals.where(completed: true)
    when 'all'
      @goals = @goals.where(archived_at: nil)
    else
      @goals = @goals.where(completed: false, archived_at: nil)
    end

    if params[:category_id].present?
      @goals = @goals.where(category_id: params[:category_id])
    end

    if params[:search].present?
      search_term = "%#{params[:search]}%"
      @goals = @goals.left_outer_joins(:category, :tags)
                     .where(
                       "goals.name ILIKE :search OR categories.name ILIKE :search OR tags.name ILIKE :search",
                       search: search_term
                     )
                     .group('goals.id')
    end

    @goals = @goals.order(Arel.sql('COALESCE(goals.position, 999999), goals.created_at DESC'))

    respond_to do |format|
      format.html
      format.json {
        render json: @goals.map { |goal|
          goal_json(goal)
        }
      }
    end
  end

  def show
    respond_to do |format|
      format.json {
        render json: goal_json(@goal).merge(
          goal_contents: @goal.documents.map { |doc| { id: doc.id, title: doc.title } },
          list_attachments: @goal.list_attachments.map { |la| { list_id: la.list_id } }
        )
      }
    end
  end

  def create
    @goal = current_user.goals.build(goal_params.except(:tag_names, :goal_content_ids, :list_attachment_ids))

    if @goal.save
      if goal_params[:tag_names].present?
        tag_names = goal_params[:tag_names].reject(&:blank?)
        tag_names.each do |tag_name|
          tag = current_user.tags.find_or_create_by(name: tag_name.strip)
          @goal.tags << tag unless @goal.tags.include?(tag)
        end
      end

      if goal_params[:goal_content_ids].present?
        @goal.goal_content_ids = goal_params[:goal_content_ids]
      end

      sync_list_attachments(@goal)

      respond_to do |format|
        format.json { render json: { success: true, message: 'Goal created.', goal: @goal }, status: :created }
      end
    else
      respond_to do |format|
        format.json { render json: { success: false, errors: @goal.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def update
    if @goal.update(goal_params.except(:tag_names, :goal_content_ids, :list_attachment_ids))
      if goal_params[:tag_names]
        @goal.tags.clear
        tag_names = goal_params[:tag_names].reject(&:blank?)
        tag_names.each do |tag_name|
          tag = current_user.tags.find_or_create_by(name: tag_name.strip)
          @goal.tags << tag unless @goal.tags.include?(tag)
        end
      end

      if goal_params[:goal_content_ids]
        @goal.goal_content_ids = goal_params[:goal_content_ids]
      end

      sync_list_attachments(@goal)

      respond_to do |format|
        format.json { render json: { success: true, message: 'Goal updated.', goal: @goal }, status: :ok }
      end
    else
      respond_to do |format|
        format.json { render json: { success: false, errors: @goal.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    @goal.destroy
    respond_to do |format|
      format.json { render json: { success: true, message: 'Goal deleted.' }, status: :ok }
    end
  end

  def increment
    @goal.increment_count!
    respond_to do |format|
      format.json { render json: goal_json(@goal), status: :ok }
    end
  end

  def decrement
    @goal.decrement_count!
    respond_to do |format|
      format.json { render json: goal_json(@goal), status: :ok }
    end
  end

  private

  def set_goal
    @goal = current_user.goals.find(params[:id])
  end

  def goal_params
    params.require(:goal).permit(
      :name, :description, :goal_type, :target_count, :current_count, :unit_name,
      :category_id, :importance_level_id, :time_block_id, :completed, :completed_at,
      :position, :archived_at,
      tag_names: [], goal_content_ids: [], list_attachment_ids: []
    )
  end

  def list_attachment_ids
    params[:goal][:list_attachment_ids]&.reject(&:blank?)&.map(&:to_i) || []
  end

  def sync_list_attachments(goal)
    new_ids = list_attachment_ids
    current_ids = goal.list_attachments.pluck(:list_id)

    goal.list_attachments.where.not(list_id: new_ids).destroy_all

    (new_ids - current_ids).each do |list_id|
      goal.list_attachments.create!(list_id: list_id, user: current_user)
    end
  end

  def goal_json(goal)
    goal.as_json(
      only: [:id, :name, :description, :goal_type, :target_count, :current_count, :unit_name,
             :completed, :completed_at, :position, :created_at, :updated_at,
             :category_id, :importance_level_id, :time_block_id],
      include: {
        tags: { only: [:id, :name] },
        category: { only: [:id, :name, :color, :icon] },
        importance_level: { only: [:id, :name, :icon, :color, :rank] },
        time_block: { only: [:id, :name, :icon, :color, :rank] }
      }
    ).merge(
      progress: goal.progress,
      checklist_items: goal.checklist_items.ordered.map { |item|
        { id: item.id, name: item.name, completed: item.completed, completed_at: item.completed_at, position: item.position }
      },
      list_attachments: goal.list_attachments.includes(list: [:category, :checklist_items]).map { |la|
        {
          id: la.id,
          list_id: la.list_id,
          list_name: la.list.name,
          list_category: la.list.category ? {
            id: la.list.category.id,
            name: la.list.category.name,
            color: la.list.category.color,
            icon: la.list.category.icon
          } : nil,
          checklist_items: la.list.checklist_items.ordered.map { |item|
            { id: item.id, name: item.name, completed: item.completed, completed_at: item.completed_at, position: item.position }
          }
        }
      }
    )
  end
end
