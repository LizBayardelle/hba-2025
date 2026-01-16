require 'google/apis/calendar_v3'
require 'googleauth'

class GoogleCalendarService
  SCOPE = Google::Apis::CalendarV3::AUTH_CALENDAR_READONLY

  def initialize(user)
    @user = user
  end

  def client
    return nil unless @user.google_refresh_token

    client = Google::Apis::CalendarV3::CalendarService.new
    client.authorization = authorization
    client
  rescue Google::Apis::AuthorizationError => e
    Rails.logger.error("Google Calendar authorization error: #{e.message}")
    nil
  end

  def calendars
    return [] unless client

    result = client.list_calendar_lists
    result.items.map do |calendar|
      {
        id: calendar.id,
        name: calendar.summary,
        primary: calendar.primary
      }
    end
  rescue Google::Apis::Error => e
    Rails.logger.error("Error fetching calendars: #{e.message}")
    []
  end

  def events_for_date(date)
    return [] unless client
    return [] unless @user.google_calendar_id

    # Convert date to RFC3339 format with timezone
    time_min = date.beginning_of_day.rfc3339
    time_max = date.end_of_day.rfc3339

    result = client.list_events(
      @user.google_calendar_id,
      time_min: time_min,
      time_max: time_max,
      single_events: true,
      order_by: 'startTime'
    )

    result.items.map do |event|
      {
        id: event.id,
        summary: event.summary,
        description: event.description,
        start_time: parse_event_time(event.start),
        end_time: parse_event_time(event.end),
        location: event.location,
        all_day: event.start.date.present?
      }
    end
  rescue Google::Apis::Error => e
    Rails.logger.error("Error fetching events: #{e.message}")
    []
  end

  private

  def authorization
    credentials = {
      client_id: ENV['GOOGLE_CLIENT_ID'],
      client_secret: ENV['GOOGLE_CLIENT_SECRET'],
      refresh_token: @user.google_refresh_token,
      scope: SCOPE
    }

    Google::Auth::UserRefreshCredentials.new(credentials)
  end

  def parse_event_time(time_object)
    if time_object.date_time
      time_object.date_time
    elsif time_object.date
      Date.parse(time_object.date.to_s)
    end
  end
end
