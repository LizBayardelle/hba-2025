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
        className={`rounded-2xl ${maxWidth} w-full max-h-[90vh] overflow-hidden flex flex-col`}
        style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 0.5px rgba(199, 199, 204, 0.3)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="p-6 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)', borderBottom: '0.5px solid rgba(199, 199, 204, 0.2)' }}>
            <h2 className="text-2xl text-white" style={{ fontWeight: 800, fontFamily: "'Inter', sans-serif" }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition"
              style={{ background: 'rgba(255, 255, 255, 0.1)' }}
            >
              <i className="fa-solid fa-times text-white"></i>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1" style={{ background: '#FFFFFF', maxHeight: 'calc(90vh - 180px)' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-6 flex justify-end gap-3" style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)', borderTop: '0.5px solid rgba(199, 199, 204, 0.2)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseModal;
