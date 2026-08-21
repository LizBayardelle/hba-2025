module AppApi
  module V1
    class SettingsController < BaseController
      def show
        render json: {
          user: current_user.as_json(only: [
            :id, :email, :timezone, :week_starts_on, :date_format, :time_format,
            :email_reminders, :push_notifications, :theme, :default_view,
            :root_location, :default_habits_grouping, :default_tasks_grouping,
            :default_lists_grouping, :default_documents_grouping, :dashboard_layout,
            :analytics_display, :projects_view, :projects_expand_all
          ]),
          importance_levels: current_user.importance_levels.ordered,
          time_blocks: current_user.time_blocks.ordered
        }
      end

      def update
        update_params = settings_params.to_h

        if params[:user][:dashboard_layout].present?
          update_params[:dashboard_layout] = params[:user][:dashboard_layout].map do |item|
            {
              'block' => item['block'],
              'column' => item['column'],
              'position' => item['position'].to_i,
              'visible' => item['visible']
            }
          end
        end

        if current_user.update(update_params)
          render_success message: 'Settings updated.'
        else
          render_errors current_user.errors.full_messages
        end
      end

      # Bulk-archive whichever scopes the user selected. Mirrors
      # SettingsController#reset — archives only, so everything can be restored.
      def reset
        scopes = Array(params[:scopes]).map(&:to_s) & ::SettingsController::RESETTABLE_SCOPES
        now = Time.current
        archived = {}

        if scopes.include?('habits')
          archived['habits'] = current_user.habits.where(archived_at: nil).update_all(archived_at: now)
        end

        if scopes.include?('tasks')
          archived['tasks'] = current_user.tasks.where(archived_at: nil).update_all(archived_at: now)
        end

        if scopes.include?('goals')
          archived['goals'] = current_user.goals.where(archived_at: nil).update_all(archived_at: now)
        end

        if scopes.include?('projects')
          archived['projects'] = current_user.projects.where(archived: false).update_all(archived: true)
        end

        if scopes.include?('daily_prep')
          archived['daily report questions'] = current_user.prep_questions.where(archived_at: nil).update_all(archived_at: now)
        end

        message =
          if archived.empty?
            'Nothing selected — nothing was archived.'
          else
            'Archived ' + archived.map { |label, count| "#{count} #{label}" }.to_sentence + '.'
          end

        render_success({ archived: archived }, message: message)
      end

      private

      def settings_params
        params.require(:user).permit(
          :timezone, :week_starts_on, :date_format, :time_format,
          :email_reminders, :push_notifications, :theme, :default_view,
          :root_location, :default_habits_grouping, :default_tasks_grouping,
          :default_lists_grouping, :default_documents_grouping,
          :analytics_display, :projects_view, :projects_expand_all
        )
      end
    end
  end
end
