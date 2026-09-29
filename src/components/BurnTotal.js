import React, { useEffect, useState } from 'react';
import { fetchBurnTotal, formatBurnTotal } from '../services/burnTotals';
import './BurnTotal.css';

export default function BurnTotal({ account = '' }) {
  const [state, setState] = useState({ account, count: null, status: 'loading' });
  useEffect(() => {
    let disposed = false;
    let controller;
    async function refresh() {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      const timeout = setTimeout(() => request.abort(), 10000);
      try {
        const count = await fetchBurnTotal(account, request.signal);
        if (!disposed && controller === request) setState({ account, count, status: 'ready' });
      } catch {
        if (!disposed && controller === request) setState({ account, count: null, status: 'error' });
      } finally { clearTimeout(timeout); }
    }
    setState({ account, count: null, status: 'loading' });
    refresh();
    const interval = setInterval(refresh, 30000);
    window.addEventListener('cleanup:burn-complete', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(interval);
      window.removeEventListener('cleanup:burn-complete', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [account]);
  const current = state.account === account ? state : { status: 'loading' };
  return (
    <section className="burn-total" aria-label={account ? 'Your NFTs burned' : 'Community NFTs burned'}>
      <span className="burn-total-label">{account ? 'Your NFTs Burned' : 'Community NFTs Burned'}</span>
      <strong className="burn-total-value" role="status" aria-live="polite">
        {current.status === 'ready' ? formatBurnTotal(current.count) : current.status === 'error' ? 'Unavailable' : 'Loading…'}
      </strong>
      <span className="burn-total-caption">
        {account ? `${account} · Burn Center burns` : 'NFTs burned together through the Burn Center'}
      </span>
    </section>
  );
}
