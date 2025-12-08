// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { SessionProvider } from './hooks/SessionContext';
import { SkinProvider } from './hooks/SkinContext';   // ← import SkinProvider

// Restore original path after GitHub Pages 404 redirect
const savedPath = sessionStorage.getItem('redirectPath');
if (savedPath && savedPath !== window.location.pathname) {
  sessionStorage.removeItem('redirectPath');
  window.history.replaceState(null, '', savedPath);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SessionProvider>
      <SkinProvider>               {/* ← wrap App with SkinProvider too */}
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SkinProvider>
    </SessionProvider>
  </React.StrictMode>
);

reportWebVitals();
