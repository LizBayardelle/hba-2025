module AppApi
  module V1
    class CategoriesController < BaseController
      include AppApi::ChecklistRenderable

      before_action :set_category, only: [:show, :update, :destroy]

      def index
        categories = current_user.categories.where(archived: false).order(:position, :name)

        render json: categories.map { |category|
          category.as_json(only: [:id, :name, :color, :icon, :description]).merge(
            habits: category.habits.active.includes(:time_block, :importance_level).map { |habit|
              habit.as_json(
                only: [:id, :name, :target_count, :frequency_type, :time_of_day, :importance,
                       :category_id, :time_block_id, :importance_level_id, :schedule_mode, :schedule_config],
                include: {
                  tags: { only: [:id, :name] },
                  documents: { only: [:id, :title, :content_type] },
                  time_block: { only: [:id, :name, :icon, :color, :rank] },
                  importance_level: { only: [:id, :name, :icon, :color, :rank] }
                }
              ).merge(
                today_count: habit.completions_for_date(Time.zone.today),
                current_streak: habit.current_streak,
                health: habit.health,
                is_due_today: habit.due_today?,
                schedule_description: habit.schedule_description
              )
            }
          )
        }
      end

      def show
        habits = @category.habits.where(archived_at: nil)
          .includes(:documents, :tags, :importance_level, :time_block).to_a

        habits = habits.sort_by do |habit|
          [
            habit.importance_level&.rank || 999,
            habit.time_block&.rank || 999,
            habit.name.downcase
          ]
        end

        today_completions = current_user.habit_completions
          .where(completed_at: Time.zone.today)
          .index_by(&:habit_id)

        tasks = @category.tasks.where(archived_at: nil, completed: false)
          .includes(:importance_level, :time_block, :tags, :checklist_items, list_attachments: { list: [:category, :checklist_items] })
          .order(:due_date, :name)

        documents = @category.documents.order(:title)
        lists = @category.lists.active.includes(:checklist_items).order(:name)
        notes = @category.notes.where(user: current_user, archived_at: nil).includes(:tags).order(pinned: :desc, created_at: :desc)

        render json: {
          category: @category.as_json(only: [:id, :name, :description, :color, :icon]),
          habits: habits.map { |habit|
            completion = today_completions[habit.id]
            habit.as_json(
              only: [:id, :name, :target_count, :frequency_type, :time_of_day, :importance,
                     :category_id, :importance_level_id, :time_block_id, :schedule_mode, :schedule_config],
              methods: [:current_streak],
              include: {
                tags: { only: [:id, :name] },
                importance_level: { only: [:id, :name, :icon, :color, :rank] },
                time_block: { only: [:id, :name, :icon, :color, :rank] }
              }
            ).merge(
              today_count: completion ? completion.count : 0,
              health: habit.health,
              documents: habit.documents.map { |c| { id: c.id, title: c.title, content_type: c.content_type } },
              is_due_today: habit.due_today?,
              schedule_description: habit.schedule_description
            )
          },
          tasks: tasks.map { |task|
            task.as_json(
              only: [:id, :name, :due_date, :due_time, :completed, :on_hold, :url, :location_name, :repeat_frequency, :repeat_interval],
              include: {
                importance_level: { only: [:id, :name, :icon, :color, :rank] },
                time_block: { only: [:id, :name, :icon, :color, :rank] },
                tags: { only: [:id, :name] }
              }
            ).merge(
              checklist_items: task.checklist_items.ordered.map { |item| checklist_item_json(item) },
              list_attachments: task.list_attachments.includes(list: [:category, :checklist_items]).map { |la|
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
                  checklist_items: la.list.checklist_items.ordered.map { |item| checklist_item_json(item) }
                }
              }
            )
          },
          documents: documents.map { |doc|
            doc.as_json(only: [:id, :title, :content_type]).merge(metadata: doc.metadata)
          },
          lists: lists.map { |list|
            list.as_json(only: [:id, :name]).merge(
              checklist_items: list.checklist_items.ordered.map { |item| checklist_item_json(item) },
              completed_count: list.checklist_items.where(completed: true).count,
              total_count: list.checklist_items.count
            )
          },
          notes: notes.map { |note|
            {
              id: note.id,
              title: note.title,
              body: note.body.to_s.truncate(200),
              pinned: note.pinned,
              category_id: note.category_id,
              tags: note.tags.map { |t| { id: t.id, name: t.name } },
              created_at: note.created_at,
              updated_at: note.updated_at
            }
          }
        }
      end

      def create
        @category = current_user.categories.build(category_params)

        if @category.save
          render json: { category: @category.as_json(only: [:id, :name, :color, :icon, :description]) }, status: :created
        else
          render_errors @category.errors.full_messages
        end
      end

      def update
        if @category.update(category_params)
          render json: { category: @category.as_json(only: [:id, :name, :color, :icon, :description]) }
        else
          render_errors @category.errors.full_messages
        end
      end

      def destroy
        @category.update(archived: true)
        render_success message: 'Category archived.'
      end

      private

      def set_category
        @category = current_user.categories.find(params[:id])
      end

      def category_params
        params.require(:category).permit(:name, :color, :icon, :description)
      end
    end
  end
end
