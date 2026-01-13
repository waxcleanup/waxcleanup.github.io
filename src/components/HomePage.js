// src/components/HomePage.js
import React, { useEffect, useMemo, useState } from 'react';
import { JsonRpc } from 'eosjs';
import { useSession } from '../hooks/SessionContext';
import logo from '../assets/cleanupcentr.png';
import MessageBoard from './MessageBoard';
import './HomePage.css';

const rpc = new JsonRpc('https://api.wax.alohaeos.com');

export default function HomePage() {
  const { session, handleLogin, handleLogout } = useSession();
  const [accountInfo, setAccountInfo] = useState(null);

  // ---- configurable links (safe defaults) ----
  const LINKS = useMemo(() => {
    const neftyCollectionUrl =
      process.env.REACT_APP_NEFTY_COLLECTION_URL ||
      'https://neftyblocks.com/collection/cleanupcentr';

    const discordInviteUrl =
      process.env.REACT_APP_DISCORD_INVITE_URL ||
      'https://discord.gg/kCvQXWHMVu';

    const telegramUrl =
      process.env.REACT_APP_TELEGRAM_URL || 'https://t.me/TheCleanUpCentr';

    const twitterUrl =
      process.env.REACT_APP_TWITTER_URL || 'https://x.com/TheCleanUpCentr';

    return {
      neftyCollectionUrl,
      discordInviteUrl,
      telegramUrl,
      twitterUrl,
    };
  }, []);

  useEffect(() => {
    if (session?.permissionLevel?.actor) {
      const actor = String(session.permissionLevel.actor);
      rpc.get_account(actor)
        .then((res) => setAccountInfo(res))
        .catch((err) => console.error('Failed to fetch account info:', err));
    } else {
      setAccountInfo(null);
    }
  }, [session]);

  const renderUsageBar = (used, max, label) => {
    const safeMax = Number(max || 0);
    const safeUsed = Number(used || 0);
    const percent =
      safeMax > 0 ? Math.min((safeUsed / safeMax) * 100, 100).toFixed(2) : '0.00';

    return (
      <div className="usage-bar">
        <div className="usage-label">
          {label}: {safeUsed} / {safeMax}
        </div>
        <div className="usage-track">
          <div className="usage-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  };

  const openLink = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const ProjectIntro = () => (
    <section className="homepage-intro">
      <div className="intro-card">
        <h2 className="intro-title">Welcome to TheCleanupCentr</h2>
        <p className="intro-text">
          CleanupCentr is a WAX on-chain ecosystem focused on NFT cleanup and farming.
          Burn approved NFTs using Incinerators, earn CINDER rewards, power farms with
          energy, and grow your yield through plots, tools, and weather-driven mechanics.
        </p>

        <div className="intro-actions">
          <button
            className="homepage-link-button"
            onClick={() => openLink(LINKS.neftyCollectionUrl)}
            title="View official collections on NeftyBlocks"
          >
            View Collections (NeftyBlocks)
          </button>

          <button
            className="homepage-link-button"
            onClick={() => openLink(LINKS.discordInviteUrl)}
            title="Join the community on Discord"
          >
            Join Discord
          </button>

          <button
            className="homepage-link-button"
            onClick={() => openLink(LINKS.telegramUrl)}
            title="Join the Telegram"
          >
            Telegram
          </button>

          <button
            className="homepage-link-button"
            onClick={() => openLink(LINKS.twitterUrl)}
            title="Follow on X"
          >
            Follow on X
          </button>
        </div>

        <div className="intro-notes">
          <p className="intro-note">
            Tip: Bookmark pages like /farming or /burn — refresh is supported on GitHub Pages
            via the 404 redirect-path fix.
          </p>
        </div>
      </div>
    </section>
  );

  const actor = session?.permissionLevel?.actor
    ? String(session.permissionLevel.actor)
    : null;

  return (
    <div className="homepage-container">
      <MessageBoard />

      <header className="homepage-header">
        <img src={logo} alt="Cleanup Logo" className="homepage-logo" />
        <h1 className="homepage-title">TheCleanupCentr</h1>
      </header>

      {/* 🔑 PRIMARY AREA (closer to top): Login OR Wallet Info */}
      <section className="homepage-primary">
        {!session ? (
          <div className="homepage-login">
            <button
              onClick={() => handleLogin('anchor')}
              className="homepage-login-button"
            >
              Login
            </button>
          </div>
        ) : (
          <div className="homepage-wallet">
            <p className="homepage-welcome">
              Welcome, <strong>{actor}</strong>!
            </p>

            {accountInfo && (
              <div className="account-info compact">
                <p>
                  <strong>Balance:</strong>{' '}
                  {accountInfo.core_liquid_balance || '0.00000000 WAX'}
                </p>

                {renderUsageBar(
                  accountInfo.cpu_limit?.used,
                  accountInfo.cpu_limit?.max,
                  'CPU'
                )}
                {renderUsageBar(
                  accountInfo.ram_usage,
                  accountInfo.ram_quota,
                  'RAM'
                )}
              </div>
            )}

            <button onClick={handleLogout} className="homepage-logout-button">
              Log out
            </button>
          </div>
        )}
      </section>

      {/* 📘 Intro + links below primary area */}
      <ProjectIntro />
    </div>
  );
}

