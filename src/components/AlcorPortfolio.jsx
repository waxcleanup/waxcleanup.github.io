import TokenLogo from './TokenLogo';
import React, { useEffect, useMemo, useState } from 'react';
import { fetchAllPositions } from '../services/alcorMainnet';
import './AlcorPortfolio.css';
import PortfolioLiquidity from './PortfolioLiquidity';

const usd = value => value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const feeUsd = value => value == null ? 'Unavailable' : value.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 4 });
const readableAsset = value => value.replace(/^(\d+)/, whole => whole.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
export default function AlcorPortfolio({ actor, onLogin, refresh }) {
  const [state, setState] = useState({ actor: '', loading: false, groups: [] });
  const [retry, setRetry] = useState(0); const [search, setSearch] = useState(''); const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('value');
  const [management, setManagement] = useState(null); const [transactionId, setTransactionId] = useState('');
  useEffect(() => {
    let current = true;
    setState({ actor, loading: !!actor, groups: [] });
    if (actor) fetchAllPositions(actor).then(result => {
      if (current) setState({ ...result, actor, loading: false });
    }).catch(error => { if (current) setState({ actor, loading: false, groups: [], error: error.message || 'Unable to load Alcor positions.' }); });
    return () => { current = false; };
  }, [actor, refresh, retry]);
  const groups = state.actor === actor ? state.groups : [];
  const positions = groups.flatMap(g => g.positions);
  const unpriced = positions.filter(p => p.valueUSD === null).length;
  const value = positions.reduce((sum, p) => sum + (p.valueUSD || 0), 0);
  const pricedFees = positions.filter(p => p.feesUSD != null);
  const totalFees = pricedFees.reduce((sum, p) => sum + p.feesUSD, 0);
  const loading = !!actor && (state.actor !== actor || state.loading);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return groups.flatMap(group => {
      const groupText = [group.poolId, group.tokenA?.symbol, group.tokenB?.symbol, group.tokenA?.contract, group.tokenB?.contract].join(' ').toLowerCase();
      return group.positions.filter(p => (filter === 'all' || (filter === 'closed' ? p.closed : !p.closed)) &&
        (!query || `${groupText} ${p.id} ${p.amountA} ${p.amountB}`.toLowerCase().includes(query))).map(position => ({ group, position }));
    }).sort((a, b) => sort === 'newest' ? Number(b.position.id) - Number(a.position.id) :
      ((sort === 'fees' ? b.position.feesUSD : b.position.valueUSD) ?? -1) - ((sort === 'fees' ? a.position.feesUSD : a.position.valueUSD) ?? -1));
  }, [groups, search, filter, sort]);
  return <section className="exchange-card exchange-portfolio" aria-labelledby="portfolio-title">
    <div className="exchange-card-heading"><div><div className="exchange-eyebrow">YOUR ALCOR LIQUIDITY</div><h2 id="portfolio-title">All my liquidity pools</h2></div><a href="https://wax.alcor.exchange/positions" target="_blank" rel="noreferrer">Open Alcor ↗</a></div>
    <p className="exchange-muted">All Alcor liquidity positions for {actor || 'your connected WAX account'}, including tokens outside CleanupCentr.</p>
    {!actor ? <div className="exchange-empty-position">Connect your wallet to view all your pools.<div><button className="exchange-primary" onClick={() => onLogin()}>Connect wallet</button></div></div> : <>
      {loading ? <p role="status">Loading all your Alcor positions…</p> : state.error ? <div className="exchange-error" role="alert">{state.error} <button onClick={() => setRetry(n => n + 1)}>Retry portfolio</button></div> : <>
        <div className="portfolio-summary"><div><span>Total value</span><strong>{positions.length && unpriced === positions.length ? 'Unavailable' : usd(value)}</strong>{unpriced > 0 && <small>{unpriced} unpriced</small>}</div><div><span>Unclaimed fees</span><strong className="portfolio-green">{positions.length && !pricedFees.length ? 'Unavailable' : feeUsd(totalFees)}</strong>{pricedFees.length < positions.length && <small>{positions.length - pricedFees.length} unpriced</small>}</div><div><span>In range</span><strong>{positions.filter(p => !p.closed && p.inRange).length}<small> / {positions.filter(p => !p.closed).length} open</small></strong></div><div><span>Positions</span><strong>{positions.length}<small> across {groups.length} pools</small></strong></div></div>
        <div className="exchange-portfolio-filters"><label>Search your pools<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Token, contract, pool or position ID" /></label><label>Show positions<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All positions</option><option value="open">Open positions</option><option value="closed">Closed positions</option></select></label></div>
        <div className="portfolio-list-toolbar"><span>Positions <b>{visible.length}</b></span><div role="group" aria-label="Sort positions">{[['value', 'Value'], ['fees', 'Fees'], ['newest', 'Newest']].map(([key, label]) => <button key={key} aria-pressed={sort === key} onClick={() => setSort(key)}>{label}{sort === key ? ' ↓' : ''}</button>)}</div></div>
        {state.metadataUnavailable && <p className="exchange-warning">Pool details are unavailable. Your positions are still listed by pool ID.</p>}
        {!positions.length ? <p className="exchange-empty-position">No Alcor liquidity positions found for {actor}.</p> : !visible.length ? <p className="exchange-empty-position">No positions match your search or filter.</p> : <div className="portfolio-position-list">{visible.map(({ group, position: p }) => <article className="portfolio-position-row" key={`${group.poolId}:${p.id}`} aria-label={`Position ${p.id}`}>
          <div className="portfolio-pair"><div className="portfolio-token-icons" aria-hidden="true"><TokenLogo token={group.tokenA} size={28} /><TokenLogo token={group.tokenB} size={28} /></div><div><h3>{group.tokenA && group.tokenB ? `${group.tokenA.symbol}/${group.tokenB.symbol}` : `Pool #${group.poolId}`}</h3><small>{group.fee !== null ? `${group.fee / 10000}% · ` : ''}<span className={p.inRange && !p.closed ? 'portfolio-green' : ''}>{p.closed ? 'Closed' : p.inRange === null ? 'Range unavailable' : p.inRange ? '● In range' : 'Out of range'}</span>{p.locked ? ' · Locked' : ''}</small><small className="portfolio-position-id">Position #{p.id}</small></div></div>
          <div className="portfolio-assets"><strong>{p.valueUSD == null ? 'Value unavailable' : usd(p.valueUSD)}</strong><div><span>{readableAsset(p.amountA)}</span><span className="portfolio-plus">+</span><span>{readableAsset(p.amountB)}</span></div><small title="Token contracts">{group.tokenA?.contract || 'Unknown contract'} · {group.tokenB?.contract || 'Unknown contract'}</small></div>
          <div className="portfolio-fees"><strong className="portfolio-green">{feeUsd(p.feesUSD)}</strong><small>Unclaimed fees</small><small>{readableAsset(p.feesA)}</small><small>{readableAsset(p.feesB)}</small></div>
          <div className="portfolio-row-actions"><a href={`https://wax.alcor.exchange/positions/${p.id}`} target="_blank" rel="noreferrer" aria-label="View position on Alcor ↗" title="View position on Alcor">›</a><button onClick={() => setManagement({ actor, group, position: p })}>Manage liquidity</button></div>
        </article>)}</div>}
        <p className="exchange-muted">Source: Alcor account index · Updated {new Date(state.updatedAt).toLocaleTimeString()}. Amounts and USD values are estimates; the index may lag recent transactions. Refresh to reload.</p>
      </>}
    </>}
    {transactionId && <p className="exchange-success" role="status">Liquidity transaction submitted. <a href={`https://waxblock.io/transaction/${transactionId}`} target="_blank" rel="noreferrer">View transaction ↗</a></p>}
    {management && management.actor === actor && <PortfolioLiquidity key={`${actor}:${management.group.poolId}:${management.position.id}`} actor={actor} group={management.group} position={management.position} onClose={() => setManagement(null)} onComplete={result => { setManagement(null); setTransactionId(result.transactionId); setRetry(n => n + 1); }} />}
  </section>;
}
