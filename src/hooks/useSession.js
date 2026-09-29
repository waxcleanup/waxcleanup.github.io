import { useState, useEffect, useCallback } from 'react';
import sessionKit, { saveSession, clearSession, ensureSessionEndpoint, assertMainnetSession } from '../config/sessionConfig';
import { useNavigate } from 'react-router-dom';
import { PLAYER_RESOURCES_REFRESH_EVENT } from './PlayerResourcesContext';
import { MAESTRO_WALLET_ID, recordMaestroWalletActivity } from '../wallet/maestro/maestroWallet';
import { closeGameTransaction, updateGameTransaction } from '../services/gameNotifications';
import { extractTransactionBlockNumber, monitorTransactionFinality } from '../services/transactionFinality';

export const TAPOS = {
  blocksBehind: 3, // Adjusted for lower latency
  expireSeconds: 120, // Reduced expiration time for faster testing
  broadcast: true,
};

// Helper function to initialize and perform a transaction
export const InitTransaction = async (dataTrx) => {
  let showMaestroProgress = false;
  try {
    await ensureSessionEndpoint();
    // Restore session
    const session = await sessionKit.restore();
    if (!session) {
      console.error('[ERROR] Session restoration failed. Prompting for login.');
      throw new Error('No session found. Please log in again.');
    }

    assertMainnetSession(session);
    const { actor, permission } = session.permissionLevel;
    if (dataTrx.expectedActor && String(actor) !== dataTrx.expectedActor) {
      throw new Error('Wallet account changed. Review this transaction again.');
    }
    if (dataTrx.validUntil && Date.now() >= dataTrx.validUntil) {
      throw new Error('Quote expired. Request a fresh quote before signing.');
    }
    showMaestroProgress = session.walletPlugin?.id === MAESTRO_WALLET_ID;

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

    // Maestro provides its own approval and progress surfaces. Temporarily
    // detach WharfKit's renderer so its generic processing dialog cannot open
    // behind the Maestro approval panel. Other wallet renderers are unchanged.
    let transaction;
    if (showMaestroProgress) {
      const wharfkitUi = session.ui;
      session.ui = undefined;
      try {
        transaction = await session.transact({ actions }, TAPOS);
      } finally {
        session.ui = wharfkitUi;
      }
    } else {
      transaction = await session.transact({ actions }, TAPOS);
    }

    const rawTransactionId =
      transaction?.resolved?.transaction?.id || transaction?.transaction_id;

    if (!rawTransactionId) {
      throw new Error('Transaction failed. No transaction ID returned.');
    }
    const transactionId = String(rawTransactionId);
    const blockNumber = extractTransactionBlockNumber(transaction);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(PLAYER_RESOURCES_REFRESH_EVENT));
    }

    if (showMaestroProgress) {
      recordMaestroWalletActivity({
        account: String(actor),
        permission: String(permission || 'active'),
        transactionId,
        actions,
        blockNumber,
      });
      monitorTransactionFinality({ transactionId, blockNumber });
      updateGameTransaction({ phase: 'success', title: 'Transaction confirmed', message: 'WAX Mainnet accepted the transaction.', transactionId });
    }

    return { transactionId, actions, actionTraces: transaction?.response?.processed?.action_traces || [] };
  } catch (error) {
    console.error('[ERROR] Transaction failed with full details:', error.response || error);

    // Handle specific errors like session expiration
    if (String(error?.message || '').includes('No session found')) {
      console.warn('[WARN] Session expired or invalid. Prompting for re-login.');
      clearSession(); // Clear session to force re-login
    } else if (String(error?.message || '').includes('assertion failure')) {
      console.error('[ERROR] Blockchain assertion failure:', error);
    } else {
      console.error('[ERROR] Unexpected error during transaction:', error);
    }

    if (showMaestroProgress) {
      if (/reject|declin|cancel/i.test(String(error?.message || ''))) closeGameTransaction();
      else updateGameTransaction({ phase: 'error', title: 'Transaction not completed', message: error?.message || 'The WAX Mainnet transaction failed.' });
    }
    throw error;
  }
};

// Main hook to manage session
const useSession = () => {
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [selectedWalletPlugin, setSelectedWalletPlugin] = useState('');
  const navigate = useNavigate();

  const saveSessionToLocal = useCallback(async (sessionToSave) => {
    try {
      saveSession(sessionToSave);
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

      assertMainnetSession(restoredSession);
      setSession(restoredSession);
    } catch (err) {
      console.error('[ERROR] Failed to restore session:', err);
      setError('Failed to restore session');
    }
  }, []);

  const handleLogin = useCallback(
    async (walletPluginId) => {
      try {
        await ensureSessionEndpoint();
        const result = await sessionKit.login(walletPluginId ? { walletPlugin: walletPluginId } : undefined);
        if (result && result.session) {
          assertMainnetSession(result.session);
          setSession(result.session);
          setSelectedWalletPlugin(walletPluginId);
          await saveSessionToLocal(result.session);
        }
      } catch (err) {
        if (/cancel|reject/i.test(String(err?.message || ''))) {
          await sessionKit.ui?.onLoginComplete?.();
          return null;
        }
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
    selectedWalletPlugin,
    setSelectedWalletPlugin,
  };
};

export default useSession;
