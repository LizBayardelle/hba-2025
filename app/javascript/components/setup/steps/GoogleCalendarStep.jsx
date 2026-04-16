import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { googleCalendarApi } from '../../../utils/api';

export default function GoogleCalendarStep({ settings, updateSettings, goNext, goBack, googleConnectUrl }) {
  const isConnected = settings.google_sync_enabled;
  const [selectedCalendars, setSelectedCalendars] = useState(settings.google_calendar_id || []);
  const [saving, setSaving] = useState(false);

  const { data: calendarData, isLoading: loadingCalendars } = useQuery({
    queryKey: ['setup-google-calendars'],
    queryFn: googleCalendarApi.fetchCalendars,
    enabled: isConnected,
  });
  const calendars = calendarData?.calendars || [];

  const handleConnect = () => {
    // Full page redirect to Google OAuth — session stores return URL
    window.location.href = googleConnectUrl;
  };

  const toggleCalendar = async (calendarId) => {
    const updated = selectedCalendars.includes(calendarId)
      ? selectedCalendars.filter(id => id !== calendarId)
      : [...selectedCalendars, calendarId];

    setSelectedCalendars(updated);
    setSaving(true);
    try {
      await googleCalendarApi.selectCalendars(updated);
      updateSettings({ google_calendar_id: updated });
    } catch (e) {}
    setSaving(false);
  };

  return (
    <div>
      <h1 className="v2-h1 mb-2" style={{ color: 'var(--ink)' }}>Google Calendar</h1>
      <p className="v2-body mb-8" style={{ color: 'var(--ink-secondary)' }}>
        Connect your Google Calendar to see your events right on your dashboard.
        We only request read-only access — your calendar data stays private.
      </p>

      {isConnected ? (
        <>
          {/* Connected state */}
          <div
            className="v2-card p-5 mb-6"
            style={{ borderColor: '#7CB342', background: '#7CB34210' }}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#7CB342' }}>
                <i className="fa-solid fa-check text-white text-sm"></i>
              </div>
              <div>
                <span className="v2-h3" style={{ color: 'var(--ink)' }}>Connected to Google Calendar</span>
                <p className="v2-small" style={{ color: 'var(--ink-tertiary)' }}>
                  Your calendar events will appear on your dashboard
                </p>
              </div>
            </div>
          </div>

          {/* Calendar selection */}
          <div className="mb-8">
            <h2 className="v2-h3 mb-3" style={{ color: 'var(--ink)' }}>Select calendars to display</h2>
            {loadingCalendars ? (
              <div className="py-4 text-center">
                <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--ink-tertiary)' }}></i>
              </div>
            ) : (
              <div className="space-y-2">
                {calendars.map((cal) => (
                  <label
                    key={cal.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCalendars.includes(cal.id)}
                      onChange={() => toggleCalendar(cal.id)}
                      className="rounded"
                    />
                    <span className="v2-body" style={{ color: 'var(--ink)' }}>
                      {cal.name}
                      {cal.primary && (
                        <span className="v2-caption ml-2" style={{ color: 'var(--ink-faint)' }}>(primary)</span>
                      )}
                    </span>
                    {saving && <i className="fa-solid fa-spinner fa-spin text-xs ml-auto" style={{ color: 'var(--ink-tertiary)' }}></i>}
                  </label>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Disconnected state */
        <div className="text-center py-8 mb-8">
          <div className="mb-6">
            <i className="fa-brands fa-google text-5xl" style={{ color: 'var(--ink-faint)' }}></i>
          </div>
          <h2 className="v2-h2 mb-2" style={{ color: 'var(--ink)' }}>Connect Your Google Calendar</h2>
          <p className="v2-body mb-6 max-w-md mx-auto" style={{ color: 'var(--ink-secondary)' }}>
            View your calendar events directly on your dashboard for better planning.
          </p>
          <button
            onClick={handleConnect}
            className="v2-btn v2-btn-primary text-sm inline-flex items-center gap-2"
          >
            <i className="fa-brands fa-google"></i>
            Connect Google Calendar
          </button>
          <p className="v2-caption mt-3" style={{ color: 'var(--ink-faint)' }}>
            We'll only request read-only access to your calendar events
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button onClick={goBack} className="v2-btn v2-btn-ghost">
          <i className="fa-solid fa-arrow-left mr-2 text-xs"></i>Back
        </button>
        <div className="flex gap-2">
          {!isConnected && (
            <button onClick={goNext} className="v2-btn v2-btn-ghost" style={{ color: 'var(--ink-tertiary)' }}>
              Skip
            </button>
          )}
          <button onClick={goNext} className="v2-btn v2-btn-primary">
            Next: Projects
            <i className="fa-solid fa-arrow-right ml-2 text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
