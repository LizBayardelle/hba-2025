import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import JournalPage from './components/journal/JournalPage';

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
  const rootElement = document.getElementById('journal-react-root');
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
      <QueryClientProvider client={queryClient}>
        <JournalPage />
      </QueryClientProvider>
    );
  }
});
