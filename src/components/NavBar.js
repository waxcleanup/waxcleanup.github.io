// src/components/NavBar.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSession } from '../hooks/SessionContext';
import { useSkin } from '../hooks/SkinContext';
import MusicPlayerMini from './MusicPlayerMini';
import SkinSelector from './SkinSelector';
import logo from '../assets/cleanupcentr.png';
import './NavBar.css';

export default function NavBar() {
  const { session, handleLogin, handleLogout } = useSession();
  const { skins, activeSkin, setActiveSkin } = useSkin();

  const isLoggedIn = !!session;

  return (
    <header>
      <nav className="nav-bar">
        <div className="nav-logo">
          <img
            src={logo}
            alt="CleanupCentr"
            className="nav-logo-img"
            style={{ height: '24px' }}
          />
          <span className="nav-logo-text">CleanupCentr</span>
        </div>

        <ul className="nav-links">
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Home
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/shop"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Shop
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/guide"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Guide
            </NavLink>
          </li>

          {isLoggedIn && (
            <>
              <li>
                <NavLink
                  to="/burn"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Burn
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/farming"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Farming
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/machines"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Machines
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/recipes"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Blends
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/collections"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Encyclopedia
                </NavLink>
              </li>
            </>
          )}
        </ul>

        {isLoggedIn && (
          <div className="nav-skins">
            <SkinSelector
              skins={skins}
              activeSkin={activeSkin}
              onChange={setActiveSkin}
            />
          </div>
        )}

        <div className="nav-auth">
          {!isLoggedIn ? (
            <button onClick={() => handleLogin('anchor')} className="nav-button">
              Login
            </button>
          ) : (
            <button onClick={handleLogout} className="nav-button">
              Logout
            </button>
          )}
        </div>
      </nav>

      {isLoggedIn && (
        <div className="nav-music-player">
          <MusicPlayerMini />
        </div>
      )}
    </header>
  );
}