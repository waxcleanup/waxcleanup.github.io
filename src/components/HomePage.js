import BurnLeaderboard from './BurnLeaderboard';
import BurnTotal from './BurnTotal';
// src/components/HomePage.js
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/SessionContext';
import logo from '../assets/cleanupcentr.png';
import './HomePage.css';

export default function HomePage() {
  const { session, handleLogin } = useSession();
  const navigate = useNavigate();

  const LINKS = useMemo(() => {
    const atomicHubCollectionUrl =
      process.env.REACT_APP_ATOMICHUB_COLLECTION_URL ||
      'https://wax.atomichub.io/explorer/collection/wax-mainnet/cleanupcentr';

    const discordInviteUrl =
      process.env.REACT_APP_DISCORD_INVITE_URL ||
      'https://discord.gg/kCvQXWHMVu';

    const telegramUrl =
      process.env.REACT_APP_TELEGRAM_URL || 'https://t.me/TheCleanUpCentr';

    const twitterUrl =
      process.env.REACT_APP_TWITTER_URL || 'https://x.com/TheCleanUpCentr';

    return {
      atomicHubCollectionUrl,
      discordInviteUrl,
      telegramUrl,
      twitterUrl,
    };
  }, []);


  const ProjectIntro = () => (
    <section className="homepage-banner" aria-labelledby="homepage-about-title">
      <div className="homepage-banner-copy">
      <h2 id="homepage-about-title">About CleanupCentr</h2>
      <p>Burn approved NFTs on WAX and earn CINDER. Put your rewards to work with farming and machines.</p>
      </div>
      <div className="homepage-banner-actions">
      <button className="homepage-shop-link" onClick={() => navigate('/market/shop')}>View Shop <span aria-hidden="true">→</span></button>
      <nav className="homepage-community-links" aria-label="Collection and community">
        <a href={LINKS.atomicHubCollectionUrl} target="_blank" rel="noopener noreferrer">AtomicHub <span aria-hidden="true">↗</span></a>
        <a href={LINKS.discordInviteUrl} target="_blank" rel="noopener noreferrer">Discord <span aria-hidden="true">↗</span></a>
        <a href={LINKS.telegramUrl} target="_blank" rel="noopener noreferrer">Telegram <span aria-hidden="true">↗</span></a>
        <a href={LINKS.twitterUrl} target="_blank" rel="noopener noreferrer">Follow on X <span aria-hidden="true">↗</span></a>
      </nav>
      </div>

    </section>
  );

  return (
    <div className="homepage-container">

      <header className="homepage-header">
        <img src={logo} alt="Cleanup Logo" className="homepage-logo" />
        <h1 className="homepage-title">TheCleanupCentr</h1>
      </header>

      <div className="homepage-dashboard">
        <ProjectIntro />
        <div className="homepage-burn-activity">
          <BurnTotal />
          <BurnLeaderboard />

          {!session && (
            <section className="homepage-primary">
              <div className="homepage-login">
                <button
                  onClick={() => handleLogin()}
                  className="homepage-login-button"
                >
                  Login
                </button>
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
