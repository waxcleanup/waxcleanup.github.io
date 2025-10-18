// src/App.js
import './App.css';
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from './hooks/SessionContext';
import NavBar         from './components/NavBar';
import HomePage       from './components/HomePage';
import BurnCenter     from './components/BurnCenter';
import Farming        from './components/Farming';
import CollectionsPage from './components/CollectionsPage';
import Dashboard      from './components/Dashboard';
import MarketsPage    from './components/MarketsPage';

export default function App() {
  const { session } = useSession();

  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/"       element={<HomePage />} />
        <Route path="/burn"   element={session ? <BurnCenter />    : <Navigate to="/" replace />} />
        <Route path="/farming"element={session ? <Farming />       : <Navigate to="/" replace />} />
        <Route path="/collections" element={session ? <CollectionsPage />: <Navigate to="/" replace />} />
        <Route path="/dashboard"   element={session ? <Dashboard />     : <Navigate to="/" replace />} />
        <Route path="/markets"     element={session ? <MarketsPage />   : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
