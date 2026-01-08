import React, { useEffect } from 'react';

const BaseModal = ({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-2xl' }) => {
  // Prevent body scroll when modal is open
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

  // Close on Escape key
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
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      style={{ backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl ${maxWidth} w-full max-h-[90vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: '#E8EEF1' }}>
            <h2 className="text-2xl font-bold display-font" style={{ color: '#1d3e4c' }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition"
            >
              <i className="fa-solid fa-times" style={{ color: '#657b84' }}></i>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: '#E8EEF1' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseModal;
