import React, { Suspense } from 'react';
import { Navigate, NavLink, useLocation, useParams } from 'react-router-dom';
import { useSession } from '../hooks/SessionContext';
import './MarketHub.css';

const ShopPage = React.lazy(() => import('./ShopPage'));
const MarketplacePage = React.lazy(() => import('./MarketplacePage'));
const RecipesPage = React.lazy(() => import('./RecipesPage'));
const sections = [
  { key: 'shop', title: 'Shop', subtitle: 'Official items', description: 'Buy official CleanupCentr packs and game items. Check live prices, supply, and pack contents before buying.' },
  { key: 'listings', title: 'Player Marketplace', subtitle: 'Buy and sell NFTs', description: 'Trade CleanupCentr NFTs with other players. Compare prices, sell your NFTs, and manage your listings.' },
  { key: 'blends', title: 'Blends', subtitle: 'Create and upgrade', description: 'Turn your resources into new assets. Check recipe requirements, your available ingredients, and the possible outputs.' },
];

// Keep old bookmarks and their query/hash context usable after consolidation.
export function MarketRedirect({ section = 'shop' }) {
  const location = useLocation();
  return <Navigate replace to={{ pathname: `/market/${section}`, search: location.search, hash: location.hash }} state={location.state} />;
}

export default function MarketHub() {
  const { '*': section } = useParams();
  const { session, loading, handleLogin } = useSession();
  const active = sections.find(item => item.key === section);
  if (!active) return <MarketRedirect />;
  return <div className="market-hub">
    <header className="market-hub-header">
      <span className="market-hub-eyebrow">CLEANUPCENTR · WAX MAINNET</span>
      <h1>Market</h1>
      <p>Shop, trade, and blend. Everything you need to grow your game.</p>
    </header>
    <nav className="market-hub-tabs" aria-label="Market sections">
      {sections.map(item => <NavLink key={item.key} to={`/market/${item.key}`} className={({ isActive }) => isActive ? 'market-hub-tab active' : 'market-hub-tab'}><strong>{item.title}</strong><span>{item.subtitle}</span></NavLink>)}
    </nav>
    <section className="market-hub-intro" aria-label={`${active.title} overview`}><h2>{active.title}</h2><p>{active.description}</p></section>
    <div className="market-hub-content" key={section}>
      <Suspense fallback={<p className="market-hub-status" role="status">Loading {active.title.toLowerCase()}…</p>}>
        {section === 'shop' && <ShopPage session={session} onLogin={handleLogin} embedded />}
        {section === 'listings' && <MarketplacePage embedded />}
        {section === 'blends' && (loading ? <p className="market-hub-status" role="status">Restoring your wallet session…</p> : session ? <RecipesPage embedded /> : <div className="market-hub-connect"><h3>Connect to view your blends</h3><p>See your recipes, available ingredients, and what you can make.</p><button onClick={() => handleLogin()}>Connect wallet</button></div>)}
      </Suspense>
    </div>
  </div>;
}
