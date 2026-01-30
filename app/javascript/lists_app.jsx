import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ListsPage from './components/lists/ListsPage';

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

// Initialize the React app
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('lists-react-root');

  if (container) {
    const root = createRoot(container);

    root.render(
      <QueryClientProvider client={queryClient}>
        <ListsPage />
      </QueryClientProvider>
    );
  }
});
