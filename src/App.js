// src/App.js
import './App.css';
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSession } from './hooks/SessionContext';

import NavBar from './components/NavBar';
import HomePage from './components/HomePage';
import ShopPage from './components/ShopPage';
import BurnCenter from './components/BurnCenter';
import Farming from './components/Farming';
import CollectionsPage from './components/CollectionsPage';
import Dashboard from './components/Dashboard';
import PacksPage from './components/PacksPage';
import BlendsPage from './components/BlendsPage';
import MachinesPage from './components/MachinesPage';
import GuidePage from './components/GuidePage';

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
  const { session, loading, login } = useSession();

  return (
    <>
      <NavBar />

      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/shop"
          element={<ShopPage session={session} onLogin={login} />}
        />

        <Route path="/guide" element={<GuidePage />} />

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
          path="/packs"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <PacksPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/blends"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <BlendsPage />
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