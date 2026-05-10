import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProjectFormModal from './components/projects/ProjectFormModal';
import useProjectsStore from './stores/projectsStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

window.openProjectEditModal = (projectId) => {
  useProjectsStore.getState().openEditModal(projectId);
};

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('projects-modals-root');
  if (container) {
    const root = createRoot(container);
    root.render(
      <QueryClientProvider client={queryClient}>
        <ProjectFormModal />
      </QueryClientProvider>
    );
  }
});
