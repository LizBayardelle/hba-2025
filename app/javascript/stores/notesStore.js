import { create } from 'zustand';

const useNotesStore = create((set) => ({
  searchQuery: '',
  categoryFilter: null,
  tagFilter: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (categoryId) => set({ categoryFilter: categoryId }),
  setTagFilter: (tagId) => set({ tagFilter: tagId }),

  formModal: {
    isOpen: false,
    mode: 'new',
    noteId: null,
  },
  openNewModal: (defaultCategoryId = null) =>
    set({
      formModal: {
        isOpen: true,
        mode: 'new',
        noteId: null,
        defaultCategoryId,
      },
    }),
  openEditModal: (noteId) =>
    set({
      formModal: {
        isOpen: true,
        mode: 'edit',
        noteId,
      },
    }),
  closeFormModal: () =>
    set({
      formModal: {
        isOpen: false,
        mode: 'new',
        noteId: null,
      },
    }),
}));

export default useNotesStore;
