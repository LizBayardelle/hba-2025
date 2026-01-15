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
        className={`rounded-2xl shadow-2xl ${maxWidth} w-full max-h-[90vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="p-6 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1d3e4c, #45606b)' }}>
            <h2 className="text-2xl font-bold display-font text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition"
            >
              <i className="fa-solid fa-times text-white"></i>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto bg-white flex-1" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-6 flex justify-end gap-3" style={{ background: 'linear-gradient(135deg, #1d3e4c, #45606b)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseModal;
