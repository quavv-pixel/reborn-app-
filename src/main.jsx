import './storage.js'; // must run before App.jsx, which calls window.storage on load
import './index.css'; // Tailwind — the component's className utilities need this
import React from 'react';
import ReactDOM from 'react-dom/client';
import LifeTracker from './LifeTracker.jsx';
import { ErrorBoundary, initMonitoring } from './monitoring.jsx';

initMonitoring();

// Register the service worker on every visit (not just when the bell is
// tapped) so the app is saved for offline use from the first open.
// Production only: in `npm run dev` a caching worker would serve stale files.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LifeTracker />
    </ErrorBoundary>
  </React.StrictMode>
);
