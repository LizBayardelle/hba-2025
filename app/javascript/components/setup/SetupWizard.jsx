import React, { useState, useCallback } from 'react';
import SetupStepSidebar from './SetupStepSidebar';
import SetupPreview from './SetupPreview';
import BasicsStep from './steps/BasicsStep';
import CategoriesStep from './steps/CategoriesStep';
import ImportanceLevelsStep from './steps/ImportanceLevelsStep';
import TimeBlocksStep from './steps/TimeBlocksStep';
import GoogleCalendarStep from './steps/GoogleCalendarStep';
import ProjectsStep from './steps/ProjectsStep';
import DashboardLayoutStep from './steps/DashboardLayoutStep';
import OrientationStep from './steps/OrientationStep';

const STEPS = [
  { number: 1, label: 'Basics', icon: 'fa-palette' },
  { number: 2, label: 'Categories', icon: 'fa-tags' },
  { number: 3, label: 'Importance', icon: 'fa-fire' },
  { number: 4, label: 'Time Blocks', icon: 'fa-clock' },
  { number: 5, label: 'Calendar', icon: 'fa-calendar' },
  { number: 6, label: 'Projects', icon: 'fa-briefcase' },
  { number: 7, label: 'Dashboard', icon: 'fa-grip' },
  { number: 8, label: 'Finish', icon: 'fa-rocket' },
];

export default function SetupWizard({ initialSettings, initialStep, googleConnectUrl }) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState(() => {
    const set = new Set();
    for (let i = 1; i < initialStep; i++) set.add(i);
    return set;
  });
  const [settings, setSettings] = useState(initialSettings);
  const [showPreview, setShowPreview] = useState(false);

  const goNext = useCallback(() => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    const next = Math.min(currentStep + 1, STEPS.length);
    setCurrentStep(next);
    window.history.replaceState(null, '', `/setup?step=${next}`);
  }, [currentStep]);

  const goBack = useCallback(() => {
    const prev = Math.max(currentStep - 1, 1);
    setCurrentStep(prev);
    window.history.replaceState(null, '', `/setup?step=${prev}`);
  }, [currentStep]);

  const updateSettings = useCallback((updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const stepProps = {
    settings,
    updateSettings,
    goNext,
    goBack,
    googleConnectUrl,
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <BasicsStep {...stepProps} />;
      case 2: return <CategoriesStep {...stepProps} />;
      case 3: return <ImportanceLevelsStep {...stepProps} />;
      case 4: return <TimeBlocksStep {...stepProps} />;
      case 5: return <GoogleCalendarStep {...stepProps} />;
      case 6: return <ProjectsStep {...stepProps} />;
      case 7: return <DashboardLayoutStep {...stepProps} />;
      case 8: return <OrientationStep {...stepProps} />;
      default: return <BasicsStep {...stepProps} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: 'var(--bg)' }}>
      {/* Step Sidebar - desktop */}
      <div className="hidden md:block w-[220px] flex-shrink-0 border-r" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <SetupStepSidebar
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
        />
      </div>

      {/* Mobile progress bar */}
      <div className="md:hidden px-4 pt-4 pb-2" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="v2-small" style={{ color: 'var(--ink-tertiary)' }}>Step {currentStep} of {STEPS.length}</span>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="v2-btn-sm v2-btn-ghost text-xs"
            style={{ color: 'var(--ink-secondary)' }}
          >
            <i className={`fa-solid ${showPreview ? 'fa-eye-slash' : 'fa-eye'} mr-1`}></i>
            Preview
          </button>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{
                background: step.number === currentStep
                  ? 'var(--ink)'
                  : completedSteps.has(step.number)
                    ? 'var(--ink-tertiary)'
                    : 'var(--border)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Step content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-10">
            {renderStep()}
          </div>
        </div>

        {/* Preview panel - desktop always visible, mobile collapsible */}
        <div className={`${showPreview ? 'block' : 'hidden'} md:block w-full md:w-[320px] flex-shrink-0 border-t md:border-t-0 md:border-l overflow-y-auto`}
             style={{ borderColor: 'var(--border)', background: 'var(--hover-tint)' }}>
          <SetupPreview currentStep={currentStep} settings={settings} />
        </div>
      </div>
    </div>
  );
}
