/* global BigInt */
import React,{useEffect,useState} from 'react';
import {fetchQuote} from '../services/alcorMainnet';
import {formatRaw,rawAmount} from '../services/exchangeMath';
export default function ExchangePoolComparison({choices,input,output,amount,actor,slippage,poolId,onChoose,busy,now}) {
  const [quotes,setQuotes]=useState([]),[loading,setLoading]=useState(false),[failed,setFailed]=useState(0);
  const [refresh,setRefresh]=useState(0);
  useEffect(()=>{
    let active=true;setQuotes([]);setFailed(0);setLoading(false);
    try {rawAmount(amount,input);} catch{return undefined;}
    if(choices.length<2)return undefined;
    setLoading(true);
    const timer=setTimeout(async()=>{
      const results=await Promise.allSettled(choices.filter(p=>p.funded).map(p=>fetchQuote({poolId:p.id,kind:'swap',actor,inputToken:input,amount,slippageBps:slippage})));
      if(!active)return;
      setFailed(results.filter(r=>r.status==='rejected').length);
      setQuotes(results.filter(r=>r.status==='fulfilled').map(r=>r.value).sort((a,b)=>BigInt(a.outputRaw)>BigInt(b.outputRaw)?-1:BigInt(a.outputRaw)<BigInt(b.outputRaw)?1:0));setLoading(false);
    },650);
    return ()=>{active=false;clearTimeout(timer);};
  },[choices,input,amount,actor,slippage,refresh]);
  const best=quotes.find(q=>q.expiresAt>now);
  if(loading)return <p className="exchange-muted" role="status">Comparing direct pool quotes…</p>;
  if(!best)return quotes.length ? <button onClick={()=>setRefresh(value=>value+1)}>Refresh pool comparison</button> : null;
  return <div className="exchange-best"><div><strong>Best quoted pool #{best.poolId}</strong><small>{Number(formatRaw(best.outputRaw,output)).toLocaleString(undefined,{maximumSignificantDigits:7})} {output.symbol} · {quotes.length} pools compared{failed?' · some quotes unavailable':''}</small></div><button disabled={busy || best.poolId===poolId} onClick={()=>onChoose(best.poolId)}>{best.poolId===poolId?'Selected':'Use pool'}</button></div>;
}
