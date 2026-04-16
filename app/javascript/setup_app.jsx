import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SetupWizard from './components/setup/SetupWizard';

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
  const rootElement = document.getElementById('setup-root');
  if (rootElement) {
    const userSettings = JSON.parse(rootElement.dataset.userSettings);
    const initialStep = parseInt(rootElement.dataset.step, 10) || 1;
    const googleConnectUrl = rootElement.dataset.googleConnectUrl;

    const root = createRoot(rootElement);
    root.render(
      <QueryClientProvider client={queryClient}>
        <SetupWizard
          initialSettings={userSettings}
          initialStep={initialStep}
          googleConnectUrl={googleConnectUrl}
        />
      </QueryClientProvider>
    );
  }
});
