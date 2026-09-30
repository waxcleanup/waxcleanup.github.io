/* global BigInt */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from '../hooks/SessionContext';
import { TOKENS, identity, formatRaw, asset, rawAmount, poolTokens, assertReview } from '../services/exchangeMath';
import { fetchRouteQuote, executeRouteReview, fetchPools, fetchPool, fetchBalances, fetchQuote, fetchPositions, fetchPositionQuote, executeReview, fetchHistory } from '../services/alcorMainnet';
import './ExchangePage.css';
import {assertRouteReview} from '../services/exchangeRoutes';
import AlcorPortfolio from './AlcorPortfolio';
import WalletPortfolio from './WalletPortfolio';
import AlcorFarms from './AlcorFarms';
import PriceChart from './ExchangeChart';
import ExchangeUsd from './ExchangeUsd';
import ExchangeActivity, {SwapRows} from './ExchangeActivity';
import ExchangePoolComparison from './ExchangePoolComparison';
import TokenLogo from './TokenLogo';
import ExchangeTokenInfo from './ExchangeTokenInfo';

const compact = value => Number(value).toLocaleString(undefined, { maximumSignificantDigits: 7 });
const errorText = e => /invariant|insufficient|reserves/i.test(e?.message || '') ? 'This pool cannot quote that amount right now. Try a smaller amount or another fee tier.' : e?.message || 'Exchange data is unavailable. Please retry.';
const short = (raw, token) => compact(formatRaw(raw, token));
const samePair = (pool, a, b) => [identity(pool.tokenA), identity(pool.tokenB)].includes(identity(a)) && [identity(pool.tokenA), identity(pool.tokenB)].includes(identity(b)) && a.key !== b.key;

function ReviewDialog({ quote, now, busy, onClose, onConfirm }) {
  const ref = useRef();
  useEffect(() => { ref.current.showModal(); }, []);
  const remaining = Math.max(0, Math.ceil((quote.expiresAt - now) / 1000));
  const title = { swap: 'Review swap', add: 'Review liquidity deposit', remove: 'Review withdrawal', collect: 'Review fee collection' }[quote.kind];
  return <dialog ref={ref} className="exchange-review" aria-labelledby="exchange-review-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <div className="exchange-eyebrow">WAX MAINNET · REAL ASSETS</div><h2 id="exchange-review-title">{title}</h2>
    <dl className="exchange-details">
      <div><dt>Wallet / recipient</dt><dd>{quote.actor}</dd></div>
      <div><dt>{quote.route ? "Route pools" : "Pool"}</dt><dd>#{quote.route ? quote.route.join(" → #") : quote.poolId} · swap.alcor</dd></div>{quote.route && <div><dt>Token path</dt><dd>{[quote.inputToken,...quote.hops.map(h=>h.outputToken)].map(t=>t.symbol).join(" → ")}</dd></div>}
      {quote.kind === 'swap' ? <>
        <div><dt>You pay</dt><dd>{asset(quote.inputRaw, quote.inputToken)}</dd></div>
        <div><dt>Estimated receive</dt><dd>{asset(quote.outputRaw, quote.outputToken)}</dd></div>
        <div><dt>Minimum received</dt><dd>{asset(quote.minimum, quote.outputToken)}</dd></div>
        <div><dt>Price impact incl. fee</dt><dd>{(quote.impactBps / 100).toFixed(2)}%</dd></div>
      </> : <>
        {quote.kind !== 'collect' && <><div><dt>{quote.kind === 'add' ? 'Deposit' : 'Estimated return'}</dt><dd>{asset(quote.rawA, quote.tokenA)}<br />{asset(quote.rawB, quote.tokenB)}</dd></div>
          <div><dt>{quote.kind === 'add' ? 'Minimum used' : 'Minimum returned'}</dt><dd>{asset(quote.minA, quote.tokenA)}<br />{asset(quote.minB, quote.tokenB)}</dd></div></>}
        {quote.kind === 'add' ? <div><dt>Position range</dt><dd>Full range</dd></div> : <div><dt>Estimated fees collected</dt><dd>{asset(quote.feesA, quote.tokenA)}<br />{asset(quote.feesB, quote.tokenB)}</dd></div>}
        {quote.kind === 'remove' && <div><dt>Liquidity withdrawn</dt><dd>{quote.percent}% of this position</dd></div>}
      </>}
      <div><dt>Slippage tolerance</dt><dd>{quote.slippageBps / 100}%</dd></div>
      <div><dt>Review expires</dt><dd>{remaining ? `In ${remaining}s` : 'Expired — close and refresh'}</dd></div>
    </dl>
    <p className="exchange-muted">{quote.kind === 'add' ? 'Providing liquidity exposes you to changing token prices and impermanent loss. Deposits and position creation are submitted together.' : 'Your wallet receives the exact amounts and on-chain minimums shown here.'}</p>
    {quote.kind === 'swap' && quote.impactBps >= 300 && <p className="exchange-warning">High price impact. Consider a smaller amount or a different pool.</p>}
    <div className="exchange-review-actions"><button disabled={busy} onClick={onClose}>Back</button><button className="exchange-primary" disabled={busy || !remaining} onClick={onConfirm}>{busy ? 'Waiting for wallet…' : 'Confirm in wallet'}</button></div>
  </dialog>;
}

export default function ExchangePage() {
  const { session, handleLogin } = useSession();
  const actor = String(session?.permissionLevel?.actor || '');
  const [pools, setPools] = useState([]); const [poolError, setPoolError] = useState(''); const [poolsLoading, setPoolsLoading] = useState(true);
  const [autoRoute,setAutoRoute]=useState(false);
  const [from, setFrom] = useState('wax'); const [to, setTo] = useState('cinder'); const [poolId, setPoolId] = useState('5113');
  const [poolRow, setPoolRow] = useState(null); const [rowError, setRowError] = useState('');
  const [mode, setMode] = useState(() => new URLSearchParams(window.location.search).get('view') === 'positions' ? 'portfolio' : 'swap'); const [amount, setAmount] = useState(''); const [slippage, setSlippage] = useState(50);
  const [balances, setBalances] = useState({}); const [quote, setQuote] = useState(null); const [quoting, setQuoting] = useState(false); const [quoteError, setQuoteError] = useState('');
  const [positions, setPositions] = useState([]); const [positionsLoading, setPositionsLoading] = useState(false); const [positionsError, setPositionsError] = useState(''); const [percent, setPercent] = useState(100);
  const [review, setReview] = useState(null); const [busy, setBusy] = useState(false); const busyRef = useRef(false);
  const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const [refresh, setRefresh] = useState(0); const [quoteRefresh, setQuoteRefresh] = useState(0); const [now, setNow] = useState(Date.now());
  const [chartExpanded,setChartExpanded]=useState(()=>window.innerWidth>760);
  const [range, setRange] = useState('7d'); const [history, setHistory] = useState([]); const [historyLoading, setHistoryLoading] = useState(false); const [historyError, setHistoryError] = useState(false);
  const routed=autoRoute && mode==='swap';
  const input = TOKENS.find(t => t.key === from); const output = TOKENS.find(t => t.key === to);
  const choices = useMemo(() => pools.filter(p => samePair(p, input, output)).sort((a, b) => Number(b.funded) - Number(a.funded) || a.fee - b.fee), [pools, input, output]);
  const selected = choices.find(p => p.id === poolId);
  const contextKey = `${routed}|${actor}|${poolId}|${mode}|${from}|${to}|${amount}|${slippage}|${percent}`;
  const latestKey = useRef(contextKey); latestKey.current = contextKey;
  const context = { actor, poolId: routed ? 'auto' : poolId, kind: mode, inputToken: input, outputToken: output, amount, slippageBps: slippage };
  const quoteMatches = quote && quote.poolId === (routed ? 'auto' : poolId) && (!routed || identity(quote.outputToken)===identity(output)) && quote.actor === actor && quote.kind === mode && quote.inputToken.key === from && quote.slippageBps === slippage && (() => { try { return rawAmount(amount, input).toString() === quote.inputRaw; } catch { return false; } })();
  const liveQuote = quoteMatches ? quote : null;
  const expired = !liveQuote || now >= liveQuote.expiresAt;
  const quotedOutput = liveQuote && (mode === 'swap' ? formatRaw(liveQuote.outputRaw, output) : formatRaw(identity(liveQuote.tokenA) === identity(output) ? liveQuote.rawA : liveQuote.rawB, output));
  let balanceProblem = '';
  if (actor && liveQuote) {
    const needed = mode === 'swap' ? [[input, liveQuote.inputRaw]] : [[liveQuote.tokenA, liveQuote.rawA], [liveQuote.tokenB, liveQuote.rawB]];
    for (const [token, raw] of needed) {
      if (balances[token.key] == null) { balanceProblem = `Refresh your ${token.symbol} balance`; break; }
      if (BigInt(balances[token.key]) < BigInt(raw)) { balanceProblem = `Insufficient ${token.symbol} balance`; break; }
    }
  }
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { let active = true; setPoolsLoading(true); setPoolError('');
    fetchPools().then(data => { if (active) setPools(data); }).catch(e => { if (active) setPoolError(errorText(e)); }).finally(() => { if (active) setPoolsLoading(false); });
    return () => { active = false; };
  }, [refresh]);
  useEffect(() => { if (!poolsLoading && !choices.some(p => p.id === poolId)) setPoolId(choices[0]?.id || ''); }, [choices, poolId, poolsLoading]);
  useEffect(() => { let active = true; setPoolRow(null); setRowError('');
    if (poolId) fetchPool(poolId).then(row => { if (active) setPoolRow(row); }).catch(e => { if (active) setRowError(errorText(e)); });
    return () => { active = false; };
  }, [poolId, refresh]);
  useEffect(() => { let active = true; setBalances({});
    if (actor) fetchBalances(actor).then(data => { if (active) setBalances(data); }).catch(() => {});
    return () => { active = false; };
  }, [actor, refresh]);
  useEffect(() => { setReview(null); setError(''); }, [contextKey]);
  useEffect(() => {
    let active = true; setQuote(null); setQuoteError(''); setQuoting(false);
    if (!['swap', 'add'].includes(mode) || (!routed && !poolId) || !amount) return undefined;
    try { rawAmount(amount, input); } catch (e) { setQuoteError(e.message); return undefined; }
    setQuoting(true);
    const timer = setTimeout(() => {
      (routed ? fetchRouteQuote : fetchQuote)({ poolId, kind: mode, actor, inputToken: input, outputToken: output, amount, slippageBps: slippage })
        .then(data => { if (active) { setQuote(data); setNow(Date.now()); } }).catch(e => { if (active) setQuoteError(errorText(e)); }).finally(() => { if (active) setQuoting(false); });
    }, 450);
    return () => { active = false; clearTimeout(timer); };
  }, [routed, output, poolId, mode, actor, input, amount, slippage, refresh, quoteRefresh]);
  useEffect(() => { let active = true; setPositions([]); setPositionsError(''); setPositionsLoading(false);
    if (actor && poolId && mode === 'positions') {
      setPositionsLoading(true); fetchPositions(poolId, actor).then(rows => { if (active) setPositions(rows); }).catch(e => { if (active) setPositionsError(errorText(e)); }).finally(() => { if (active) setPositionsLoading(false); });
    }
    return () => { active = false; };
  }, [actor, poolId, mode, refresh]);
  useEffect(() => { let active = true; setHistory([]); setHistoryError(false); setHistoryLoading(false);
    if (poolId) { setHistoryLoading(true); fetchHistory(poolId, range).then(rows => { if (active) setHistory(rows); }).catch(() => { if (active) setHistoryError(true); }).finally(() => { if (active) setHistoryLoading(false); }); }
    return () => { active = false; };
  }, [poolId, range, refresh]);

  async function reviewPosition(position, kind) {
    if (busyRef.current) return; busyRef.current = true; setBusy(true); setError(''); const key = latestKey.current;
    try {
      const q = await fetchPositionQuote({ poolId, positionId: position.id, actor, kind, percent, slippageBps: slippage });
      if (latestKey.current === key) { setNow(Date.now()); setReview(q); }
    } catch (e) { setError(errorText(e)); } finally { busyRef.current = false; setBusy(false); }
  }
  async function confirmReview() {
    if (busyRef.current || !review) return; busyRef.current = true; setBusy(true); setError('');
    try {
      const result = await (review.route ? executeRouteReview : executeReview)(review, { ...context, kind: review.kind, ...(mode === 'positions' ? { inputToken: undefined } : {}) });
      setSuccess(result.transactionId); setReview(null); setQuote(null); setRefresh(v => v + 1);
    } catch (e) { setReview(null); setError(errorText(e)); } finally { busyRef.current = false; setBusy(false); }
  }
  function openReview() { try { (routed ? assertRouteReview : assertReview)(liveQuote, context); setReview(liveQuote); } catch (e) { setError(e.message); } }
  function chooseToken(side, key) {
    if (side === 'from') { setFrom(key); if (key === to) setTo(from); } else { setTo(key); if (key === from) setFrom(to); }
    setAmount('');
  }
  function fillBalance(percentValue) {
    if (balances[from] != null) setAmount(formatRaw(BigInt(balances[from]) * BigInt(percentValue) / 100n, input));
  }
  const verifiedTokens = poolRow && String(poolRow.id) === poolId ? poolTokens(poolRow) : null;
  return <main className="exchange-page">
    <div className="exchange-heading"><div><div className="exchange-eyebrow">CLEANUPCENTR / ECONOMY</div><h1>Exchange</h1><p>Put your game resources to work.</p></div><div className="exchange-network"><i /> WAX Mainnet <span>Powered by Alcor</span></div></div>
    <div className="exchange-stats"><div><span>Supported assets</span><strong>{TOKENS.length} <small>verified token contracts</small></strong></div><div><span>Available pools</span><strong>{poolsLoading ? '…' : pools.length} <small>across all game pairs</small></strong></div><div><span>Connected account</span><strong>{actor || 'Browse without a wallet'}</strong></div></div>
    <div className="exchange-toolbar"><div className="exchange-tabs" role="group" aria-label="Exchange operation">{[['swap', 'Swap'], ['wallet', 'Portfolio'], ['portfolio', 'Liquidity'], ['farms', 'Farms'], ['activity', 'Activity']].map(([id, label]) => <button key={id} aria-pressed={mode === id || (id === 'portfolio' && ['add','positions'].includes(mode))} disabled={busy} onClick={() => setMode(id)}>{label}</button>)}</div><button disabled={busy || poolsLoading} onClick={() => setRefresh(v => v + 1)}>↻ Refresh data</button></div>
    {['add','portfolio','positions'].includes(mode) && <div className="exchange-liquidity-tabs exchange-range">{[['portfolio','All my pools'],['add','Add liquidity'],['positions','Selected pool']].map(([id,label])=><button key={id} disabled={busy} aria-pressed={mode===id} onClick={()=>setMode(id)}>{label}</button>)}</div>}
    {mode==='farms' && <AlcorFarms key={actor} actor={actor} onLogin={handleLogin} refresh={refresh} onClaimed={() => setRefresh(v => v + 1)}/>} 
    {mode==='wallet' && <WalletPortfolio actor={actor} onLogin={handleLogin} refresh={refresh} onLiquidity={() => setMode('portfolio')}/>}
    {mode==='activity' && <ExchangeActivity actor={actor} refresh={refresh}/>}
    {(poolError || error) && <div className="exchange-error" role="alert">{error || poolError}</div>}
    {success && <div className="exchange-success" role="status">Transaction submitted. <a href={`https://waxblock.io/transaction/${success}`} target="_blank" rel="noreferrer">View transaction ↗</a><button aria-label="Dismiss transaction message" onClick={() => setSuccess('')}>×</button></div>}
    <div hidden={mode !== 'portfolio'}>{mode === 'portfolio' && <AlcorPortfolio actor={actor} onLogin={handleLogin} refresh={refresh} onManage={group => { const a = TOKENS.find(t => identity(t) === identity(group.tokenA)); const b = TOKENS.find(t => identity(t) === identity(group.tokenB)); if (a && b) { setFrom(a.key); setTo(b.key); setPoolId(group.poolId); setMode('positions'); } }} />}</div>
    <div className="exchange-grid" hidden={['portfolio','activity','wallet','farms'].includes(mode)}><section className="exchange-card exchange-trade" aria-label="Exchange form">
      <div className="exchange-card-heading"><h2>{mode === 'swap' ? 'Swap tokens' : mode === 'add' ? 'Add liquidity' : 'Your liquidity'}</h2><span className="exchange-tag">{routed ? 'Auto route' : selected ? `#${poolId}` : 'Select pair'}</span></div>
      {mode === 'swap' && <div className="exchange-shortcuts" role="group" aria-label="Game token shortcuts"><span>Quick pairs from WAX</span>{['cinder', 'trash', 'waxusdc'].map(key => <button key={key} disabled={busy} aria-pressed={from === 'wax' && to === key} onClick={() => { setFrom('wax'); setTo(key); setAmount(''); setQuote(null); setReview(null); }}><TokenLogo token={TOKENS.find(token=>token.key===key)} size={18}/>Get {key.toUpperCase()}</button>)}</div>}
      <fieldset disabled={busy} className="exchange-fields">
        <div className="exchange-token-selectors"><label>From asset<select aria-label="From asset" value={from} onChange={e => chooseToken('from', e.target.value)}>{TOKENS.map(t => <option key={t.key} value={t.key}>{t.symbol}{actor ? balances[t.key] == null ? ' · balance loading / unavailable' : ` · ${formatRaw(balances[t.key], t)}` : ''}</option>)}</select><small>{input.contract}</small></label><button className="exchange-reverse" aria-label="Reverse token pair" onClick={() => { setFrom(to); setTo(from); setAmount(''); }}>⇄</button><label>To asset<select aria-label="To asset" value={to} onChange={e => chooseToken('to', e.target.value)}>{TOKENS.map(t => <option key={t.key} value={t.key}>{t.symbol}{actor ? balances[t.key] == null ? ' · balance loading / unavailable' : ` · ${formatRaw(balances[t.key], t)}` : ''}</option>)}</select><small>{output.contract}</small></label></div>
        {mode==='swap' && <div className="exchange-routing"><label>Swap routing<select aria-label="Swap routing" value={autoRoute ? 'auto' : 'direct'} onChange={e=>setAutoRoute(e.target.value==='auto')}><option value="direct">Selected direct pool</option><option value="auto">Auto route · up to 3 pools</option></select></label>{routed && <small>Compare supported paths through up to three pools. One wallet transaction.</small>}</div>}
        <div className="exchange-slippage"><span>Slippage tolerance</span><div>{[10, 50, 100].map(bps => <button key={bps} aria-pressed={bps === slippage} onClick={() => setSlippage(bps)}>{bps / 100}%</button>)}</div></div>
        {mode !== 'positions' ? <>
          <label className="exchange-amount"><span>{mode === 'swap' ? 'You pay' : 'Your deposit'} <b><TokenLogo token={input}/>{input.symbol}</b></span><input aria-label={`${input.symbol} amount`} inputMode="decimal" autoComplete="off" placeholder="0.00" value={amount} maxLength={35} onChange={e => setAmount(e.target.value.replace(/^\s*\./, '0.'))} /><ExchangeUsd token={input} amount={amount} now={now}/><small>Balance: {actor ? balances[from] != null ? `${short(balances[from], input)} ${input.symbol}` : 'Unavailable / loading' : 'Connect wallet to view'}</small></label>
          <div className="exchange-balance-buttons">{[25, 50, 100].map(p => <button key={p} disabled={!actor || balances[from] == null} onClick={() => fillBalance(p)}>{p === 100 ? 'Max' : `${p}%`}</button>)}</div>
          <div className="exchange-output"><span>{mode === 'swap' ? 'Estimated receive' : 'Paired deposit'} <b><TokenLogo token={output}/>{output.symbol}</b></span><strong>{quoting ? 'Calculating…' : quotedOutput || '—'}</strong><ExchangeUsd token={output} amount={quotedOutput} now={now}/></div>
          {quoteError && <p className="exchange-error" role="alert">{quoteError}</p>}
          {liveQuote && <><dl className="exchange-details">{liveQuote.route ? <><div><dt>Best quoted route</dt><dd>{[liveQuote.inputToken,...liveQuote.hops.map(h=>h.outputToken)].map(t=>t.symbol).join(' → ')}</dd></div><div><dt>Pool fees</dt><dd>{liveQuote.hops.map(h=>h.fee/10000+'%').join(' + ')} · included</dd></div><div><dt>Paths quoted</dt><dd>{liveQuote.coverage.quoted} / {liveQuote.coverage.total}{liveQuote.coverage.quoted<liveQuote.coverage.total ? ' · some unavailable' : ''}</dd></div></> : <div><dt>Pool fee</dt><dd>{liveQuote.fee / 10000}%</dd></div>}{mode === 'swap' ? <><div><dt>Minimum received</dt><dd>{asset(liveQuote.minimum, output)}</dd></div><div><dt>Price impact incl. fee</dt><dd className={liveQuote.impactBps >= 300 ? 'exchange-warning-text' : ''}>{(liveQuote.impactBps / 100).toFixed(2)}%</dd></div></> : <div><dt>Position range</dt><dd>Full range</dd></div>}<div><dt>Quote validity</dt><dd>{expired ? 'Expired' : `${Math.max(0, Math.ceil((liveQuote.expiresAt - now) / 1000))}s remaining`}</dd></div></dl><button className="exchange-refresh-quote" disabled={quoting} onClick={() => setQuoteRefresh(v => v + 1)}>Refresh quote</button></>}
          {mode === 'add' && <p className="exchange-muted">Deposit both tokens into a full-range position. Fees accrue while liquidity is active. Token prices and your withdrawal amounts can change.</p>}
          <button className="exchange-primary exchange-submit" disabled={!!actor && (quoting || expired || (!routed && (!selected || !!rowError)) || !!balanceProblem)} onClick={() => actor ? openReview() : handleLogin()}>{!actor ? 'Connect wallet' : quoting ? 'Getting live quote…' : balanceProblem || (expired && liveQuote ? 'Refresh expired quote' : mode === 'swap' ? 'Review swap' : 'Review deposit')}</button>
          {actor && expired && liveQuote && <button className="exchange-refresh-quote" onClick={() => setQuoteRefresh(v => v + 1)}>Get a fresh quote</button>}
        </> : <>
          <p className="exchange-muted">Positions for {actor || 'your wallet'} in pool {poolId ? `#${poolId}` : '—'}. Choose another fee tier to see its positions.</p>
          {!actor ? <button className="exchange-primary exchange-submit" onClick={() => handleLogin()}>Connect wallet</button> : <>
            <label className="exchange-withdraw">Withdrawal amount<select aria-label="Withdrawal percentage" value={percent} onChange={e => setPercent(Number(e.target.value))}>{[25, 50, 75, 100].map(p => <option key={p} value={p}>{p}%</option>)}</select></label>
            {positionsLoading && <p role="status">Loading your positions…</p>}{positionsError && <p className="exchange-error" role="alert">{positionsError}</p>}
            {!positionsLoading && !positionsError && !positions.length && <div className="exchange-empty-position">No positions in this pool.<small>Add liquidity or select a different pool.</small></div>}
            {verifiedTokens && positions.map(p => <div className="exchange-position" key={p.id}><div><b>Position #{p.id}</b><span className="exchange-tag">{BigInt(p.liquidity) === 0n ? 'Closed' : p.inRange ? 'In range' : 'Out of range'}</span></div><p>{asset(p.rawA, verifiedTokens[0])}<br />{asset(p.rawB, verifiedTokens[1])}</p><small>Uncollected fees: {asset(p.feesA, verifiedTokens[0])} + {asset(p.feesB, verifiedTokens[1])}</small><div className="exchange-position-actions"><button disabled={BigInt(p.liquidity) === 0n} onClick={() => reviewPosition(p, 'remove')}>Withdraw {percent}%</button><button disabled={BigInt(p.feesA) === 0n && BigInt(p.feesB) === 0n} onClick={() => reviewPosition(p, 'collect')}>Collect fees</button></div></div>)}
          </>}
        </>}
      </fieldset><p className="exchange-footer-note">Transactions use your connected wallet on WAX mainnet. Pool fees are included in swap quotes.</p>
    </section><section className="exchange-market" aria-label="Pool market information">
      <details className="exchange-card exchange-chart-panel" open={chartExpanded} onToggle={event=>setChartExpanded(event.currentTarget.open)}><summary>Market chart · {input.symbol} / {output.symbol}</summary><div className="exchange-card-heading"><div><div className="exchange-eyebrow">POOL PRICE HISTORY</div><h2 className="exchange-pair-title"><TokenLogo token={input}/><TokenLogo token={output}/>{input.symbol} / {output.symbol}</h2></div><div className="exchange-range">{['1h', '24h', '7d', '30d'].map(r => <button key={r} aria-pressed={range === r} onClick={() => setRange(r)}>{r}</button>)}</div></div>
        {chartExpanded && (selected ? <PriceChart points={history} input={input} output={output} pool={selected} range={range} loading={historyLoading} error={historyError} /> : <div className="exchange-chart-empty">Select an available pool to view its market.</div>)}
      </details>
      <div className="exchange-card"><div className="exchange-card-heading"><h2>Compare pools</h2><span className="exchange-muted">Direct pairs</span></div>
        <p className="exchange-muted">Fee tiers have separate liquidity and prices. Compare quotes before swapping.</p>
        {mode==='swap' && <ExchangePoolComparison choices={choices} input={input} output={output} amount={amount} actor={actor} slippage={slippage} poolId={poolId} onChoose={id=>{setAutoRoute(false);setPoolId(id);}} busy={busy} now={now}/>}
        <div className="exchange-pool-list">{choices.map(p => <button disabled={busy} key={p.id} className={p.id === poolId ? 'selected' : ''} onClick={() => {setAutoRoute(false);setPoolId(p.id);}}><span><b>{input.symbol} / {output.symbol}</b><small>Pool #{p.id} · {p.funded ? 'Liquidity available' : 'No active liquidity'}</small></span><span><b>{p.fee / 10000}%</b><small>swap fee</small></span></button>)}</div>
        {!choices.length && <p className="exchange-muted">{poolsLoading ? 'Loading mainnet pools…' : 'No direct pool found. Try Auto route for a path through another token.'}</p>}
        <div className="exchange-pool-detail">{rowError ? <span className="exchange-error">{rowError}</span> : verifiedTokens ? <><span className="exchange-verified">● Verified on WAX mainnet</span><dl className="exchange-details">{verifiedTokens.map((t, i) => <div key={t.key}><dt>{t.symbol} pool reserve</dt><dd>{compact(String(poolRow[i === 0 ? 'tokenA' : 'tokenB'].quantity).split(' ')[0])}</dd></div>)}</dl></> : poolId && <span className="exchange-muted">Verifying selected pool on-chain…</span>}</div>
      </div>
      <ExchangeTokenInfo tokens={[input,output]}/>
      {selected && <details className="exchange-card exchange-recent-market"><summary>Recent pool swaps</summary><SwapRows rows={[...history].reverse().slice(0,10).filter(row=>row.trx_id).map(row=>({...row,symbolA:selected.tokenA.symbol,symbolB:selected.tokenB.symbol}))}/></details>}
    </section></div>
    <footer className="exchange-footer"><span>WAX · CINDER · TRASH · TOMATOE · BANANAZ · WAXUSDC</span><a href="https://wax.alcor.exchange/swap" target="_blank" rel="noreferrer">Explore Alcor ↗</a></footer>
    {review && <ReviewDialog quote={review} now={now} busy={busy} onClose={() => setReview(null)} onConfirm={confirmReview} />}
  </main>;
}

