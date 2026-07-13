import './storage.js'; // must run before App.jsx, which calls window.storage on load
import './index.css'; // Tailwind — the component's className utilities need this
import React from 'react';
import ReactDOM from 'react-dom/client';
import LifeTracker from './LifeTracker.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LifeTracker />
  </React.StrictMode>
);
