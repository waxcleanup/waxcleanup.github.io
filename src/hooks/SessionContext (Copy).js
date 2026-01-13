// src/hooks/SessionContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import sessionKit, { saveSession, clearSession } from '../config/sessionConfig';

const SessionContext = createContext({
  session: null,
  loading: true,
  handleLogin: async () => {},
  handleLogout: async () => {},
});

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const restored = await sessionKit.restore();
        if (restored?.permissionLevel && restored?.transact) {
          setSession(restored);
          saveSession(restored);
        }
      } catch (err) {
        console.error('Session restore failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogin = useCallback(async (walletPluginId) => {
    try {
      setLoading(true);
      const { session: newSession } = await sessionKit.login({ walletPluginId });
      setSession(newSession);
      saveSession(newSession);
      return newSession;
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      setLoading(true);
      if (session) {
        try {
          await sessionKit.logout(session);
        } catch (err) {
          console.error('Logout error:', err);
        }
      }
      clearSession();
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [session]);

  return (
    <SessionContext.Provider value={{ session, loading, handleLogin, handleLogout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

