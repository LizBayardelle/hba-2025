import { create } from 'zustand';

// Helper to get local date string in YYYY-MM-DD format
const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to parse date string in local timezone
const parseLocalDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Helper to update URL params
const updateURL = (date, view) => {
  const params = new URLSearchParams(window.location.search);
  params.set('date', date);
  params.set('view', view);
  const newURL = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({}, '', newURL);
};

// Get initial values from URL or defaults
const getInitialDate = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('date') || getLocalDateString(new Date());
};

const getInitialView = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('view') || 'category';
};

const useHabitsStore = create((set) => ({
  viewMode: getInitialView(),
  selectedDate: getInitialDate(),
  viewModal: { isOpen: false, habitId: null },
  editModal: { isOpen: false, habitId: null, categoryId: null },
  newModal: { isOpen: false },

  setViewMode: (mode) => set((state) => {
    updateURL(state.selectedDate, mode);
    return { viewMode: mode };
  }),

  setSelectedDate: (date) => set((state) => {
    updateURL(date, state.viewMode);
    return { selectedDate: date };
  }),

  goToPreviousDay: () => set((state) => {
    const date = parseLocalDate(state.selectedDate);
    date.setDate(date.getDate() - 1);
    const newDate = getLocalDateString(date);
    updateURL(newDate, state.viewMode);
    return { selectedDate: newDate };
  }),

  goToNextDay: () => set((state) => {
    const date = parseLocalDate(state.selectedDate);
    date.setDate(date.getDate() + 1);
    const newDate = getLocalDateString(date);
    updateURL(newDate, state.viewMode);
    return { selectedDate: newDate };
  }),

  goToToday: () => set((state) => {
    const newDate = getLocalDateString(new Date());
    updateURL(newDate, state.viewMode);
    return { selectedDate: newDate };
  }),

  openViewModal: (habitId) => set({ viewModal: { isOpen: true, habitId } }),
  closeViewModal: () => set({ viewModal: { isOpen: false, habitId: null } }),

  openEditModal: (habitId, categoryId) => set({ editModal: { isOpen: true, habitId, categoryId } }),
  closeEditModal: () => set({ editModal: { isOpen: false, habitId: null, categoryId: null } }),

  openNewModal: () => set({ newModal: { isOpen: true } }),
  closeNewModal: () => set({ newModal: { isOpen: false } }),
}));

export default useHabitsStore;
