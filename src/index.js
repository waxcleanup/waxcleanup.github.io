// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { SessionProvider } from './hooks/SessionContext';
import { PlayerResourcesProvider } from './hooks/PlayerResourcesContext';
import { SkinProvider } from './hooks/SkinContext';

const routerBasename = process.env.REACT_APP_ROUTER_BASENAME || '';

// Restore legacy GitHub Pages redirects only in the root-hosted build.
const savedPath = sessionStorage.getItem('redirectPath');
if (!routerBasename && savedPath && savedPath !== window.location.pathname) {
  sessionStorage.removeItem('redirectPath');
  window.history.replaceState(null, '', savedPath);
}

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <SessionProvider>
    <PlayerResourcesProvider>
      <SkinProvider>
        <BrowserRouter basename={routerBasename}>
          <App />
        </BrowserRouter>
      </SkinProvider>
    </PlayerResourcesProvider>
  </SessionProvider>
);

reportWebVitals();
