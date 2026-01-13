// src/App.js
import './App.css';
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSession } from './hooks/SessionContext';

import NavBar from './components/NavBar';
import HomePage from './components/HomePage';
import BurnCenter from './components/BurnCenter';
import Farming from './components/Farming';
import CollectionsPage from './components/CollectionsPage';
import Dashboard from './components/Dashboard';
import MarketsPage from './components/MarketsPage';

// Simple inline loader (swap for your spinner component if you have one)
function LoadingScreen() {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ opacity: 0.8 }}>Restoring session…</div>
    </div>
  );
}

/**
 * ProtectedRoute
 * - Prevents "refresh -> session briefly null -> Navigate home" flicker
 * - Waits for SessionContext to finish restoring
 *
 * IMPORTANT:
 * Your SessionContext should expose `loading` (or `isRestoring`) boolean.
 * If it doesn't yet, add it there (recommended).
 */
function ProtectedRoute({ session, loading, children }) {
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!session) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default function App() {
  // EXPECTED from SessionContext:
  // - session: wallet session object or null
  // - loading: boolean while restoring session on page load
  const { session, loading } = useSession();

  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />

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
          path="/dashboard"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/markets"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <MarketsPage />
            </ProtectedRoute>
          }
        />

        {/* Optional: enable if you want unknown routes to go home */}
        {/* <Route path="*" element={<Navigate to="/" replace />} /> */}
      </Routes>
    </>
  );
}

