import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DailyPrepPage from './components/prep/DailyPrepPage';
import ManageQuestionsPage from './components/prep/ManageQuestionsPage';
import AnswersHistoryPage from './components/prep/AnswersHistoryPage';

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
  const rootElement = document.getElementById('daily-prep-root');
  if (rootElement) {
    const view = rootElement.dataset.view;
    const root = createRoot(rootElement);

    let PageComponent = DailyPrepPage;
    if (view === 'manage') PageComponent = ManageQuestionsPage;
    if (view === 'answers') PageComponent = AnswersHistoryPage;

    root.render(
      <QueryClientProvider client={queryClient}>
        <PageComponent />
      </QueryClientProvider>
    );
  }
});
