// src/hooks/SessionContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import sessionKit, { saveSession, clearSession, assertMainnetSession, ensureSessionEndpoint } from '../config/sessionConfig';
import { MAESTRO_WALLET_ID, getMaestroWalletState, subscribeMaestroWallet } from '../wallet/maestro/maestroWallet';

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
  const [localWallet, setLocalWallet] = useState(getMaestroWalletState);
  const [loading, setLoading] = useState(true);

  // Optional UI helpers
  const [loginError, setLoginError] = useState('');
  const [loginCancelled, setLoginCancelled] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await ensureSessionEndpoint();
        const restored = await sessionKit.restore();
        if (restored?.walletPlugin?.id === MAESTRO_WALLET_ID && !getMaestroWalletState().unlocked) {
          clearSession();
          return;
        }
        if (restored?.permissionLevel && restored?.transact) {
          assertMainnetSession(restored);
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

  useEffect(() => subscribeMaestroWallet(setLocalWallet), []);
  useEffect(() => {
    if (session?.walletPlugin?.id === MAESTRO_WALLET_ID &&
        (!localWallet.unlocked || `${localWallet.account}@${localWallet.permission}` !== String(session.permissionLevel))) {
      clearSession();
      setSession(null);
    }
  }, [session, localWallet]);

  const handleLogin = useCallback(async (walletPluginId) => {
    setLoginError('');
    setLoginCancelled(false);

    try {
      setLoading(true);
      await ensureSessionEndpoint();
      const result = await sessionKit.login(walletPluginId ? { walletPlugin: walletPluginId } : undefined);
      const newSession = result?.session;

      if (!newSession?.permissionLevel || !newSession?.transact) {
        throw new Error('Login succeeded but session is missing required fields.');
      }

      assertMainnetSession(newSession);
      setSession(newSession);
      saveSession(newSession);
      return newSession;
    } catch (err) {
      // ✅ User cancelled wallet prompt (don’t crash the app)
      if (isUserCancelledLogin(err)) {
        await sessionKit.ui?.onLoginComplete?.();
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
      value={{ session, localWallet, loading, loginError, loginCancelled, handleLogin, handleLogout }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
