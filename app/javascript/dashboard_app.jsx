import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DocumentViewModal from './components/documents/DocumentViewModal';
import DocumentFormModal from './components/documents/DocumentFormModal';
import ListShowModal from './components/lists/ListShowModal';
import HabitFormModal from './components/categories/HabitFormModal';
import TaskFormModal from './components/tasks/TaskFormModal';
import useHabitsStore from './stores/habitsStore';
import useTasksStore from './stores/tasksStore';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // 30 seconds
    },
  },
});

// Expose global functions for opening habit/task modals from ERB templates
window.openNewHabitModal = () => {
  useHabitsStore.getState().openNewModal();
};
window.openNewTaskModal = () => {
  useTasksStore.getState().openNewModal();
};

// Initialize the React app for modals on dashboard
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('dashboard-modals-root');

  if (container) {
    const root = createRoot(container);

    root.render(
      <QueryClientProvider client={queryClient}>
        <DocumentViewModal />
        <DocumentFormModal />
        <ListShowModal />
        <HabitFormModal useHabitsPage={true} onSuccess={() => window.location.reload()} />
        <TaskFormModal onSuccess={() => window.location.reload()} />
      </QueryClientProvider>
    );
  }
});
