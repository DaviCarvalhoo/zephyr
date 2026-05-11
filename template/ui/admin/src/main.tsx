import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { ConfirmProvider } from './hooks/use-confirm';
import App from './app';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ConfirmProvider>
                <App />
            </ConfirmProvider>
        </QueryClientProvider>
    </React.StrictMode>
);
