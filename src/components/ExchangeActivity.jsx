import React,{useEffect,useState} from 'react';
import {fetchSwapActivity} from '../services/alcorMainnet';
const number=value=>Math.abs(Number(value)).toLocaleString(undefined,{maximumSignificantDigits:7});
export function SwapRows({rows}) {
  return <div className="exchange-activity-list">{rows.map((row,index)=>{
    const aIn=Number(row.tokenA)>0;
    return <div className="exchange-activity-row" key={row._id || `${row.trx_id}:${index}`}><div><strong>{number(aIn?row.tokenA:row.tokenB)} {aIn?row.symbolA:row.symbolB} <span>→</span> {number(aIn?row.tokenB:row.tokenA)} {aIn?row.symbolB:row.symbolA}</strong><small>{new Date(row.time).toLocaleString()} · Pool #{row.pool}</small></div><span className="exchange-verified">Indexed</span><a href={`https://waxblock.io/transaction/${row.trx_id}`} target="_blank" rel="noreferrer">{row.trx_id?.slice(0,8)} ↗</a></div>;
  })}</div>;
}
export default function ExchangeActivity({actor,refresh}) {
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
  useEffect(()=>{let active=true;setRows([]);setError('');setLoading(Boolean(actor));
    if(actor)fetchSwapActivity(actor).then(data=>{if(active)setRows(data);}).catch(()=>{if(active)setError('History unavailable. Try Refresh data.');}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[actor,refresh]);
  return <section className="exchange-card"><div className="exchange-card-heading"><h2>Your recent swaps</h2><span className="exchange-tag">{actor || 'Wallet not connected'}</span></div><p className="exchange-muted">Latest 25 swaps across Alcor pools. New swaps appear after indexing.</p>{error || loading || !rows.length ? <p role="status">{error || (loading?'Loading swaps…':actor?'No recent swaps found.':'Connect your wallet to see swap history.')}</p> : <SwapRows rows={rows}/>}</section>;
}
