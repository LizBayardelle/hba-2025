module AppApi
  module V1
    class GoogleCalendarController < BaseController
      def calendars
        service = GoogleCalendarService.new(current_user)
        calendars = service.calendars
        render json: { calendars: calendars }
      end

      def select_calendar
        calendar_ids = params[:calendar_ids] || []

        if current_user.update(google_calendar_id: calendar_ids)
          render_success message: 'Calendar selected.'
        else
          render_errors current_user.errors.full_messages
        end
      end

      def disconnect
        current_user.update(
          google_refresh_token: nil,
          google_calendar_id: [],
          google_sync_enabled: false
        )
        render_success message: 'Google Calendar disconnected.'
      end

      def refresh
        date = params[:date].present? ? Date.parse(params[:date]) : Time.zone.today

        service = GoogleCalendarService.new(current_user)
        service.refresh_events_for_date(date)

        render_success message: 'Calendar refreshed.'
      end
    end
  end
end
