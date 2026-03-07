import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './hospital-app';

// Provide a localStorage-based polyfill for window.storage
// (the hospital-app.jsx code expects window.storage.get / window.storage.set)
if (!window.storage) {
  window.storage = {
    async get(key) {
      const value = localStorage.getItem(key);
      return value !== null ? { value } : null;
    },
    async set(key, value) {
      localStorage.setItem(key, value);
    },
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
