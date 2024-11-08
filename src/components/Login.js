import React, { useState } from 'react';
import useSession from '../hooks/useSession';

const Login = () => {
  const { handleLogin, error, isModalOpen, storedAccounts, handleAccountSelect, selectedWalletPlugin, setSelectedWalletPlugin } = useSession();
  const [wallet, setWallet] = useState('');

  const handleWalletChange = (event) => {
    setWallet(event.target.value);
  };

  const onLogin = async () => {
    await handleLogin(wallet);
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h2>Login to WaxCleanup</h2>
      
      {/* Wallet Selection Dropdown */}
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="wallet-select">Select Wallet:</label>
        <select
          id="wallet-select"
          value={wallet}
          onChange={handleWalletChange}
          style={{
            padding: '10px',
            margin: '10px 0',
            borderRadius: '5px',
            border: '1px solid #ddd',
            fontSize: '14px',
          }}
        >
          <option value="">-- Select Wallet --</option>
          <option value="anchor">Anchor Wallet</option>
          <option value="wombat">Wombat Wallet</option>
          <option value="cloudwallet">WAX Cloud Wallet</option>
        </select>
      </div>

      {/* Login Button */}
      <button
        onClick={onLogin}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: '#fff',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        Login
      </button>

      {/* Error Message */}
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}

      {/* Account Selection Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0px 0px 15px rgba(0,0,0,0.3)',
          zIndex: 1000
        }}>
          <h3>Select an Account</h3>
          <ul>
            {storedAccounts.map((account) => (
              <li key={account.accountName} onClick={() => handleAccountSelect(account)} style={{ cursor: 'pointer', padding: '5px' }}>
                {account.accountName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Login;
