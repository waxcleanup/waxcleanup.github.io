import React from 'react';
import TokenLogo from './TokenLogo';
import './SwapRoute.css';

export default function SwapRoute({quote, expired=false}) {
 if (!quote || quote.kind !== 'swap') return null;
 const hops=quote.hops || [quote];
 const tokens=[quote.inputToken,...hops.map(h=>h.outputToken)];
 return <section className={`swap-route${expired?' swap-route-expired':''}`} aria-label="Swap route">
  <div className="swap-route-heading"><span>{expired?'Expired route':quote.route?'Best quoted route':'Direct route'}</span><span>{hops.length} {hops.length===1?'pool':'pools'}</span></div>
  <ol className="swap-route-path">{tokens.map((t,i)=><li key={`${i}-${t.contract}-${t.symbol}`}>{i>0&&<span className="swap-route-arrow" aria-hidden="true"> → </span>}<span className="swap-route-token"><TokenLogo token={t} size={20}/>{t.symbol}</span></li>)}</ol>
  <details><summary>Pool details · fees included</summary><ol className="swap-route-pools">{hops.map((h,i)=><li key={`${i}-${h.poolId}`}><span>{h.inputToken.symbol} → {h.outputToken.symbol}<small>{h.inputToken.contract} → {h.outputToken.contract}</small></span><span>#{h.poolId}<small>{h.fee/10000}% fee</small></span></li>)}</ol>{quote.coverage&&<p>{quote.coverage.quoted} of {quote.coverage.total} paths quoted. Best output among successful quotes.</p>}</details>
 </section>;
}
