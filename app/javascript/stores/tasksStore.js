import { create } from 'zustand';

const useTasksStore = create((set) => ({
  // Filters
  statusFilter: 'active', // 'active', 'completed', 'on_hold', 'all'
  groupBy: 'status', // 'status', 'category', 'due_date', 'importance'
  categoryFilter: null,
  tagFilter: null,
  searchQuery: '',

  setStatusFilter: (status) => set({ statusFilter: status }),
  setGroupBy: (groupBy) => set({ groupBy }),
  setCategoryFilter: (categoryId) => set({ categoryFilter: categoryId }),
  setTagFilter: (tagId) => set({ tagFilter: tagId }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // View Modal
  viewModal: {
    isOpen: false,
    taskId: null,
  },
  openViewModal: (taskId) =>
    set({
      viewModal: {
        isOpen: true,
        taskId,
      },
    }),
  closeViewModal: () =>
    set({
      viewModal: {
        isOpen: false,
        taskId: null,
      },
    }),

  // Form Modal (handles both new and edit)
  formModal: {
    isOpen: false,
    mode: 'new', // 'new' or 'edit'
    taskId: null,
  },
  openNewModal: () =>
    set({
      formModal: {
        isOpen: true,
        mode: 'new',
        taskId: null,
      },
    }),
  openEditModal: (taskId) =>
    set({
      formModal: {
        isOpen: true,
        mode: 'edit',
        taskId,
      },
    }),
  closeFormModal: () =>
    set({
      formModal: {
        isOpen: false,
        mode: 'new',
        taskId: null,
      },
    }),
}));

export default useTasksStore;
