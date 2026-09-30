import React,{useState,useEffect,useRef} from 'react';
import TokenLogo from './TokenLogo';
import SwapRoute from './SwapRoute';
import {quoteDustConversion,executeDustConversion} from '../services/alcorMainnet';
import {formatRaw} from '../services/exchangeMath';
export default function DustConversion({actor,tokens,onClose,onComplete}) {
 const dialog=useRef(),lock=useRef(false);const [selected,setSelected]=useState(''),[review,setReview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[now,setNow]=useState(Date.now());
 const eligible=tokens.filter(t=>!(t.symbol==='TRASH'&&t.contract==='cleanuptoken')&&(t.valueUSD===null||t.valueUSD<1));
 const token=eligible.find(t=>t.key===selected);
 useEffect(()=>{dialog.current.showModal();const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 async function prepare(){if(lock.current||!token)return;lock.current=true;setBusy(true);setError('');setReview(null);try{setReview(await quoteDustConversion(actor,token));setNow(Date.now());}catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}}
 async function confirm(){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const result=await executeDustConversion(review,actor);onComplete(result);}catch(e){setReview(null);setError(e.message);}finally{lock.current=false;setBusy(false);}}
 const q=review?.quote;
 const expired=q && now>=q.expiresAt;
 return <dialog ref={dialog} className="exchange-review portfolio-liquidity dust-dialog" aria-labelledby="dust-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
 <header className="dust-heading"><div><div className="exchange-eyebrow">WALLET CLEANUP</div><h2 id="dust-title">Convert dust to TRASH</h2></div><button aria-label="Close dust conversion" disabled={busy} onClick={onClose}>×</button></header>
 {error&&<p role="alert" className="exchange-error">{error}</p>}
 {!review?<><p className="dust-intro">Trade one small holding for TRASH. Choose a token worth less than $1, or one without a price.</p><label className="wallet-search">Token to convert<select disabled={busy} value={selected} onChange={e=>{setSelected(e.target.value);setError('');}}><option value="">Choose a token</option>{eligible.map(t=><option key={t.key} value={t.key}>{t.symbol} · {t.exactAmount} · {t.contract}{t.valueUSD===null?' · Unpriced':''}</option>)}</select></label>{token&&<p className="dust-intro"><TokenLogo token={token}/>Convert your verified {token.symbol} balance, reserving supported transfer fees. This trades tokens; it does not burn them.</p>}<p className="exchange-muted">Compares paths through up to 3 pools. Pool fees included · 0.5% slippage · 5% price impact limit. Very small balances may not be tradable.</p></>:<>
 <div className="dust-amounts"><div className="dust-amount"><TokenLogo token={q.inputToken} size={30}/><div><small>You pay · {q.inputToken.contract}</small><strong>{review.params.amount} <span>{q.inputToken.symbol}</span></strong></div></div><div className="dust-amount dust-amount-receive"><TokenLogo token={q.outputToken} size={30}/><div><small>Estimated receive</small><strong>{formatRaw(q.outputRaw,q.outputToken)} <span>TRASH</span></strong></div></div></div>
 <dl className="dust-metrics"><div><dt>Minimum received</dt><dd>{formatRaw(q.minimum,q.outputToken)} TRASH</dd></div><div><dt>Price impact incl. fee</dt><dd>{(q.impactBps/100).toFixed(2)}%</dd></div><div><dt>Slippage tolerance</dt><dd>{q.slippageBps/100}%</dd></div></dl>
 {review.params.transferFeeReserve && review.params.transferFeeReserve!=="0" && <p className="dust-fee-note">Reserved for transfer fees: <strong>{formatRaw(review.params.transferFeeReserve,q.inputToken)} {q.inputToken.symbol}</strong>. Includes rounding allowance; unused tokens stay in your wallet.</p>}
 <SwapRoute quote={q} expired={expired}/>
 <div className="dust-footer-meta"><span>Recipient <strong>{actor}</strong></span><span className={expired?'dust-expired':''}>{expired?'Expired · refresh quote':`Quote valid for ${Math.ceil((q.expiresAt-now)/1000)}s`}</span></div>
 </>}
 <div className="exchange-review-actions"><button disabled={busy} onClick={review?()=>setReview(null):onClose}>{review?'Back':'Close'}</button>{review?<button className="exchange-primary" disabled={busy} onClick={expired?prepare:confirm}>{busy?'Please wait…':expired?'Refresh quote':'Confirm in wallet'}</button>:<button className="exchange-primary" disabled={busy||!token} onClick={prepare}>{busy?'Comparing routes…':'Review conversion'}</button>}</div></dialog>;
}
