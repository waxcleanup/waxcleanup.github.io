// src/components/HomePage.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useSession from '../hooks/useSession';
import logo from '../assets/cleanupcentr.png';
import './HomePage.css';
import { JsonRpc } from 'eosjs';

const rpc = new JsonRpc('https://api.wax.alohaeos.com');

const HomePage = () => {
  const { session, handleLogin, handleLogout } = useSession();
  const [accountInfo, setAccountInfo] = useState(null);

  useEffect(() => {
    console.log('🚀 Full session object:', session);
    if (session?.permissionLevel?.actor) {
      const actor = String(session.permissionLevel.actor);
      console.log('✅ actor from permissionLevel:', actor);
      fetchAccountInfo(actor);
    }
  }, [session]);

  const fetchAccountInfo = async (accountName) => {
    try {
      const result = await rpc.get_account(accountName);
      setAccountInfo(result);
    } catch (error) {
      console.error('Failed to fetch account info:', error);
    }
  };

  let actor = '';
  if (session?.permissionLevel?.actor) {
    actor = String(session.permissionLevel.actor);
  }

  const renderUsageBar = (used, max, label) => {
    const percent = Math.min((used / max) * 100, 100).toFixed(2);
    return (
      <div className="usage-bar">
        <div className="usage-label">{label}: {used} / {max}</div>
        <div className="usage-track">
          <div className="usage-fill" style={{ width: `${percent}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="homepage-container">
      <header className="homepage-header">
        <img src={logo} alt="Cleanup Logo" className="homepage-logo" />
        <h1 className="homepage-title">TheCleanupCentr</h1>
      </header>
      {!session ? (
        <div className="homepage-login">
          <button onClick={() => handleLogin('anchor')} className="homepage-login-button">
            Login
          </button>
        </div>
      ) : (
        <div className="homepage-session">
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
          <div className="homepage-buttons">
            <Link to="/burn">
              <button className="homepage-nav-button burn-button">🔥 Burn Center</button>
            </Link>
            <Link to="/farming">
              <button className="homepage-nav-button farm-button">🌿 Farm Center</button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
