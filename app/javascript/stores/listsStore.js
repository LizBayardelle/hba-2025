import { create } from 'zustand';

const useListsStore = create((set) => ({
  formModal: { isOpen: false, mode: 'new', itemId: null, categoryId: null },
  showModal: { isOpen: false, listId: null },

  openFormModal: (categoryId = null) => set({ formModal: { isOpen: true, mode: 'new', itemId: null, categoryId } }),
  openEditModal: (itemId) => set({ formModal: { isOpen: true, mode: 'edit', itemId, categoryId: null } }),
  closeFormModal: () => set({ formModal: { isOpen: false, mode: 'new', itemId: null, categoryId: null } }),

  openShowModal: (listId) => set({ showModal: { isOpen: true, listId } }),
  closeShowModal: () => set({ showModal: { isOpen: false, listId: null } }),
}));

export default useListsStore;
