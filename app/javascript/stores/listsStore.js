import { create } from 'zustand';

const useListsStore = create((set) => ({
  formModal: { isOpen: false, mode: 'new', itemId: null },
  showModal: { isOpen: false, listId: null },

  openFormModal: () => set({ formModal: { isOpen: true, mode: 'new', itemId: null } }),
  openEditModal: (itemId) => set({ formModal: { isOpen: true, mode: 'edit', itemId } }),
  closeFormModal: () => set({ formModal: { isOpen: false, mode: 'new', itemId: null } }),

  openShowModal: (listId) => set({ showModal: { isOpen: true, listId } }),
  closeShowModal: () => set({ showModal: { isOpen: false, listId: null } }),
}));

export default useListsStore;
