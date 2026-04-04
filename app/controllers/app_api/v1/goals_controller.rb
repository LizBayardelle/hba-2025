module AppApi
  module V1
    class GoalsController < BaseController
      include AppApi::ListAttachable
      include AppApi::TagAssignable
      include AppApi::ChecklistRenderable

      before_action :set_goal, only: [:show, :update, :destroy, :increment, :decrement]

      def index
        goals = current_user.goals
          .includes(:category, :tags, :importance_level, :time_block, :checklist_items,
                    list_attachments: { list: [:category, :checklist_items] })

        case params[:status]
        when 'completed'
          goals = goals.where(completed: true)
        when 'all'
          goals = goals.where(archived_at: nil)
        else
          goals = goals.where(completed: false, archived_at: nil)
        end

        goals = goals.where(category_id: params[:category_id]) if params[:category_id].present?

        if params[:search].present?
          search_term = "%#{params[:search]}%"
          goals = goals.left_outer_joins(:category, :tags)
                       .where(
                         "goals.name ILIKE :search OR categories.name ILIKE :search OR tags.name ILIKE :search",
                         search: search_term
                       )
                       .group('goals.id')
        end

        goals = goals.order(Arel.sql('COALESCE(goals.position, 999999), goals.created_at DESC'))

        render json: goals.map { |goal| goal_json(goal) }
      end

      def show
        render json: goal_json(@goal).merge(
          goal_contents: @goal.documents.map { |doc| { id: doc.id, title: doc.title } },
          list_attachments: @goal.list_attachments.map { |la| { list_id: la.list_id } }
        )
      end

      def create
        @goal = current_user.goals.build(goal_params.except(:tag_names, :goal_content_ids, :list_attachment_ids))

        if @goal.save
          create_tags(@goal, goal_params[:tag_names])
          @goal.goal_content_ids = goal_params[:goal_content_ids] if goal_params[:goal_content_ids].present?
          sync_list_attachments(@goal, :goal) if params[:goal][:list_attachment_ids]
          render json: { goal: goal_json(@goal) }, status: :created
        else
          render_errors @goal.errors.full_messages
        end
      end

      def update
        if @goal.update(goal_params.except(:tag_names, :goal_content_ids, :list_attachment_ids))
          assign_tags(@goal, goal_params[:tag_names]) if goal_params.key?(:tag_names)
          @goal.goal_content_ids = goal_params[:goal_content_ids] if goal_params.key?(:goal_content_ids)
          sync_list_attachments(@goal, :goal) if params[:goal][:list_attachment_ids]
          render json: { goal: goal_json(@goal) }
        else
          render_errors @goal.errors.full_messages
        end
      end

      def destroy
        @goal.destroy
        render_success({ message: 'Goal deleted.' })
      end

      def increment
        @goal.increment_count!
        render json: goal_json(@goal)
      end

      def decrement
        @goal.decrement_count!
        render json: goal_json(@goal)
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
          checklist_items: goal.checklist_items.ordered.map { |item| checklist_item_json(item) },
          list_attachments: goal.list_attachments.includes(list: [:category, :checklist_items]).map { |la|
            list_attachment_json(la)
          }
        )
      end
    end
  end
end
