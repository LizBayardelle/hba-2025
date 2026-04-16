import React from 'react';
import BeaverLogo from './shared/BeaverLogo';

export default function SetupStepSidebar({ steps, currentStep, completedSteps }) {
  return (
    <div className="p-6 sticky top-0">
      <div className="flex items-center gap-2.5 mb-8">
        <BeaverLogo size={28} />
        <span className="v2-h2" style={{ color: 'var(--ink)' }}>Setup</span>
      </div>

      <nav className="space-y-1">
        {steps.map((step) => {
          const isCurrent = step.number === currentStep;
          const isCompleted = completedSteps.has(step.number);

          return (
            <div
              key={step.number}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors"
              style={{
                background: isCurrent ? 'var(--hover-tint-strong)' : 'transparent',
              }}
            >
              {/* Step indicator */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium transition-colors"
                style={{
                  background: isCurrent
                    ? 'var(--ink)'
                    : isCompleted
                      ? 'var(--ink-tertiary)'
                      : 'var(--border)',
                  color: isCurrent || isCompleted ? 'var(--surface)' : 'var(--ink-faint)',
                }}
              >
                {isCompleted ? (
                  <i className="fa-solid fa-check text-[10px]"></i>
                ) : (
                  step.number
                )}
              </div>

              {/* Label */}
              <span
                className="v2-small font-medium"
                style={{
                  color: isCurrent
                    ? 'var(--ink)'
                    : isCompleted
                      ? 'var(--ink-secondary)'
                      : 'var(--ink-faint)',
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
