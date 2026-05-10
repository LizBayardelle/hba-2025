import { create } from 'zustand';

const useProjectsStore = create((set) => ({
  formModal: { isOpen: false, mode: 'edit', projectId: null },

  openEditModal: (projectId) =>
    set({ formModal: { isOpen: true, mode: 'edit', projectId } }),
  closeFormModal: () =>
    set({ formModal: { isOpen: false, mode: 'edit', projectId: null } }),
}));

export default useProjectsStore;
