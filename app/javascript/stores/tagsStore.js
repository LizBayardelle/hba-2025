import { create } from 'zustand';

const useTagsStore = create((set) => ({
  selectedTagId: null,
  setSelectedTagId: (tagId) => set({ selectedTagId: tagId }),
  clearSelectedTag: () => set({ selectedTagId: null }),

  editModal: { isOpen: false, tagId: null, tagName: '' },
  openEditModal: (tagId, tagName) => set({ editModal: { isOpen: true, tagId, tagName } }),
  closeEditModal: () => set({ editModal: { isOpen: false, tagId: null, tagName: '' } }),
}));

export default useTagsStore;
