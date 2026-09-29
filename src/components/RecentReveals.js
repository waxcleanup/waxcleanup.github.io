import React, {useEffect, useState} from 'react';
import LootReveal from './LootReveal';
import {readSavedReveals, fetchRecentOpenings} from '../services/lootReveal';

export default function RecentReveals({wallet: walletValue, recipes = []}) {
  const wallet = String(walletValue || '');
  const [saved, setSaved] = useState([]);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [transaction, setTransaction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(()=>{
    const update = ()=>setSaved(readSavedReveals(wallet));
    update(); setSelected(null);
    const recovery = new URL(window.location.href).searchParams.get('reveal');
    if (/^[a-f0-9]{64}$/i.test(recovery || '')) setSelected({result:{transactionId:recovery.toLowerCase()}, title:'Recovered opening'});
    window.addEventListener('cleanupcentr:reveals-updated', update);
    return ()=>window.removeEventListener('cleanupcentr:reveals-updated', update);
  },[wallet]);
  useEffect(()=>{
    const controller = new AbortController();
    setHistory([]);setError('');setLoading(true);
    fetchRecentOpenings(wallet,controller.signal).then(rows=>{if(!controller.signal.aborted)setHistory(rows);}).catch(()=>{if(!controller.signal.aborted)setError('Chain history is unavailable. Saved reveals are still shown; try Refresh.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[wallet,refresh]);
  if (!wallet) return null;
  const combined = new Map(saved.map(item=>[item.transactionId,item]));
  history.forEach(item=>combined.set(item.transactionId,{...combined.get(item.transactionId),...item}));
  const rows = [...combined.values()].sort((a,b)=>(b.timestamp || b.savedAt || 0)-(a.timestamp || a.savedAt || 0)).slice(0,10);
  const titleFor = item => {const recipe=recipes.find(recipe=>String(recipe.recipe_id)===String(item.recipeId));return recipe?.title || recipe?.label || item.title || 'Opening';};
  return <section className="recent-reveals" aria-label="Recent pack and blend transactions">
    <div className="recent-transactions-heading"><div><h3>Recent transactions</h3><p>Pack openings and blends for {wallet}</p></div><button type="button" disabled={loading} onClick={()=>setRefresh(value=>value+1)}>{loading ? 'Loading…' : 'Refresh history'}</button></div>
    {error && <p role="status">{error}</p>}
    {!rows.length && <p>{loading ? 'Loading recent openings…' : 'No recent openings found.'}</p>}
    <div className="recent-transaction-list">{rows.map(item=><div className="recent-transaction-row" key={item.transactionId}>
      <div><strong>{titleFor(item)}</strong><small>{item.timestamp || item.savedAt ? new Date(item.timestamp || item.savedAt).toLocaleString() : 'Saved reveal'}{item.items?.length ? ` · ${item.items.length} NFTs` : ''}</small></div>
      <a href={`https://waxblock.io/transaction/${item.transactionId}`} target="_blank" rel="noopener noreferrer" aria-label={`View transaction ${item.transactionId}`}>{item.transactionId.slice(0,8)} ↗</a>
      <button type="button" onClick={()=>setSelected({result:{transactionId:item.transactionId},title:titleFor(item)})}>View reveal</button>
    </div>)}</div>
    <details><summary>Find an older transaction</summary><form onSubmit={event=>{event.preventDefault();setSelected({result:{transactionId:transaction.trim().toLowerCase()},title:'Recovered opening'});}}><label>Transaction ID<input aria-label="Opening transaction ID" value={transaction} onChange={event=>setTransaction(event.target.value)} placeholder="Paste the full transaction ID" pattern="[a-fA-F0-9]{64}" required /></label><button type="submit">Find reveal</button></form></details>
    {selected && <LootReveal key={selected.result.transactionId} result={selected.result} title={selected.title} wallet={wallet} onClose={()=>setSelected(null)} />}
  </section>;
}
