import { create } from 'zustand';

const useDocumentsStore = create((set) => ({
  // Modal states
  viewModal: { isOpen: false, documentId: null },
  formModal: { isOpen: false, mode: 'new', documentId: null }, // mode: 'new' | 'edit'

  // Modal actions
  openViewModal: (documentId) => set({ viewModal: { isOpen: true, documentId } }),
  closeViewModal: () => set({ viewModal: { isOpen: false, documentId: null } }),

  openNewModal: () => set({ formModal: { isOpen: true, mode: 'new', documentId: null } }),
  openEditModal: (documentId) => set({ formModal: { isOpen: true, mode: 'edit', documentId } }),
  closeFormModal: () => set({ formModal: { isOpen: false, mode: 'new', documentId: null } }),
}));

export default useDocumentsStore;
