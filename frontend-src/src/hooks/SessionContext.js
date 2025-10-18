// src/hooks/SessionContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import sessionKit, { saveSession, clearSession } from '../config/sessionConfig';

const SessionContext = createContext({
  session: null,
  handleLogin: async () => {},
  handleLogout: async () => {}
});

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const restored = await sessionKit.restore();
        if (restored?.permissionLevel && restored.transact) {
          setSession(restored);
          saveSession(restored);
        }
      } catch (err) {
        console.error('Session restore failed:', err);
      }
    })();
  }, []);

  const handleLogin = useCallback(async (walletPluginId) => {
    try {
      const { session: newSession } = await sessionKit.login({ walletPluginId });
      setSession(newSession);
      saveSession(newSession);
      return newSession;
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    if (session) {
      try {
        await sessionKit.logout(session);
      } catch (err) {
        console.error('Logout error:', err);
      }
      clearSession();
      setSession(null);
    }
  }, [session]);

  return (
    <SessionContext.Provider value={{ session, handleLogin, handleLogout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
