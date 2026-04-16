import React, { useState } from 'react';
import { setupApi } from '../../../utils/api';
import CheckLogo from '../shared/CheckLogo';

const FEATURES = [
  {
    icon: 'fa-gauge-high',
    title: 'Dashboard',
    description: 'Your home base — see habits, tasks, and calendar events at a glance.',
  },
  {
    icon: 'fa-repeat',
    title: 'Habits',
    description: 'Track daily habits with streaks, health scores, and flexible schedules.',
  },
  {
    icon: 'fa-list-check',
    title: 'Tasks & Goals',
    description: 'Manage to-dos with due dates, priorities, and repeating schedules.',
  },
  {
    icon: 'fa-chart-line',
    title: 'Analytics',
    description: 'See your streaks, completion rates, and trends over time.',
  },
  {
    icon: 'fa-gear',
    title: 'Settings',
    description: 'Customize everything — themes, formats, importance levels, and more.',
  },
];

export default function OrientationStep({ settings, goBack }) {
  const [completing, setCompleting] = useState(false);

  const handleFinish = async () => {
    setCompleting(true);
    try {
      const result = await setupApi.complete();
      window.location.href = result.redirect_to || '/dashboard';
    } catch (e) {
      window.location.href = '/dashboard';
    }
  };

  const firstName = settings.first_name || 'there';

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <CheckLogo size={32} />
        <h1 className="v2-h1" style={{ color: 'var(--ink)' }}>
          You're all set, {firstName}!
        </h1>
      </div>
      <p className="v2-body mb-8" style={{ color: 'var(--ink-secondary)' }}>
        Here's a quick overview of what you'll find. Don't worry about memorizing anything — you can always change things in Settings.
      </p>

      {/* Feature cards */}
      <div className="space-y-3 mb-10">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="flex items-start gap-4 px-4 py-3 rounded-lg"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'var(--hover-tint-strong)' }}
            >
              <i className={`fa-solid ${feature.icon}`} style={{ color: 'var(--ink)', fontSize: '16px' }}></i>
            </div>
            <div>
              <h3 className="v2-h3 mb-0.5" style={{ color: 'var(--ink)' }}>{feature.title}</h3>
              <p className="v2-small" style={{ color: 'var(--ink-secondary)' }}>{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center mb-6">
        <button
          onClick={handleFinish}
          disabled={completing}
          className="v2-btn v2-btn-primary text-base px-8 py-3"
        >
          {completing ? (
            <>
              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
              Setting up...
            </>
          ) : (
            <>
              Go to Dashboard
              <i className="fa-solid fa-arrow-right ml-2"></i>
            </>
          )}
        </button>
        <p className="v2-caption mt-3" style={{ color: 'var(--ink-faint)' }}>
          You can re-run this wizard anytime from Settings
        </p>
      </div>

      {/* Back button */}
      <div className="flex justify-start pt-4">
        <button onClick={goBack} className="v2-btn v2-btn-ghost">
          <i className="fa-solid fa-arrow-left mr-2 text-xs"></i>Back
        </button>
      </div>
    </div>
  );
}
