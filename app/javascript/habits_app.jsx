import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HabitsPage from './components/habits/HabitsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('habits-root');
  if (container) {
    const root = createRoot(container);
    root.render(
      <QueryClientProvider client={queryClient}>
        <HabitsPage />
      </QueryClientProvider>
    );
  }
});
