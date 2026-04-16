import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi, settingsApi, projectsApi } from '../../utils/api';

export default function SetupPreview({ currentStep, settings }) {
  const { data: categories = [] } = useQuery({
    queryKey: ['setup-categories'],
    queryFn: categoriesApi.fetchAll,
    staleTime: 5000,
  });

  const { data: importanceLevels = [] } = useQuery({
    queryKey: ['setup-importance-levels'],
    queryFn: settingsApi.fetchImportanceLevels,
    staleTime: 5000,
  });

  const { data: timeBlocks = [] } = useQuery({
    queryKey: ['setup-time-blocks'],
    queryFn: settingsApi.fetchTimeBlocks,
    staleTime: 5000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['setup-projects'],
    queryFn: projectsApi.fetchAll,
    staleTime: 5000,
  });

  const Section = ({ title, icon, active, children }) => (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <i className={`fa-solid ${icon} text-xs`} style={{ color: active ? 'var(--ink)' : 'var(--ink-faint)' }}></i>
        <span className="v2-caption font-semibold uppercase tracking-wider" style={{ color: active ? 'var(--ink)' : 'var(--ink-faint)' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );

  const EmptyHint = ({ text }) => (
    <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>{text}</span>
  );

  return (
    <div className="p-5 sticky top-0">
      <div className="mb-5">
        <span className="v2-caption font-semibold uppercase tracking-wider" style={{ color: 'var(--ink-tertiary)' }}>
          Your Setup
        </span>
      </div>

      {/* Theme */}
      <Section title="Theme" icon="fa-palette" active={currentStep === 1}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md border" style={{
            borderColor: 'var(--border)',
            background: settings.theme === 'dark' ? '#1a1a2e' : settings.theme === 'white' ? '#ffffff' : '#FAF8F5',
          }} />
          <span className="v2-small capitalize" style={{ color: 'var(--ink-secondary)' }}>{settings.theme}</span>
        </div>
      </Section>

      {/* Preferences */}
      <Section title="Preferences" icon="fa-sliders" active={currentStep === 1}>
        <div className="space-y-1">
          <div className="v2-caption" style={{ color: 'var(--ink-secondary)' }}>
            {settings.date_format} &middot; {settings.time_format}
          </div>
          <div className="v2-caption" style={{ color: 'var(--ink-secondary)' }}>
            Week starts {settings.week_starts_on}
          </div>
        </div>
      </Section>

      {/* Categories */}
      <Section title="Categories" icon="fa-tags" active={currentStep === 2}>
        {categories.length > 0 ? (
          <div className="space-y-1.5">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: cat.color }}
                >
                  <i className={`fa-solid ${cat.icon} text-white`} style={{ fontSize: '9px' }}></i>
                </div>
                <span className="v2-small" style={{ color: 'var(--ink-secondary)' }}>{cat.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyHint text="No categories yet" />
        )}
      </Section>

      {/* Importance Levels */}
      <Section title="Importance" icon="fa-fire" active={currentStep === 3}>
        {importanceLevels.length > 0 ? (
          <div className="space-y-1.5">
            {importanceLevels.map((level) => (
              <div key={level.id} className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: level.color }}
                >
                  <i className={`fa-solid ${level.icon} text-white`} style={{ fontSize: '9px' }}></i>
                </div>
                <span className="v2-small" style={{ color: 'var(--ink-secondary)' }}>{level.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyHint text="Default levels" />
        )}
      </Section>

      {/* Time Blocks */}
      <Section title="Time Blocks" icon="fa-clock" active={currentStep === 4}>
        {timeBlocks.length > 0 ? (
          <div className="space-y-1.5">
            {timeBlocks.map((block) => (
              <div key={block.id} className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: block.color }}
                >
                  <i className={`fa-solid ${block.icon} text-white`} style={{ fontSize: '9px' }}></i>
                </div>
                <span className="v2-small" style={{ color: 'var(--ink-secondary)' }}>{block.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyHint text="Default blocks" />
        )}
      </Section>

      {/* Google Calendar */}
      <Section title="Calendar" icon="fa-calendar" active={currentStep === 5}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${settings.google_sync_enabled ? 'bg-green-500' : ''}`}
               style={{ background: settings.google_sync_enabled ? undefined : 'var(--ink-faint)' }} />
          <span className="v2-small" style={{ color: 'var(--ink-secondary)' }}>
            {settings.google_sync_enabled ? 'Connected' : 'Not connected'}
          </span>
        </div>
      </Section>

      {/* Projects */}
      <Section title="Projects" icon="fa-briefcase" active={currentStep === 6}>
        {projects.length > 0 ? (
          <div className="space-y-1.5">
            {projects.map((project) => (
              <div key={project.id} className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: project.color }}
                >
                  <i className={`fa-solid ${project.icon} text-white`} style={{ fontSize: '9px' }}></i>
                </div>
                <span className="v2-small" style={{ color: 'var(--ink-secondary)' }}>{project.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyHint text="No projects yet" />
        )}
      </Section>
    </div>
  );
}
