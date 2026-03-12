import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppBootstrap } from '@/app/AppBootstrap';
import '@/styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppBootstrap />
  </React.StrictMode>,
);
