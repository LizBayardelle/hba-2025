import { create } from 'zustand';

const usePrepStore = create((set) => ({
  // Form Modal for creating/editing questions
  formModal: {
    isOpen: false,
    mode: 'new', // 'new' or 'edit'
    questionId: null,
  },
  openNewModal: () =>
    set({
      formModal: {
        isOpen: true,
        mode: 'new',
        questionId: null,
      },
    }),
  openEditModal: (questionId) =>
    set({
      formModal: {
        isOpen: true,
        mode: 'edit',
        questionId,
      },
    }),
  closeFormModal: () =>
    set({
      formModal: {
        isOpen: false,
        mode: 'new',
        questionId: null,
      },
    }),

  // Delete confirmation modal
  deleteModal: {
    isOpen: false,
    questionId: null,
  },
  openDeleteModal: (questionId) =>
    set({
      deleteModal: {
        isOpen: true,
        questionId,
      },
    }),
  closeDeleteModal: () =>
    set({
      deleteModal: {
        isOpen: false,
        questionId: null,
      },
    }),
}));

export default usePrepStore;
