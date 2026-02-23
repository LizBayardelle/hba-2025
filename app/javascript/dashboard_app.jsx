import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DocumentViewModal from './components/documents/DocumentViewModal';
import DocumentFormModal from './components/documents/DocumentFormModal';
import ListShowModal from './components/lists/ListShowModal';

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
      </QueryClientProvider>
    );
  }
});
