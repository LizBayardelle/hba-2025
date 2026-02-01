import React, { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { prepQuestionsApi } from '../../utils/api';
import usePrepStore from '../../stores/prepStore';

const DeleteQuestionModal = () => {
  const queryClient = useQueryClient();
  const { deleteModal, closeDeleteModal } = usePrepStore();
  const { isOpen, questionId } = deleteModal;

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeDeleteModal();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeDeleteModal]);

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

  const deleteMutation = useMutation({
    mutationFn: () => prepQuestionsApi.delete(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prepQuestions'] });
      queryClient.invalidateQueries({ queryKey: ['dailyPrep'] });
      closeDeleteModal();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={closeDeleteModal}
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: '#FEE2E2' }}
          >
            <i className="fa-solid fa-trash text-2xl" style={{ color: '#DC2626' }}></i>
          </div>

          <h3 className="text-xl font-semibold mb-2" style={{ color: '#1D1D1F' }}>
            Delete Question?
          </h3>
          <p className="text-sm mb-6" style={{ color: '#8E8E93' }}>
            This will archive the question. Past responses will be preserved, but you won't be prompted for this question going forward.
          </p>

          <div className="flex gap-3">
            <button
              onClick={closeDeleteModal}
              className="flex-1 px-4 py-3 rounded-lg font-medium border transition hover:bg-gray-50"
              style={{ borderColor: 'rgba(199, 199, 204, 0.4)', color: '#1D1D1F' }}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              className="flex-1 px-4 py-3 rounded-lg font-medium text-white transition hover:opacity-90"
              style={{ background: '#DC2626' }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default DeleteQuestionModal;
