// src/components/HomePage.js
import React, { useEffect, useState } from 'react';
import { JsonRpc } from 'eosjs';
import { useSession } from '../hooks/SessionContext';
import logo from '../assets/cleanupcentr.png';
import MessageBoard from './MessageBoard';
import './HomePage.css';

const rpc = new JsonRpc('https://api.wax.alohaeos.com');

export default function HomePage() {
  const { session, handleLogin, handleLogout } = useSession();
  const [accountInfo, setAccountInfo] = useState(null);

  useEffect(() => {
    if (session?.permissionLevel?.actor) {
      const actor = String(session.permissionLevel.actor);
      rpc.get_account(actor)
        .then(res => setAccountInfo(res))
        .catch(err => console.error('Failed to fetch account info:', err));
    }
  }, [session]);

  const renderUsageBar = (used, max, label) => {
    const percent = Math.min((used / max) * 100, 100).toFixed(2);
    return (
      <div className="usage-bar">
        <div className="usage-label">{label}: {used} / {max}</div>
        <div className="usage-track">
          <div className="usage-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  };

  // If not logged in
  if (!session) {
    return (
      <div className="homepage-container">
        <MessageBoard />
        <header className="homepage-header">
          <img src={logo} alt="Cleanup Logo" className="homepage-logo" />
          <h1 className="homepage-title">TheCleanupCentr</h1>
        </header>
        <div className="homepage-login">
          <button onClick={() => handleLogin('anchor')} className="homepage-login-button">
            Login
          </button>
        </div>
      </div>
    );
  }

  // If logged in
  const actor = String(session.permissionLevel.actor);
  return (
    <div className="homepage-session">
      <MessageBoard />
      <p className="homepage-welcome">Welcome, <strong>{actor}</strong>!</p>

      {accountInfo && (
        <div className="account-info">
          <p><strong>Balance:</strong> {accountInfo.core_liquid_balance || '0.00000000 WAX'}</p>
          {renderUsageBar(accountInfo.cpu_limit.used, accountInfo.cpu_limit.max, 'CPU')}
          {renderUsageBar(accountInfo.ram_usage, accountInfo.ram_quota, 'RAM')}
        </div>
      )}

      <button onClick={handleLogout} className="homepage-logout-button">
        Log out
      </button>
    </div>
  );
}
