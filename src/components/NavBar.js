// src/components/NavBar.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSession } from '../hooks/SessionContext';
import { useSkin } from '../hooks/SkinContext';
import MusicPlayerMini from './MusicPlayerMini';
import SkinSelector      from './SkinSelector';
import logo              from '../assets/cleanupcentr.png';  // ← import your logo image
import './NavBar.css';

export default function NavBar() {
  const { session, handleLogin, handleLogout } = useSession();
  const { skins, activeSkin, setActiveSkin }    = useSkin();

  // Don’t render the nav bar or player if not authenticated
  if (!session) return null;

  return (
    <header>
      <nav className="nav-bar">
        <div className="nav-logo">
          <img
            src={logo}
            alt="CleanupCentr"
            className="nav-logo-img"
            style={{ height: '24px' }}  // smaller logo height
          />
          <span className="nav-logo-text">CleanupCentr</span>
        </div>
        <ul className="nav-links">
          <li><NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Home</NavLink></li>
          <li><NavLink to="/burn" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Burn</NavLink></li>
          <li><NavLink to="/farming" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Farming</NavLink></li>
          <li><NavLink to="/collections" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Collections</NavLink></li>
          <li><NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Dashboard</NavLink></li>
          <li><NavLink to="/markets" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Markets</NavLink></li>
        </ul>

        {/* Skin selector dropdown */}
        <div className="nav-skins">
          <SkinSelector
            skins={skins}
            activeSkin={activeSkin}
            onChange={setActiveSkin}
          />
        </div>

        {/* Auth buttons */}
        <div className="nav-auth">
          {!session ? (
            <button onClick={() => handleLogin('anchor')} className="nav-button">Login</button>
          ) : (
            <button onClick={handleLogout} className="nav-button">Logout</button>
          )}
        </div>
      </nav>

      {/* mini-player below the nav links */}
      <div className="nav-music-player">
        <MusicPlayerMini />
      </div>
    </header>
  );
}
