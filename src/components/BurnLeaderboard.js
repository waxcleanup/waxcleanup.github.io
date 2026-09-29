import React, { useEffect, useState } from 'react';
import { fetchBurnLeaders, formatBurnTotal } from '../services/burnTotals';
import './BurnLeaderboard.css';

export default function BurnLeaderboard() {
  const [state, setState] = useState({ data: null, loading: true, error: false, updated: null });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let disposed = false;
    let controller;
    async function refresh() {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      const timeout = setTimeout(() => request.abort(), 20000);
      setState(previous => ({ ...previous, loading: true, error: false }));
      try {
        const data = await fetchBurnLeaders(request.signal);
        if (!disposed && controller === request) setState({ data, loading: false, error: false, updated: new Date() });
      } catch {
        if (!disposed && controller === request) setState(previous => ({ ...previous, loading: false, error: true }));
      } finally { clearTimeout(timeout); }
    }
    refresh();
    const interval = setInterval(refresh, 60000);
    window.addEventListener('cleanup:burn-complete', refresh);
    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(interval);
      window.removeEventListener('cleanup:burn-complete', refresh);
    };
  }, [retry]);
  return (
    <section className="burn-leaderboard" aria-labelledby="burn-leaderboard-title">
      <header className="burn-leaderboard-header">
        <div>
          <h2 id="burn-leaderboard-title">Top 25 Burners</h2>
          <p>Leading the cleanup, one NFT at a time.</p>
        </div>
        <button type="button" onClick={() => setRetry(value => value + 1)} disabled={state.loading}>
          {state.loading ? 'Updating…' : 'Refresh'}
        </button>
      </header>
      <div className="burn-leaderboard-status" role="status" aria-live="polite">
        {state.error ? (state.data ? 'Could not refresh. Showing the last successful update.' : 'Burn rankings are unavailable. Please try Refresh.') : !state.data ? 'Loading burn rankings…' : ''}
      </div>
      {state.data && (state.data.leaders.length ? (
        <div className="burn-leaderboard-scroll" tabIndex={0} role="region" aria-label="Top burners ranking, scroll for more accounts">
          <table>
            <thead><tr><th scope="col">Rank</th><th scope="col">WAX Account</th><th scope="col">NFTs Burned</th></tr></thead>
            <tbody>
              {state.data.leaders.map((row, index) => (
                <tr key={row.account} className={index < 3 ? 'burn-leaderboard-podium' : undefined}>
                  <td><span className="burn-leaderboard-rank">{index + 1}</span></td>
                  <th scope="row">{row.account}</th>
                  <td>{formatBurnTotal(row.burns)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="burn-leaderboard-empty">No recorded burners yet. Be the first!</p>)}
      <footer>
        <span>Based on current Burn Center account totals.</span>
        {state.data && <span>{state.data.leaders.length} of {state.data.totalAccounts} {state.data.totalAccounts === 1 ? 'burner' : 'burners'} · Updated {state.updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
      </footer>
    </section>
  );
}
