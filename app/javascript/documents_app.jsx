import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DocumentsPage from './components/documents/DocumentsPage';

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
  const container = document.getElementById('documents-react-root');

  if (container) {
    const root = createRoot(container);

    // Get habits data from data attribute
    const habitsData = JSON.parse(container.dataset.habits || '[]');

    root.render(
      <QueryClientProvider client={queryClient}>
        <DocumentsPage habits={habitsData} />
      </QueryClientProvider>
    );
  }
});
