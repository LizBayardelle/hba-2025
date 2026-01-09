import { create } from 'zustand';

const useCategoryStore = create((set) => ({
  // Habit Form Modal (handles both new and edit)
  habitFormModal: {
    isOpen: false,
    mode: 'new', // 'new' or 'edit'
    habitId: null,
    categoryId: null,
  },
  openNewHabitModal: (categoryId) =>
    set({
      habitFormModal: {
        isOpen: true,
        mode: 'new',
        habitId: null,
        categoryId,
      },
    }),
  openEditHabitModal: (habitId, categoryId) =>
    set({
      habitFormModal: {
        isOpen: true,
        mode: 'edit',
        habitId,
        categoryId,
      },
    }),
  closeHabitFormModal: () =>
    set({
      habitFormModal: {
        isOpen: false,
        mode: 'new',
        habitId: null,
        categoryId: null,
      },
    }),

  // Category Edit Modal
  categoryEditModal: {
    isOpen: false,
    categoryId: null,
  },
  openCategoryEditModal: (categoryId) =>
    set({
      categoryEditModal: {
        isOpen: true,
        categoryId,
      },
    }),
  closeCategoryEditModal: () =>
    set({
      categoryEditModal: {
        isOpen: false,
        categoryId: null,
      },
    }),
}));

export default useCategoryStore;
