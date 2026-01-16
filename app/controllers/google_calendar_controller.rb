class GoogleCalendarController < ApplicationController

  def connect
    # Generate OAuth URL
    client_id = ENV['GOOGLE_CLIENT_ID']
    redirect_uri = google_calendar_callback_url
    scope = 'https://www.googleapis.com/auth/calendar.readonly'

    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" \
               "client_id=#{client_id}&" \
               "redirect_uri=#{CGI.escape(redirect_uri)}&" \
               "response_type=code&" \
               "scope=#{CGI.escape(scope)}&" \
               "access_type=offline&" \
               "prompt=consent&" \
               "state=#{session[:google_oauth_state] = SecureRandom.hex(32)}"

    redirect_to auth_url, allow_other_host: true
  end

  def callback
    # Verify state to prevent CSRF
    unless params[:state] == session[:google_oauth_state]
      redirect_to settings_path, alert: 'Invalid OAuth state'
      return
    end

    # Exchange code for tokens
    tokens = exchange_code_for_tokens(params[:code])

    if tokens && tokens['refresh_token']
      current_user.update(
        google_refresh_token: tokens['refresh_token'],
        google_sync_enabled: true
      )
      redirect_to settings_path, notice: 'Google Calendar connected successfully!'
    else
      redirect_to settings_path, alert: 'Failed to connect Google Calendar'
    end
  rescue StandardError => e
    Rails.logger.error("Google Calendar callback error: #{e.message}")
    redirect_to settings_path, alert: 'Error connecting to Google Calendar'
  end

  def calendars
    service = GoogleCalendarService.new(current_user)
    calendars = service.calendars

    render json: { calendars: calendars }
  end

  def select_calendar
    calendar_ids = params[:calendar_ids] || []

    if current_user.update(google_calendar_id: calendar_ids)
      render json: { success: true }
    else
      render json: { success: false, errors: current_user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def disconnect
    current_user.update(
      google_refresh_token: nil,
      google_calendar_id: [],
      google_sync_enabled: false
    )
    redirect_to settings_path, notice: 'Google Calendar disconnected'
  end

  private

  def exchange_code_for_tokens(code)
    uri = URI('https://oauth2.googleapis.com/token')
    response = Net::HTTP.post_form(uri, {
      code: code,
      client_id: ENV['GOOGLE_CLIENT_ID'],
      client_secret: ENV['GOOGLE_CLIENT_SECRET'],
      redirect_uri: google_calendar_callback_url,
      grant_type: 'authorization_code'
    })

    JSON.parse(response.body) if response.is_a?(Net::HTTPSuccess)
  end
end
