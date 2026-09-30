import React,{useEffect,useState} from 'react';
import './ExchangeActivity.css';
import {fetchSwapActivity} from '../services/alcorMainnet';
const number=value=>Math.abs(Number(value)).toLocaleString(undefined,{maximumSignificantDigits:7});
export function groupSwapTransactions(rows, oldestFirst=false) {
 const groups=new Map(), seen=new Set();
 rows.forEach((row,index)=>{
  // Only identical indexer record IDs are duplicates; separate identical trades remain visible.
  const id=row._id ? `${row.trx_id}:${row._id}` : null;
  if(id && seen.has(id))return;
  if(id)seen.add(id);
  const key=row.trx_id || `unknown-${index}`;
  if(!groups.has(key))groups.set(key,{id:key,time:row.time,rows:[],index});
  const group=groups.get(key);group.rows.push(row);
  if(Date.parse(row.time)>Date.parse(group.time))group.time=row.time;
 });
 return [...groups.values()].sort((a,b)=>{
  const difference=(Date.parse(a.time)||0)-(Date.parse(b.time)||0);
  return (oldestFirst?difference:-difference)||a.id.localeCompare(b.id);
 });
}
export function SwapRows({rows,oldestFirst=false}) {
 const groups=groupSwapTransactions(rows,oldestFirst);
 return <div className="exchange-activity-list">{groups.map(group=><details className="exchange-transaction" key={group.id}>
  <summary><span className="exchange-transaction-title">Transaction {group.id.slice(0,8)}<small>{new Date(group.time).toLocaleString()}</small></span><span className="exchange-transaction-count">{group.rows.length} indexed {group.rows.length===1?'swap':'swaps'}</span></summary>
  <div className="exchange-transaction-meta"><span>Indexed pool steps</span><a href={`https://waxblock.io/transaction/${group.id}`} target="_blank" rel="noreferrer">View transaction ↗</a></div>
  <ol className="exchange-transaction-steps">{group.rows.map((row,index)=>{
   const aIn=Number(row.tokenA)>0;
   return <li key={row._id || index}><span className="exchange-step-number">{index+1}</span><div><strong>{number(aIn?row.tokenA:row.tokenB)} {aIn?row.symbolA:row.symbolB} <span>→</span> {number(aIn?row.tokenB:row.tokenA)} {aIn?row.symbolB:row.symbolA}</strong><small>Pool #{row.pool}</small></div></li>;
  })}</ol>
 </details>)}</div>;
}
export default function ExchangeActivity({actor,refresh}) {
  const [oldestFirst,setOldestFirst]=useState(false);
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
  useEffect(()=>{let active=true;setRows([]);setError('');setLoading(Boolean(actor));
    if(actor)fetchSwapActivity(actor).then(data=>{if(active)setRows(data);}).catch(()=>{if(active)setError('History unavailable. Try Refresh data.');}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[actor,refresh]);
  return <section className="exchange-card"><div className="exchange-card-heading"><h2>Your recent swaps</h2><span className="exchange-tag">{actor || 'Wallet not connected'}</span></div><div className="exchange-activity-toolbar"><p className="exchange-muted">Recent indexed swaps, grouped by transaction. Older transactions may be partially shown.</p><label>Order<select aria-label="Transaction order" value={oldestFirst?'oldest':'newest'} onChange={e=>setOldestFirst(e.target.value==='oldest')}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></div>{error || loading || !rows.length ? <p role="status">{error || (loading?'Loading swaps…':actor?'No recent swaps found.':'Connect your wallet to see swap history.')}</p> : <SwapRows rows={rows} oldestFirst={oldestFirst}/>}</section>;
}
