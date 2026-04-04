import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProjectPage from './components/projects/ProjectPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('project-react-root');
  if (rootElement) {
    const projectId = parseInt(rootElement.dataset.projectId, 10);

    const root = createRoot(rootElement);
    root.render(
      <QueryClientProvider client={queryClient}>
        <ProjectPage projectId={projectId} />
      </QueryClientProvider>
    );
  }
});
