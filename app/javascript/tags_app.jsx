import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TagsPage from './components/tags/TagsPage';

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
  const rootElement = document.getElementById('tags-react-root');
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
      <QueryClientProvider client={queryClient}>
        <TagsPage />
      </QueryClientProvider>
    );
  }
});
