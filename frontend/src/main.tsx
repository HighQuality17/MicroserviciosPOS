import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppBootstrap } from '@/app/AppBootstrap';
import { initializeTheme } from '@/theme/theme';
import '@/styles.css';
import '@/styles-d0.css';

initializeTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppBootstrap />
  </React.StrictMode>,
);

