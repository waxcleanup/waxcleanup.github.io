// src/hooks/SessionContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import sessionKit, { saveSession, clearSession } from '../config/sessionConfig';

const SessionContext = createContext({
  session: null,
  loading: true,
  loginError: '',
  loginCancelled: false,
  handleLogin: async () => null,
  handleLogout: async () => {},
});

function isUserCancelledLogin(err) {
  const msg = String(err?.message || err || '').toLowerCase();

  // Anchor + common wallet cancel phrases
  return (
    msg.includes('request was cancelled') ||
    msg.includes('request was canceled') ||
    msg.includes('cancelled') ||
    msg.includes('canceled') ||
    msg.includes('user canceled') ||
    msg.includes('user cancelled') ||
    msg.includes('user rejected') ||
    msg.includes('rejected the request') ||
    msg.includes('signing request was rejected')
  );
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Optional UI helpers
  const [loginError, setLoginError] = useState('');
  const [loginCancelled, setLoginCancelled] = useState(false);

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
    setLoginError('');
    setLoginCancelled(false);

    try {
      setLoading(true);

      const result = await sessionKit.login({ walletPluginId });
      const newSession = result?.session;

      if (!newSession?.permissionLevel || !newSession?.transact) {
        throw new Error('Login succeeded but session is missing required fields.');
      }

      setSession(newSession);
      saveSession(newSession);
      return newSession;
    } catch (err) {
      // ✅ User cancelled wallet prompt (don’t crash the app)
      if (isUserCancelledLogin(err)) {
        setLoginCancelled(true);
        return null;
      }

      console.error('Login failed:', err);
      setLoginError(err?.message || 'Login failed');
      // ❌ do NOT throw here unless you really want a global error overlay
      return null;
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
    <SessionContext.Provider
      value={{ session, loading, loginError, loginCancelled, handleLogin, handleLogout }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}

