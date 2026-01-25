import React from 'react';
import ReactDOM from 'react-dom/client';
import './globals.css';
import 'animate.css';
import * as Sentry from '@sentry/react';
import { AccountMismatchError } from '@/hooks/pd2website/usePD2Website';
import MainWindow, { Providers } from './MainWindow';
import { MainLayout } from './components/layout/MainLayout';

// Initialize Sentry asynchronously to avoid blocking application startup

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <Providers>
    <MainLayout>
      <MainWindow />
    </MainLayout>
  </Providers>,
);
