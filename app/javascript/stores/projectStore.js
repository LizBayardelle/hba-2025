import { create } from 'zustand';

const useProjectStore = create((set) => ({
  // View mode: 'board' or 'list'
  viewMode: 'list',
  setViewMode: (mode) => set({ viewMode: mode }),

  // Filter: 'all', 'active', 'completed'
  taskFilter: 'active',
  setTaskFilter: (filter) => set({ taskFilter: filter }),

  // Search within project
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Task detail/edit modal
  taskModal: {
    isOpen: false,
    mode: 'view', // 'view' or 'edit'
    taskId: null,
    sectionId: null,
  },
  openTaskModal: (taskId, sectionId, mode = 'view') =>
    set({ taskModal: { isOpen: true, mode, taskId, sectionId } }),
  closeTaskModal: () =>
    set({ taskModal: { isOpen: false, mode: 'view', taskId: null, sectionId: null } }),

  // Section being edited (inline rename)
  editingSectionId: null,
  setEditingSectionId: (id) => set({ editingSectionId: id }),

  // Project settings/edit modal
  projectEditModal: {
    isOpen: false,
  },
  openProjectEditModal: () => set({ projectEditModal: { isOpen: true } }),
  closeProjectEditModal: () => set({ projectEditModal: { isOpen: false } }),

  // Adding task to section (which section has the add-task input open)
  addingTaskSectionId: null,
  setAddingTaskSectionId: (id) => set({ addingTaskSectionId: id }),

  // Adding subtask to task
  addingSubtaskId: null,
  setAddingSubtaskId: (id) => set({ addingSubtaskId: id }),

  // Expanded tasks (showing subtasks)
  expandedTasks: {},
  toggleTaskExpanded: (taskId) =>
    set((state) => ({
      expandedTasks: { ...state.expandedTasks, [taskId]: !state.expandedTasks[taskId] },
    })),
  setTaskExpanded: (taskId, expanded) =>
    set((state) => ({
      expandedTasks: { ...state.expandedTasks, [taskId]: expanded },
    })),
}));

export default useProjectStore;
