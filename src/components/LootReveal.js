import React, {useEffect, useRef, useState} from 'react';
import {extractMintedRewards, fetchTransactionRewards, readSavedReveals, saveReveal, removeSavedReveal} from '../services/lootReveal';
import {closeGameTransaction} from '../services/gameNotifications';
import {toIpfsUrl} from '../services/blendsApi';
import './LootReveal.css';

export default function LootReveal({result, wallet: walletValue, title, onClose, onResolved}) {
  const wallet = String(walletValue || '');
  const dialog = useRef();
  const [items, setItems] = useState(() => extractMintedRewards(result.actionTraces, wallet));
  const [waiting, setWaiting] = useState(true);
  const [retry, setRetry] = useState(0);
  const [owner, setOwner] = useState(wallet);
  const resolvedCallback = useRef(onResolved);
  resolvedCallback.current = onResolved;
  useEffect(() => { if (items.length) {saveReveal(owner, {transactionId:result.transactionId, title, items}); resolvedCallback.current?.();} }, [items, owner, result.transactionId, title]);
  useEffect(() => {saveReveal(wallet, {transactionId:result.transactionId, title});}, [wallet, result.transactionId, title]);
  useEffect(() => {closeGameTransaction(); dialog.current?.showModal();}, []);
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    let attempt = 0;
    let lookupWallet = wallet;
    setOwner(wallet);
    const receipt = extractMintedRewards(result.actionTraces, wallet);
    const saved = readSavedReveals(wallet).find(item=>item.transactionId === result.transactionId);
    const direct = receipt.length ? receipt : (Array.isArray(saved?.items) ? saved.items : []);
    setItems(current => current.map(item=>item.asset_id).join(',') === direct.map(item=>item.asset_id).join(',') ? current : direct);
    if (direct.length) {setWaiting(false); return () => controller.abort();}
    setWaiting(true);
    async function check() {
      let found = [];
      try {found = await fetchTransactionRewards(result.transactionId, lookupWallet, controller.signal);} catch (error) {
        if (controller.signal.aborted) return;
        if (error.code === 'REVEAL_OWNER_MISMATCH' && lookupWallet === wallet) {
          lookupWallet = error.owner;
          setOwner(error.owner);
          removeSavedReveal(wallet, result.transactionId);
          saveReveal(error.owner, {transactionId:result.transactionId, title});
          return check();
        }
        /* Indexing and transport failures are not transaction failures. */
      }
      if (controller.signal.aborted) return;
      if (found.length) {setItems(found);setWaiting(false);return;}
      attempt += 1;
      if (attempt >= 8) {setWaiting(false);return;}
      timer = setTimeout(check, Math.min(attempt * 1000, 5000));
    }
    check();
    return () => {controller.abort();clearTimeout(timer);};
  }, [result, wallet, retry]);
  return <dialog ref={dialog} className="loot-reveal" aria-label="NFT reveal" onCancel={event=>{event.preventDefault();onClose();}}>
    <header><span>TRANSACTION ACCEPTED</span><button aria-label="Close NFT reveal" onClick={onClose}>×</button></header>
    <div className="loot-reveal-body"><h2>{title}</h2>
      {owner !== wallet && <p className="loot-reveal-note">Opened by <strong>{owner}</strong>. You are viewing this account’s public results; your connected wallet is {wallet}.</p>}
      <p role="status">{items.length ? `${items.length} NFT${items.length === 1 ? '' : 's'} received` : waiting ? 'Following your opening and its randomized minting transaction…' : 'The minting transaction is still pending or has not been indexed yet.'}</p>
      {!!items.length && <div className="loot-reveal-grid">{items.map(item=><article key={item.asset_id}>
        {item.image && <img src={toIpfsUrl(item.image)} alt="" />}<div><strong>{item.name}</strong><small>#{item.asset_id}</small></div>
      </article>)}</div>}
      {!items.length && <p className="loot-reveal-note">Saved in Recent transactions for {owner}. Checking results never submits another opening.</p>}
    </div>
    <footer>{result.transactionId && <a href={`https://waxblock.io/transaction/${result.transactionId}`} target="_blank" rel="noopener noreferrer">View transaction ↗</a>}
      {!items.length && !waiting && <button onClick={()=>setRetry(value=>value+1)}>Check again</button>}<button onClick={onClose}>Done</button></footer>
  </dialog>;
}
