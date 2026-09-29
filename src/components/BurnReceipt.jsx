import React, {useEffect, useRef, useState} from 'react';
import TokenLogo from './TokenLogo';
import {extractBurnReward, fetchBurnReward} from '../services/burnReward';

export default function BurnReceipt({receipt, onDismiss}) {
  const [amount, setAmount] = useState(() => extractBurnReward(receipt.actionTraces, receipt.owner));
  const [checking, setChecking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);
  useEffect(() => {
    if (amount === null) return undefined;
    const timer = setTimeout(() => dismissRef.current?.(), 3000);
    return () => clearTimeout(timer);
  }, [amount]);
  useEffect(() => {
    if (amount !== null) return undefined;
    let stopped = false;
    let timer;
    let controller;
    setChecking(true);
    async function check(index) {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      let reward = null;
      try { reward = await fetchBurnReward(receipt.transactionId, receipt.owner, controller.signal); }
      catch { /* Accepted burn stays successful when history is delayed. */ }
      finally { clearTimeout(timeout); }
      if (stopped) return;
      if (reward !== null) { setAmount(reward); setChecking(false); }
      else if (index < 3) timer = setTimeout(() => check(index + 1), 2000 * (index + 1));
      else setChecking(false);
    }
    check(0);
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); };
  }, [receipt, amount, attempt]);
  return <section className="burn-receipt" aria-label="Burn reward">
    <div role="status"><strong>Burn complete</strong><span>NFT #{receipt.assetId}</span>
      {amount !== null ? <b><TokenLogo symbol="CINDER" size={22} /> +{amount} CINDER received</b>
        : <span>{checking ? 'Checking your CINDER reward…' : 'Reward details are not available yet.'}</span>}
    </div>
    <div className="burn-receipt-actions">
      <button type="button" onClick={onDismiss} aria-label="Dismiss burn reward">Dismiss</button>
      {amount === null && <button type="button" disabled={checking} onClick={() => setAttempt(value => value + 1)}>{checking ? 'Checking…' : 'Check reward'}</button>}
      <a href={`https://waxblock.io/transaction/${receipt.transactionId}`} target="_blank" rel="noopener noreferrer">View transaction ↗</a>
    </div>
  </section>;
}