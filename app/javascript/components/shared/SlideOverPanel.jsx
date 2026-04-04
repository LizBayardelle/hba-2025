import React, { useEffect, useMemo } from 'react';
import useSwipeToDismiss from '../../hooks/useSwipeToDismiss';

const SlideOverPanel = ({ isOpen, onClose, title, children, footer, headerActions, noteTakingMode, viewportHeight }) => {
  const { translateX, isAnimating, isDismissing, handlers, reset } = useSwipeToDismiss(onClose);

  useEffect(() => { reset(); }, [isOpen, reset]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const backdropOpacity = useMemo(() => {
    if (!translateX) return 0.4;
    const progress = translateX / window.innerWidth;
    return Math.max(0, 0.4 * (1 - progress));
  }, [translateX]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 transition-opacity"
        style={{ backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        {...(noteTakingMode ? {} : handlers)}
        className={`relative w-[calc(100%-16px)] md:w-[90%] lg:w-[85%] xl:w-[80%] max-w-5xl flex flex-col ${noteTakingMode ? 'note-taking-mode' : 'h-full'}`}
        style={{
          background: 'var(--bg)',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.08)',
          animation: !isDismissing ? 'slideInRight 0.3s ease-out forwards' : undefined,
          transform: translateX ? `translateX(${translateX}px)` : undefined,
          transition: isAnimating ? 'transform 250ms ease-out' : undefined,
          borderTopLeftRadius: 'var(--panel-radius, 0px)',
          borderBottomLeftRadius: 'var(--panel-radius, 0px)',
          ...(noteTakingMode && viewportHeight ? { height: `${viewportHeight}px` } : noteTakingMode ? { height: '100%' } : {}),
        }}
      >
        {/* Drag handle pill — mobile only */}
        {!noteTakingMode && (
          <div className="md:hidden flex justify-center pt-2 pb-0">
            <div style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: 'var(--border)' }} />
          </div>
        )}

        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <div className="flex items-center gap-3">
            <h2 className="v2-h2">{title}</h2>
            {headerActions}
          </div>
          <button
            onClick={onClose}
            className="v2-btn-icon"
            title="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Content - scrollable */}
        <div className={noteTakingMode ? 'flex-1 overflow-hidden flex flex-col min-h-0 px-4 py-3' : 'flex-1 overflow-y-auto px-6 py-6'}>
          {children}
        </div>

        {/* Footer */}
        {footer && !noteTakingMode && (
          <div
            className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
          >
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @media (max-width: 767px) {
          :root { --panel-radius: 12px; }
        }
        @media (min-width: 768px) {
          :root { --panel-radius: 0px; }
        }
      `}</style>
    </div>
  );
};

export default SlideOverPanel;
