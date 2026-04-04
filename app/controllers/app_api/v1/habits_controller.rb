module AppApi
  module V1
    class HabitsController < BaseController
      include AppApi::ListAttachable
      include AppApi::ChecklistRenderable

      before_action :set_habit, only: [:show, :update, :destroy]

      def index
        @view_mode = params[:view] || 'category'
        @selected_date = params[:date] ? Date.parse(params[:date]) : Time.zone.today

        habits = current_user.habits.active
          .includes(:category, :habit_completions, :tags, :documents, :importance_level,
                    :time_block, :checklist_items, list_attachments: { list: [:category, :checklist_items] })

        completions = HabitCompletion.where(
          habit_id: habits.pluck(:id),
          completed_at: @selected_date
        ).group(:habit_id).sum(:count)

        streaks = {}
        habits.each do |habit|
          current_streak = 0
          date = @selected_date

          loop do
            completion = HabitCompletion.find_by(habit_id: habit.id, completed_at: date)
            if completion && completion.count >= habit.target_count
              current_streak += 1
              date -= 1.day
            else
              break
            end
          end

          if current_streak == 0
            yesterday = @selected_date - 1.day
            yesterday_completion = HabitCompletion.find_by(habit_id: habit.id, completed_at: yesterday)
            if yesterday_completion && yesterday_completion.count >= habit.target_count
              streak_from_yesterday = 0
              date = yesterday
              loop do
                completion = HabitCompletion.find_by(habit_id: habit.id, completed_at: date)
                if completion && completion.count >= habit.target_count
                  streak_from_yesterday += 1
                  date -= 1.day
                else
                  break
                end
              end
              streaks[habit.id] = streak_from_yesterday
            else
              streaks[habit.id] = 0
            end
          else
            streaks[habit.id] = current_streak
          end
        end

        render json: {
          habits: habits.map { |habit|
            habit_json(habit, completions, streaks)
          }
        }
      end

      def show
        render json: habit_json(@habit)
      end

      def create
        @habit = current_user.habits.build(habit_params)

        if @habit.save
          sync_list_attachments(@habit, :habit) if params[:habit][:list_attachment_ids]
          render json: { habit: habit_json(@habit) }, status: :created
        else
          render_errors @habit.errors.full_messages
        end
      end

      def update
        if @habit.update(habit_params)
          sync_list_attachments(@habit, :habit) if params[:habit][:list_attachment_ids]
          @habit.reload
          render json: { habit: habit_json(@habit) }
        else
          render_errors @habit.errors.full_messages
        end
      end

      def destroy
        @habit.destroy
        render_success({ message: 'Habit deleted.' })
      end

      private

      def set_habit
        @habit = current_user.habits.find(params[:id])
      end

      def habit_params
        permitted = params.require(:habit).permit(
          :name, :description, :target_count, :frequency_type, :time_of_day,
          :time_block_id, :importance, :importance_level_id, :category_id,
          :reminder_enabled, :start_date, :positive, :difficulty, :schedule_mode,
          tag_names: [], habit_content_ids: []
        )

        if params[:habit].key?(:schedule_config)
          config = params[:habit][:schedule_config]
          if config.is_a?(ActionController::Parameters)
            permitted[:schedule_config] = config.permit(:interval_days, :interval_unit, :anchor_date, days_of_week: []).to_h
          else
            permitted[:schedule_config] = {}
          end
        end

        permitted
      end

      def habit_json(habit, completions = nil, streaks = nil)
        today_count = if completions
          completions[habit.id] || 0
        else
          habit.completions_for_date(Time.zone.today)
        end

        current_streak = if streaks
          streaks[habit.id] || 0
        else
          habit.current_streak
        end

        habit.as_json(
          only: [:id, :name, :target_count, :frequency_type, :time_of_day, :importance,
                 :importance_level_id, :category_id, :time_block_id, :schedule_mode, :schedule_config]
        ).merge(
          today_count: today_count,
          current_streak: current_streak,
          category_name: habit.category&.name,
          category_icon: habit.category&.icon,
          category_color: habit.category&.color,
          time_block_name: habit.time_block&.name,
          time_block_icon: habit.time_block&.icon,
          time_block_color: habit.time_block&.color,
          time_block_rank: habit.time_block&.rank,
          importance_level: habit.importance_level ? {
            id: habit.importance_level.id,
            name: habit.importance_level.name,
            icon: habit.importance_level.icon,
            color: habit.importance_level.color,
            rank: habit.importance_level.rank
          } : nil,
          tags: habit.tags.map { |t| { id: t.id, name: t.name } },
          documents: habit.documents.map { |c| { id: c.id, title: c.title, content_type: c.content_type } },
          health: habit.health,
          is_due_today: habit.due_today?,
          schedule_description: habit.schedule_description,
          checklist_items: habit.checklist_items.ordered.map { |item| checklist_item_json(item) },
          list_attachments: habit.list_attachments.includes(list: [:category, :checklist_items]).map { |la|
            list_attachment_json(la)
          }
        )
      end
    end
  end
end
