import './storage.js'; // must run before App.jsx, which calls window.storage on load
import './index.css'; // Tailwind — the component's className utilities need this
import React from 'react';
import ReactDOM from 'react-dom/client';
import LifeTracker from './LifeTracker.jsx';
import { ErrorBoundary, initMonitoring } from './monitoring.jsx';
import { cloudConfigured, startCloud } from './sync/cloud.js';
import { CloudOverlay } from './components/AccountPanel.jsx';

initMonitoring();

// Register the service worker on every visit (not just when the bell is
// tapped) so the app is saved for offline use from the first open.
// Production only: in `npm run dev` a caching worker would serve stale files.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

function render() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <LifeTracker />
        <CloudOverlay />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

// With cloud sync on, fetch the latest data BEFORE the first screen draws,
// so you never see yesterday's numbers flash and then change. Capped at
// 3.5 seconds: on a bad connection the app opens with what's on the phone
// and syncs in the background.
if (cloudConfigured) {
  Promise.race([startCloud().catch(() => {}), new Promise(r => setTimeout(r, 3500))]).then(render);
} else {
  render();
}
