import { useState, useEffect, useCallback } from 'react';
import sessionKit, { saveSession, clearSession } from '../config/sessionConfig';
import { useNavigate } from 'react-router-dom';

export const TAPOS = {
  blocksBehind: 3, // Adjusted for lower latency
  expireSeconds: 30, // Reduced expiration time for faster testing
  broadcast: true,
};

// Helper function to initialize and perform a transaction
export const InitTransaction = async (dataTrx) => {
  try {
    // Restore session
    const session = await sessionKit.restore();
    if (!session) {
      console.error('[ERROR] Session restoration failed. Prompting for login.');
      throw new Error('No session found. Please log in again.');
    }

    const { actor, permission } = session.permissionLevel;

    // Confirm actor and permission match expected values
    console.log('[INFO] Using actor:', actor, 'with permission:', permission);

    // Attach authorization to each action
    const actions = dataTrx.actions.map((action) => ({
      ...action,
      authorization: [
        {
          actor: actor,
          permission: permission || 'active',
        },
      ],
    }));

    console.log('[DEBUG] Transaction payload:', { actions, TAPOS });

    // Perform the transaction
    const transaction = await session.transact({ actions }, TAPOS);

    console.log('[DEBUG] Raw transaction response:', transaction);

    // Parse transaction ID from different response formats
    if (transaction?.resolved?.transaction?.id) {
      return {
        transactionId: transaction.resolved.transaction.id,
        actions: actions,
      };
    }

    if (transaction?.transaction_id) {
      return {
        transactionId: transaction.transaction_id,
        actions: actions,
      };
    }

    throw new Error('Transaction failed. No transaction ID returned.');
  } catch (error) {
    console.error('[ERROR] Transaction failed with full details:', error.response || error);

    // Handle specific errors like session expiration
    if (error.message.includes('No session found')) {
      console.warn('[WARN] Session expired or invalid. Prompting for re-login.');
      clearSession(); // Clear session to force re-login
    } else if (error.message.includes('assertion failure')) {
      console.error('[ERROR] Blockchain assertion failure:', error);
    } else {
      console.error('[ERROR] Unexpected error during transaction:', error);
    }

    throw error;
  }
};

// Main hook to manage session
const useSession = () => {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedWalletPlugin, setSelectedWalletPlugin] = useState('');
  const navigate = useNavigate();

  const saveSessionToLocal = useCallback(async (sessionToSave) => {
    try {
      saveSession(sessionToSave);
      console.log('[INFO] Session saved to localStorage:', sessionToSave);
    } catch (err) {
      console.error('[ERROR] Error saving session to localStorage:', err);
    }
  }, []);

  const handleRestoreSession = useCallback(async () => {
    try {
      const restoredSession = await sessionKit.restore();
      if (!restoredSession) {
        throw new Error('[ERROR] Session restoration failed.');
      }

      if (!restoredSession.permissionLevel || !restoredSession.transact) {
        throw new Error('[ERROR] Invalid session object. Please log in again.');
      }

      setSession(restoredSession);
      console.log('[INFO] Session restored:', restoredSession);
    } catch (err) {
      console.error('[ERROR] Failed to restore session:', err);
      setError('Failed to restore session');
    }
  }, []);

  const handleLogin = useCallback(
    async (walletPluginId) => {
      try {
        const result = await sessionKit.login({ walletPluginId });
        if (result && result.session) {
          setSession(result.session);
          setSelectedWalletPlugin(walletPluginId);
          await saveSessionToLocal(result.session);
        }
      } catch (err) {
        setError(err.message || '[ERROR] Login failed.');
        console.error('[ERROR] Login error:', err);
      }
    },
    [saveSessionToLocal]
  );

  const handleLogout = useCallback(async () => {
    try {
      if (session) {
        await sessionKit.logout(session);
        setSession(null);
        clearSession();
        console.log('[INFO] User logged out successfully.');
        navigate('/');
      }
    } catch (err) {
      console.error('[ERROR] Error during logout:', err);
    }
  }, [session, navigate]);

  useEffect(() => {
    handleRestoreSession();
  }, [handleRestoreSession]);

  return {
    session,
    handleLogin,
    handleLogout,
    error,
    isModalOpen,
    selectedWalletPlugin,
    setSelectedWalletPlugin,
  };
};

export default useSession;
