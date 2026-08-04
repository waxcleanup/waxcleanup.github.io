// src/components/HomePage.js
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/SessionContext';
import logo from '../assets/cleanupcentr.png';
import MessageBoard from './MessageBoard';
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
            onClick={() => navigate('/shop')}
            title="Browse machines, cores, and packs"
          >
            View Shop
          </button>

          <button
            className="homepage-link-button"
            onClick={() => openLink(LINKS.atomicHubCollectionUrl)}
            title="View the CleanupCentr collection on AtomicHub"
          >
            View Collection (AtomicHub)
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
            Tip: Browse the Shop without logging in, then connect your wallet when you're ready
            to buy or manage your machines.
          </p>
        </div>
      </div>
    </section>
  );

  return (
    <div className="homepage-container">
      <MessageBoard />

      <header className="homepage-header">
        <img src={logo} alt="Cleanup Logo" className="homepage-logo" />
        <h1 className="homepage-title">TheCleanupCentr</h1>
      </header>

      {!session && (
        <section className="homepage-primary">
          <div className="homepage-login">
            <button
              onClick={() => handleLogin('anchor')}
              className="homepage-login-button"
            >
              Login
            </button>
          </div>
        </section>
      )}

      <ProjectIntro />
    </div>
  );
}