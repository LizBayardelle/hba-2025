import React, { useEffect } from 'react';

const SlideOverPanel = ({ isOpen, onClose, title, children, footer }) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full md:w-[90%] lg:w-[85%] xl:w-[80%] max-w-5xl h-full bg-white shadow-2xl flex flex-col animate-slide-in-right"
        style={{
          animation: 'slideInRight 0.3s ease-out forwards',
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'rgba(199, 199, 204, 0.3)', backgroundColor: '#FAFAFA' }}
        >
          <h2
            className="text-2xl font-display"
            style={{ color: '#1D1D1F', fontWeight: 500 }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center transition hover:bg-gray-100"
            title="Close"
          >
            <i className="fa-solid fa-xmark text-xl" style={{ color: '#8E8E93' }}></i>
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t"
            style={{ borderColor: 'rgba(199, 199, 204, 0.3)', backgroundColor: '#FAFAFA' }}
          >
            {footer}
          </div>
        )}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default SlideOverPanel;
