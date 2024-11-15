import { useState, useEffect, useCallback } from 'react';
import sessionKit, { saveSession, clearSession } from '../config/sessionConfig';
import { useNavigate } from 'react-router-dom';

export const TAPOS = {
  blocksBehind: 3,
  expireSeconds: 300,  // Increased expiration time for testing
  broadcast: true
};

// Helper function to initialize and perform a transaction
export const InitTransaction = async (dataTrx) => {
  try {
    const session = await sessionKit.restore();
    if (!session) {
      throw new Error("No session found");
    }

    // Debug log for session state before the transaction
    console.log("Session state before transaction:", {
      actor: session.permissionLevel.actor,
      permission: session.permissionLevel.permission,
      actions: dataTrx.actions
    });

    // Ensure actor is included in each action authorization if not already set
    const actions = dataTrx.actions.map((action) => ({
      ...action,
      authorization: [
        {
          actor: session.permissionLevel.actor,
          permission: session.permissionLevel.permission || 'active',
        },
      ],
    }));

    // Debug log for transaction data
    console.log("Sending transaction with:", { actions, TAPOS });
    console.log("Transaction authorization:", actions[0].authorization);

    const transaction = await session.transact({ actions }, TAPOS);

    if (transaction) {
      return {
        transactionId: String(transaction.resolved?.transaction.id),
        actions: actions
      };
    }
  } catch (error) {
    console.error('Detailed transaction error:', error);
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
      console.log('Session saved to localStorage:', sessionToSave);
    } catch (err) {
      console.error('Error saving session to localStorage:', err);
    }
  }, []);

  const handleRestoreSession = useCallback(async () => {
    try {
      const restoredSession = await sessionKit.restore();
      if (restoredSession) {
        setSession(restoredSession);
        console.log('Session restored:', restoredSession);
      }
    } catch (err) {
      console.error('Error restoring session:', err);
      setError('Failed to restore session');
    }
  }, []);

  const handleLogin = useCallback(async (walletPluginId) => {
    try {
      const result = await sessionKit.login({ walletPluginId });
      if (result && result.session) {
        setSession(result.session);
        setSelectedWalletPlugin(walletPluginId);
        await saveSessionToLocal(result.session);
      }
    } catch (err) {
      setError(err.message || 'Login failed');
      console.error('Login error:', err);
    }
  }, [saveSessionToLocal]);

  const handleLogout = useCallback(async () => {
    try {
      if (session) {
        await sessionKit.logout(session);
        setSession(null);
        clearSession();
        console.log('User logged out successfully.');
        navigate('/');
      }
    } catch (err) {
      console.error('Error during logout:', err);
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
    setSelectedWalletPlugin 
  };
};

export default useSession;
