// src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import BurnCenter from './components/BurnCenter';
import Farming from './components/Farming';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/burn" element={<BurnCenter />} />
      <Route path="/farming" element={<Farming />} />
    </Routes>
  );
}

export default App;
