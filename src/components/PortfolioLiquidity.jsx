/* global BigInt */
import TokenLogo from './TokenLogo';
import React, { useEffect, useRef, useState } from 'react';
import { loadPortfolioLiquidity, quotePortfolioLiquidity, executePortfolioLiquidity } from '../services/alcorMainnet';
import { asset, formatRaw } from '../services/exchangeMath';

export default function PortfolioLiquidity({ actor, group, position, onClose, onComplete }) {
  const dialog = useRef(); const working = useRef(false);
  const [state, setState] = useState(null); const [kind, setKind] = useState('add'); const [amount, setAmount] = useState('');
  const [inputSide, setInputSide] = useState('a'); const [percent, setPercent] = useState(100); const [slippageBps, setSlippage] = useState(50);
  const [quote, setQuote] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [now, setNow] = useState(Date.now());
  const params = { actor, poolId: group.poolId, positionId: position.id, kind, amount, inputSide, percent, slippageBps };
  useEffect(() => { dialog.current.showModal(); const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    let live = true; setState(null); setQuote(null); setError('');
    loadPortfolioLiquidity({ actor, poolId: group.poolId, positionId: position.id }).then(data => { if (live) setState(data); }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [actor, group.poolId, position.id]);
  useEffect(() => { setQuote(null); }, [kind, amount, inputSide, percent, slippageBps]);
  async function prepare() {
    if (working.current) return; working.current = true; setBusy(true); setError('');
    try { const q = await quotePortfolioLiquidity(params); setQuote(q); setNow(Date.now()); }
    catch (e) { setError(e.message || 'Unable to quote liquidity.'); }
    finally { working.current = false; setBusy(false); }
  }
  async function confirm() {
    if (working.current) return; working.current = true; setBusy(true); setError('');
    try { const result = await executePortfolioLiquidity(quote, params); onComplete(result); }
    catch (e) { setQuote(null); setError(e.message || 'Transaction was not completed.'); }
    finally { working.current = false; setBusy(false); }
  }
  const seconds = quote ? Math.max(0, Math.ceil((quote.expiresAt - now) / 1000)) : 0;
  return <dialog ref={dialog} className="exchange-review portfolio-liquidity" aria-labelledby="liquidity-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <div className="exchange-eyebrow">CLEANUPCENTR · WAX MAINNET</div><h2 id="liquidity-title">Manage liquidity</h2>
    <p>Pool #{group.poolId} · Position #{position.id}</p><p className="exchange-muted">Wallet: {actor}</p>
    {error && <p className="exchange-error" role="alert">{error}</p>}
    {!state ? <p>{error ? 'Close and reopen to retry.' : 'Verifying your position and balances on mainnet…'}</p> : <>
      <fieldset disabled={busy || !!quote} className="exchange-fields">
        <div className="exchange-tabs">{[['add', 'Add liquidity'], ['remove', 'Remove liquidity'], ['collect', 'Collect fees']].map(([mode, label]) => <button key={mode} aria-pressed={kind === mode} disabled={mode === 'remove' && (position.closed || position.locked)} onClick={() => setKind(mode)}>{label}</button>)}</div>
        <p className="exchange-muted">{state.allowedTokens.map(t => `${t.symbol}@${t.contract}`).join(' / ')}</p>
        {kind === 'add' ? <><div className="wallet-deposit-balances">{state.allowedTokens.map((t,i) => <div key={t.contract+t.symbol}><span><TokenLogo token={t}/>{t.symbol} available</span><strong>{formatRaw(state.balances[i],t)}</strong></div>)}</div><label>Deposit token<select value={inputSide} onChange={e => { setInputSide(e.target.value); setAmount(''); }}>{state.allowedTokens.map((t, i) => <option key={t.contract + t.symbol} value={i ? 'b' : 'a'}>{t.symbol} · {formatRaw(state.balances[i], t)} available</option>)}</select></label><label>Amount<input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></label><div className="exchange-tabs">{[25,50,100].map(p => <button key={p} onClick={() => { const i=inputSide==='b'?1:0; setAmount(formatRaw(BigInt(state.balances[i])*BigInt(p)/100n,state.allowedTokens[i])); }}>{p===100?'Use balance':`${p}%`}</button>)}</div><p className="exchange-muted">The paired token must also be available. Adds to this position’s existing price range ({state.positionRow.tickLower} to {state.positionRow.tickUpper} ticks). The paired amount is calculated for you. Out-of-range positions may need only one token.</p></> : kind === 'remove' ? <label>Remove from this position<select value={percent} onChange={e => setPercent(Number(e.target.value))}>{[25, 50, 75, 100].map(p => <option key={p} value={p}>{p}%</option>)}</select></label> : <p className="exchange-muted">Collect accrued fees to your connected wallet without removing liquidity.</p>}
        <label>Slippage<select value={slippageBps} onChange={e => setSlippage(Number(e.target.value))}>{[10, 50, 100].map(v => <option key={v} value={v}>{v / 100}%</option>)}</select></label>
      </fieldset>
      {quote && <div className="portfolio-liquidity-review"><h3>Review {kind === 'add' ? 'deposit' : kind === 'remove' ? 'withdrawal' : 'fee collection'}</h3><dl className="exchange-details">
        {kind !== 'collect' && <><div><dt>{kind === 'add' ? 'You deposit' : 'Estimated return'}</dt><dd>{asset(quote.rawA, quote.tokenA)}<br />{asset(quote.rawB, quote.tokenB)}</dd></div><div><dt>{kind === 'add' ? 'Minimum used' : 'Minimum return'}</dt><dd>{asset(quote.minA, quote.tokenA)}<br />{asset(quote.minB, quote.tokenB)}</dd></div></>}
        {kind !== 'add' && <div><dt>Fees collected</dt><dd>{asset(quote.feesA, quote.tokenA)}<br />{asset(quote.feesB, quote.tokenB)}</dd></div>}
        <div><dt>Recipient</dt><dd>{actor}</dd></div><div><dt>Quote expires</dt><dd>{seconds ? `${seconds}s` : 'Expired'}</dd></div>
      </dl></div>}
    </>}
    <div className="exchange-review-actions"><button disabled={busy} onClick={quote ? () => setQuote(null) : onClose}>{quote ? 'Edit' : 'Close'}</button>{quote ? <button className="exchange-primary" disabled={busy || !seconds} onClick={confirm}>{busy ? 'Waiting for wallet…' : 'Confirm in wallet'}</button> : <button className="exchange-primary" disabled={busy || !state || (kind === 'add' && !amount)} onClick={prepare}>{busy ? 'Preparing…' : 'Review amounts'}</button>}</div>
  </dialog>;
}
