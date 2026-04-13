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
            :analytics_display
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

      private

      def settings_params
        params.require(:user).permit(
          :timezone, :week_starts_on, :date_format, :time_format,
          :email_reminders, :push_notifications, :theme, :default_view,
          :root_location, :default_habits_grouping, :default_tasks_grouping,
          :default_lists_grouping, :default_documents_grouping,
          :analytics_display
        )
      end
    end
  end
end
