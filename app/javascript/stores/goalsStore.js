import { create } from 'zustand';

const useGoalsStore = create((set) => ({
  // Filters
  statusFilter: 'active', // 'active', 'completed', 'all'
  groupBy: 'none', // 'none', 'category', 'type', 'importance'
  searchQuery: '',

  setStatusFilter: (status) => set({ statusFilter: status }),
  setGroupBy: (groupBy) => set({ groupBy }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // View Modal
  viewModal: {
    isOpen: false,
    goalId: null,
  },
  openViewModal: (goalId) =>
    set({
      viewModal: {
        isOpen: true,
        goalId,
      },
    }),
  closeViewModal: () =>
    set({
      viewModal: {
        isOpen: false,
        goalId: null,
      },
    }),

  // Form Modal (handles both new and edit)
  formModal: {
    isOpen: false,
    mode: 'new', // 'new' or 'edit'
    goalId: null,
    categoryId: null,
    importanceLevelId: null,
    timeBlockId: null,
  },
  openNewModal: (options = {}) =>
    set({
      formModal: {
        isOpen: true,
        mode: 'new',
        goalId: null,
        categoryId: options.categoryId || null,
        importanceLevelId: options.importanceLevelId || null,
        timeBlockId: options.timeBlockId || null,
      },
    }),
  openEditModal: (goalId) =>
    set({
      formModal: {
        isOpen: true,
        mode: 'edit',
        goalId,
      },
    }),
  closeFormModal: () =>
    set({
      formModal: {
        isOpen: false,
        mode: 'new',
        goalId: null,
        categoryId: null,
        importanceLevelId: null,
        timeBlockId: null,
      },
    }),
}));

export default useGoalsStore;
