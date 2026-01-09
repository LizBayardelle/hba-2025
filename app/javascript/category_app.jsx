import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CategoryPage from './components/categories/CategoryPage';

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
  const rootElement = document.getElementById('category-react-root');
  if (rootElement) {
    const categoryId = parseInt(rootElement.dataset.categoryId, 10);
    const initialSort = rootElement.dataset.sort || 'priority';

    const root = createRoot(rootElement);
    root.render(
      <QueryClientProvider client={queryClient}>
        <CategoryPage categoryId={categoryId} initialSort={initialSort} />
      </QueryClientProvider>
    );
  }
});
