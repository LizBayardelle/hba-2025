import React, { useState, useEffect, useRef, useCallback } from 'react';
import { settingsApi } from '../../../utils/api';
import BeaverLogo from '../shared/BeaverLogo';

const THEMES = [
  { value: 'cream', label: 'Cream', bg: '#FAF8F5', surface: '#FFFFFF', ink: '#2D2B29', border: '#E8E2D9' },
  { value: 'white', label: 'White', bg: '#FFFFFF', surface: '#FFFFFF', ink: '#1a1a1a', border: '#E5E7EB' },
  { value: 'dark', label: 'Dark', bg: '#1a1a2e', surface: '#25253e', ink: '#e4e4e7', border: '#3a3a5c' },
];

const US_TIMEZONES = [
  'America/Adak', 'Hawaii', 'Alaska', 'America/Anchorage', 'America/Metlakatla',
  'America/Nome', 'America/Sitka', 'America/Yakutat', 'Pacific Time (US & Canada)',
  'America/Boise', 'Arizona', 'Mountain Time (US & Canada)', 'America/Indiana/Knox',
  'America/Indiana/Tell_City', 'America/Menominee', 'America/North_Dakota/Beulah',
  'America/North_Dakota/Center', 'America/North_Dakota/New_Salem', 'Central Time (US & Canada)',
  'America/Detroit', 'America/Indiana/Marengo', 'America/Indiana/Petersburg',
  'America/Indiana/Vevay', 'America/Indiana/Vincennes', 'America/Indiana/Winamac',
  'America/Kentucky/Louisville', 'America/Kentucky/Monticello', 'Eastern Time (US & Canada)',
  'Indiana (East)',
];

const BROWSER_TO_RAILS_TZ = {
  'America/Los_Angeles': 'Pacific Time (US & Canada)',
  'America/Denver': 'Mountain Time (US & Canada)',
  'America/Chicago': 'Central Time (US & Canada)',
  'America/New_York': 'Eastern Time (US & Canada)',
  'America/Phoenix': 'Arizona',
  'Pacific/Honolulu': 'Hawaii',
  'America/Anchorage': 'Alaska',
  'America/Adak': 'America/Adak',
  'America/Boise': 'America/Boise',
  'America/Detroit': 'America/Detroit',
  'America/Indianapolis': 'Indiana (East)',
  'America/Indiana/Indianapolis': 'Indiana (East)',
};

export default function BasicsStep({ settings, updateSettings, goNext }) {
  const [form, setForm] = useState({
    theme: settings.theme || 'cream',
    timezone: settings.timezone || 'Pacific Time (US & Canada)',
    date_format: settings.date_format || 'MM/DD/YYYY',
    time_format: settings.time_format || '12-hour',
    week_starts_on: settings.week_starts_on || 'monday',
  });
  const saveTimeout = useRef(null);
  const hasAutoDetected = useRef(false);

  // Auto-detect timezone on first visit
  useEffect(() => {
    if (hasAutoDetected.current) return;
    hasAutoDetected.current = true;

    try {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const railsTz = BROWSER_TO_RAILS_TZ[browserTz];
      if (railsTz && railsTz !== form.timezone) {
        handleChange('timezone', railsTz);
      }
    } catch (e) {
      // Ignore — keep default
    }
  }, []);

  const saveSettings = useCallback((updates) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      settingsApi.update(updates).catch(() => {});
    }, 500);
  }, []);

  const handleChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    updateSettings({ [field]: value });
    saveSettings({ [field]: value });

    // Apply theme immediately
    if (field === 'theme') {
      document.documentElement.setAttribute('data-theme', value);
    }
  }, [updateSettings, saveSettings]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <BeaverLogo size={36} />
        <h1 className="v2-h1" style={{ color: 'var(--ink)' }}>Welcome to Habit Beaver!</h1>
      </div>
      <p className="v2-body mb-8" style={{ color: 'var(--ink-secondary)' }}>
        Let's set up the basics. You can always change these later in Settings.
      </p>

      {/* Theme Picker */}
      <div className="mb-8">
        <label className="v2-h3 block mb-3" style={{ color: 'var(--ink)' }}>
          <i className="fa-solid fa-palette mr-2 text-sm" style={{ color: 'var(--ink-tertiary)' }}></i>
          Theme
        </label>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              onClick={() => handleChange('theme', theme.value)}
              className="rounded-xl border-2 p-4 text-left transition-all"
              style={{
                borderColor: form.theme === theme.value ? 'var(--ink)' : 'var(--border)',
                background: theme.bg,
              }}
            >
              {/* Mini preview */}
              <div className="rounded-lg p-3 mb-2" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                <div className="h-2 w-3/4 rounded mb-1.5" style={{ background: theme.ink, opacity: 0.7 }}></div>
                <div className="h-1.5 w-1/2 rounded" style={{ background: theme.ink, opacity: 0.3 }}></div>
              </div>
              <span className="text-sm font-medium" style={{ color: theme.ink }}>{theme.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Timezone */}
      <div className="mb-6">
        <label className="v2-h3 block mb-2" style={{ color: 'var(--ink)' }}>
          <i className="fa-solid fa-globe mr-2 text-sm" style={{ color: 'var(--ink-tertiary)' }}></i>
          Time Zone
        </label>
        <select
          value={form.timezone}
          onChange={(e) => handleChange('timezone', e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border text-sm"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
        >
          {US_TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      {/* Date & Time Format - side by side */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="v2-h3 block mb-2" style={{ color: 'var(--ink)' }}>
            <i className="fa-solid fa-calendar mr-2 text-sm" style={{ color: 'var(--ink-tertiary)' }}></i>
            Date Format
          </label>
          <select
            value={form.date_format}
            onChange={(e) => handleChange('date_format', e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
        <div>
          <label className="v2-h3 block mb-2" style={{ color: 'var(--ink)' }}>
            <i className="fa-solid fa-clock mr-2 text-sm" style={{ color: 'var(--ink-tertiary)' }}></i>
            Time Format
          </label>
          <select
            value={form.time_format}
            onChange={(e) => handleChange('time_format', e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
          >
            <option value="12-hour">12-hour (3:45 PM)</option>
            <option value="24-hour">24-hour (15:45)</option>
          </select>
        </div>
      </div>

      {/* Week Starts On */}
      <div className="mb-8">
        <label className="v2-h3 block mb-2" style={{ color: 'var(--ink)' }}>
          <i className="fa-solid fa-calendar-week mr-2 text-sm" style={{ color: 'var(--ink-tertiary)' }}></i>
          Week Starts On
        </label>
        <div className="flex gap-2">
          {[
            { value: 'monday', label: 'Monday' },
            { value: 'sunday', label: 'Sunday' },
            { value: 'saturday', label: 'Saturday' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleChange('week_starts_on', option.value)}
              className="px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors"
              style={{
                borderColor: form.week_starts_on === option.value ? 'var(--ink)' : 'var(--border)',
                background: form.week_starts_on === option.value ? 'var(--hover-tint-strong)' : 'var(--surface)',
                color: 'var(--ink)',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        <button onClick={goNext} className="v2-btn v2-btn-primary">
          Next: Categories
          <i className="fa-solid fa-arrow-right ml-2 text-xs"></i>
        </button>
      </div>
    </div>
  );
}
