import React, { useEffect, useMemo } from 'react';
import useSwipeToDismiss from '../../hooks/useSwipeToDismiss';

const SlideOverPanel = ({ isOpen, onClose, title, children, footer, headerActions, noteTakingMode, viewportHeight }) => {
  const { translateX, isAnimating, isDismissing, handlers, reset } = useSwipeToDismiss(onClose);

  // Reset swipe state when panel opens/closes
  useEffect(() => {
    reset();
  }, [isOpen, reset]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Backdrop opacity fades as panel slides right
  const backdropOpacity = useMemo(() => {
    if (!translateX) return 0.5;
    const progress = translateX / window.innerWidth;
    return Math.max(0, 0.5 * (1 - progress));
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
        className={`relative w-[calc(100%-16px)] md:w-[90%] lg:w-[85%] xl:w-[80%] max-w-5xl bg-white shadow-2xl flex flex-col ${noteTakingMode ? 'note-taking-mode' : 'h-full'}`}
        style={{
          animation: !isDismissing ? 'slideInRight 0.3s ease-out forwards' : undefined,
          transform: translateX ? `translateX(${translateX}px)` : undefined,
          transition: isAnimating ? 'transform 250ms ease-out' : undefined,
          borderTopLeftRadius: 'var(--panel-radius, 0px)',
          borderBottomLeftRadius: 'var(--panel-radius, 0px)',
          ...(noteTakingMode && viewportHeight ? { height: `${viewportHeight}px` } : noteTakingMode ? { height: '100%' } : {}),
        }}
      >
        {/* Drag handle pill — mobile only (hidden in note-taking mode) */}
        {!noteTakingMode && (
          <div className="md:hidden flex justify-center pt-2 pb-0">
            <div
              style={{
                width: 36,
                height: 5,
                borderRadius: 3,
                backgroundColor: '#C7C7CC',
              }}
            />
          </div>
        )}

        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'rgba(199, 199, 204, 0.3)', backgroundColor: '#FAFAFA' }}
        >
          <div className="flex items-center gap-3">
            <h2
              className="text-2xl font-display"
              style={{ color: '#1D1D1F', fontWeight: 500 }}
            >
              {title}
            </h2>
            {headerActions}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center transition hover:bg-gray-100"
            title="Close"
          >
            <i className="fa-solid fa-xmark text-xl" style={{ color: '#8E8E93' }}></i>
          </button>
        </div>

        {/* Content - scrollable */}
        <div className={noteTakingMode ? 'flex-1 overflow-hidden flex flex-col min-h-0 px-4 py-3' : 'flex-1 overflow-y-auto px-6 py-6'}>
          {children}
        </div>

        {/* Footer (hidden in note-taking mode) */}
        {footer && !noteTakingMode && (
          <div
            className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t"
            style={{ borderColor: 'rgba(199, 199, 204, 0.3)', backgroundColor: '#FAFAFA' }}
          >
            {footer}
          </div>
        )}
      </div>

      {/* CSS Animation + mobile border radius */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @media (max-width: 767px) {
          :root {
            --panel-radius: 12px;
          }
        }
        @media (min-width: 768px) {
          :root {
            --panel-radius: 0px;
          }
        }
      `}</style>
    </div>
  );
};

export default SlideOverPanel;
