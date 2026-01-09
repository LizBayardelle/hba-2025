import { create } from 'zustand';

const useJournalStore = create((set) => ({
  // View Modal
  viewModal: {
    isOpen: false,
    journalId: null,
  },
  openViewModal: (journalId) =>
    set({
      viewModal: {
        isOpen: true,
        journalId,
      },
    }),
  closeViewModal: () =>
    set({
      viewModal: {
        isOpen: false,
        journalId: null,
      },
    }),

  // Form Modal (handles both new and edit)
  formModal: {
    isOpen: false,
    mode: 'new', // 'new' or 'edit'
    journalId: null,
  },
  openNewModal: () =>
    set({
      formModal: {
        isOpen: true,
        mode: 'new',
        journalId: null,
      },
    }),
  openEditModal: (journalId) =>
    set({
      formModal: {
        isOpen: true,
        mode: 'edit',
        journalId,
      },
    }),
  closeFormModal: () =>
    set({
      formModal: {
        isOpen: false,
        mode: 'new',
        journalId: null,
      },
    }),
}));

export default useJournalStore;
