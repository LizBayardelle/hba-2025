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

  def events_for_date(date, use_cache: true)
    return [] unless client
    return [] if @user.google_calendar_id.blank?

    # Check cache if enabled
    if use_cache && cache_valid_for_date?(date)
      return cached_events_for_date(date)
    end

    # Fetch fresh data from Google
    events = fetch_events_from_google(date)

    # Update cache
    update_cache_for_date(date, events)

    events
  end

  def refresh_events_for_date(date)
    events_for_date(date, use_cache: false)
  end

  def cache_valid_for_date?(date)
    return false unless @user.calendar_events_cached_at
    return false unless @user.calendar_events_cache

    # Cache is valid for 15 minutes
    cache_age = Time.current - @user.calendar_events_cached_at
    cache_age < 15.minutes
  end

  def cached_events_for_date(date)
    cache = @user.calendar_events_cache || {}
    date_key = date.to_s

    events = cache[date_key] || []

    # Parse dates back from strings
    events.map do |event|
      event.symbolize_keys.tap do |e|
        e[:start_time] = parse_cached_time(e[:start_time]) if e[:start_time]
        e[:end_time] = parse_cached_time(e[:end_time]) if e[:end_time]
      end
    end
  end

  def update_cache_for_date(date, events)
    cache = @user.calendar_events_cache || {}
    date_key = date.to_s

    # Store events with serialized times
    serialized_events = events.map do |event|
      event.merge(
        start_time: event[:start_time]&.iso8601,
        end_time: event[:end_time]&.iso8601
      )
    end

    cache[date_key] = serialized_events

    # Keep only last 7 days of cache to prevent bloat
    cache = cache.select { |k, _| Date.parse(k) >= 7.days.ago }

    @user.update_columns(
      calendar_events_cache: cache,
      calendar_events_cached_at: Time.current
    )
  end

  def fetch_events_from_google(date)
    # Convert date to RFC3339 format with timezone
    time_min = date.beginning_of_day.rfc3339
    time_max = date.end_of_day.rfc3339

    # Get calendar names for reference
    calendar_names = {}
    calendars.each do |cal|
      calendar_names[cal[:id]] = cal[:name]
    end

    all_events = []

    # Fetch events from all selected calendars
    @user.google_calendar_id.each do |calendar_id|
      begin
        result = client.list_events(
          calendar_id,
          time_min: time_min,
          time_max: time_max,
          single_events: true,
          order_by: 'startTime'
        )

        calendar_events = result.items.map do |event|
          {
            id: event.id,
            summary: event.summary,
            description: event.description,
            start_time: parse_event_time(event.start),
            end_time: parse_event_time(event.end),
            location: event.location,
            all_day: event.start.date.present?,
            calendar_id: calendar_id,
            calendar_name: calendar_names[calendar_id] || 'Calendar'
          }
        end

        all_events.concat(calendar_events)
      rescue Google::Apis::Error => e
        Rails.logger.error("Error fetching events from calendar #{calendar_id}: #{e.message}")
      end
    end

    # Sort all events by start time
    all_events.sort_by { |event| event[:start_time] || Date.today }
  rescue Google::Apis::Error => e
    Rails.logger.error("Error fetching events: #{e.message}")
    []
  end

  def parse_cached_time(time_string)
    return nil unless time_string

    begin
      Time.zone.parse(time_string)
    rescue
      Date.parse(time_string)
    end
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
