import React,{useEffect,useState} from 'react';
import TokenLogo from './TokenLogo';
import {fetchWalletPortfolio} from '../services/walletPortfolio';
import './WalletPortfolio.css';
import DustConversion from './DustConversion';
const usd=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
export default function WalletPortfolio({actor,onLogin,refresh,onLiquidity}) {
  const [dust,setDust]=useState(false); const [completed,setCompleted]=useState(null);
  const [state,setState]=useState({}); const [retry,setRetry]=useState(0); const [search,setSearch]=useState('');
  useEffect(()=>{
    let active=true; setState({actor,loading:!!actor}); setSearch('');
    if(actor)fetchWalletPortfolio(actor).then(data=>{if(active)setState({actor,...data});}).catch(e=>{if(active)setState({actor,error:e.message});});
    return()=>{active=false;};
  },[actor,refresh,retry]);
  const current=state.actor===actor?state:{};
  const rows=current.rows||[]; const unpriced=rows.filter(t=>t.valueUSD===null).length;
  const visible=rows.filter(t=>`${t.symbol} ${t.contract}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <section className="exchange-card wallet-portfolio">
    <div className="exchange-card-heading"><div><div className="exchange-eyebrow">YOUR WAX WALLET</div><h2>Portfolio</h2><p className="wallet-intro">Your tokens, all in one place.</p></div><button onClick={onLiquidity}>Liquidity pools ↗</button></div>
    {completed?.actor===actor && <p role="status" className="wallet-notice wallet-success"><span><strong>Conversion submitted</strong> Your balances will refresh.</span>{completed.id && <> <a href={`https://waxblock.io/transaction/${completed.id}`} target="_blank" rel="noreferrer">View transaction ↗</a></>}</p>}
    {!actor ? <button className="exchange-primary" onClick={onLogin}>Connect wallet</button> : <>
      <div className="wallet-summary"><div className="wallet-value-card"><span>Estimated wallet value</span><strong>{current.loading?'…':current.error?'Unavailable':rows.some(t=>t.valueUSD!==null)?usd(rows.reduce((sum,t)=>sum+(t.valueUSD||0),0)):'Not priced'}</strong><small>Priced holdings · liquidity not included</small></div><div><span>Tokens held</span><strong>{current.loading?'…':current.error?'—':rows.length}</strong><small>{unpriced ? `${unpriced} without a price` : "All shown holdings priced"}</small></div><div><span>Account</span><strong>{actor}</strong><small>Connected on WAX</small></div></div>
      {current.loading && <p role="status">Loading your wallet holdings…</p>}
      {current.error && <p className="exchange-error" role="alert">{current.error}</p>}
      {current.partial && <p className="wallet-notice wallet-warning" role="status">Only part of your holdings could be loaded. This is a partial total; refresh to retry.</p>}
      {current.pricesUnavailable && <p role="status">Prices are temporarily unavailable. Your token balances are still shown.</p>}
      {!!current.skipped && <p className="exchange-muted">{current.skipped} token records could not be verified by the indexer and are excluded.</p>}
      {!!current.unavailable && <p className="wallet-notice wallet-warning" role="status"><span><strong>Partial balance view</strong> {current.unavailable} token balances could not be verified and are excluded.</span><button onClick={()=>setRetry(v=>v+1)}>Retry ↻</button></p>}
      {current.rows && <><div className="wallet-toolbar"><label className="wallet-search">Search holdings<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a token or contract…"/></label><div className="wallet-actions"><button disabled={current.loading} onClick={()=>setRetry(v=>v+1)} aria-label="Refresh holdings">↻ Refresh</button><button className="exchange-primary wallet-dust-action" onClick={()=>setDust(true)}><TokenLogo token={{symbol:"TRASH",contract:"cleanuptoken",precision:3}} size={22}/>Convert dust to TRASH</button></div></div><div className="wallet-list-heading"><span>ASSET <small>{visible.length}</small></span><span>BALANCE / USD</span></div>
      <div className="wallet-holdings">{visible.map(t=><div className="wallet-token-row" key={t.key}><TokenLogo token={t} size={32}/><div><strong>{t.symbol}</strong><small>{t.contract}</small></div><div className="wallet-token-value"><strong>{t.exactAmount ? t.exactAmount.replace(/^(\d+)/,whole=>whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')) : t.amount.toLocaleString('en-US',{maximumFractionDigits:t.precision})}</strong><small>{t.valueUSD===null?'Price unavailable':t.valueUSD>0&&t.valueUSD<0.01?'< $0.01':`≈ ${usd(t.valueUSD)}`}</small></div></div>)}</div>
      {!visible.length && <p>{rows.length?'No matching tokens.':'No positive balances could be verified for the discovered tokens.'}</p>}
      <p className="exchange-muted wallet-source">Balances verified on WAX · Token discovery: Hyperion · Prices: Alcor · Updated {new Date(current.updatedAt).toLocaleTimeString()}. Token discovery may omit holdings. Balances and routes are rechecked before a conversion.</p></>}
    </>}
    {dust && actor && <DustConversion key={actor} actor={actor} tokens={rows} onClose={()=>setDust(false)} onComplete={result=>{setCompleted({actor,id:result?.transactionId||result?.transaction_id||result?.processed?.id});setDust(false);setRetry(v=>v+1);}}/>}
  </section>;
}