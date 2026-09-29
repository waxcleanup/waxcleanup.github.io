// src/App.js
import './App.css';
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSession } from './hooks/SessionContext';

import NavBar from './components/NavBar';
import HomePage from './components/HomePage';
import MarketHub, { MarketRedirect } from './components/MarketHub';
import BurnCenter from './components/BurnCenter';
import Farming from './components/Farming';
import CollectionsPage from './components/CollectionsPage';
import MachinesPage from './components/MachinesPage';
import GuidePage from './components/GuidePage';
import GameNotificationCenter from './components/GameNotificationCenter';
const ExchangePage = React.lazy(() => import('./components/ExchangePage'));

// Simple inline loader
function LoadingScreen() {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ opacity: 0.8 }}>Restoring session…</div>
    </div>
  );
}

function ProtectedRoute({ session, loading, children }) {
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!session) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default function App() {
  const { session, loading } = useSession();

  return (
    <>
      <NavBar />
      <GameNotificationCenter />

      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route path="/market/*" element={<MarketHub />} />
        <Route path="/shop" element={<MarketRedirect section="shop" />} />
        <Route path="/marketplace" element={<MarketRedirect section="listings" />} />
        <Route path="/recipes" element={<MarketRedirect section="blends" />} />

        <Route path="/guide" element={<GuidePage />} />
        <Route path="/exchange" element={<React.Suspense fallback={<div style={{ padding: 32 }}>Loading exchange…</div>}><ExchangePage /></React.Suspense>} />

        <Route
          path="/burn"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <BurnCenter />
            </ProtectedRoute>
          }
        />

        <Route
          path="/farming"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <Farming />
            </ProtectedRoute>
          }
        />

        <Route
          path="/collections"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <CollectionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/machines"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <MachinesPage session={session} />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
