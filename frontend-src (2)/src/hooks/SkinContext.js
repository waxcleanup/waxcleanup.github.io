import React, { createContext, useContext, useState, useEffect } from 'react';
import { SKINS } from '../config/skins';

const SkinContext = createContext();

export function SkinProvider({ children }) {
  // Pull in the centralized SKINS array
  const [skins] = useState(SKINS);

  const [activeSkin, setActiveSkin] = useState(
    () => localStorage.getItem('activeSkin') || ''
  );

  useEffect(() => {
    document.body.className = activeSkin;
    localStorage.setItem('activeSkin', activeSkin);
  }, [activeSkin]);

  return (
    <SkinContext.Provider value={{ skins, activeSkin, setActiveSkin }}>
      {children}
    </SkinContext.Provider>
  );
}

export function useSkin() {
  const ctx = useContext(SkinContext);
  if (!ctx) throw new Error('useSkin must be inside SkinProvider');
  return ctx;
}
