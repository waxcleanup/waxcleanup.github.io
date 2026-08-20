import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './MyPlotsPanel.css';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'https://maestrobeatz.servegame.com').replace(/\/$/, '');
const IPFS_GATEWAY = (process.env.REACT_APP_IPFS_GATEWAY || 'https://maestrobeatz.servegame.com/ipfs').replace(/\/$/, '');

function imageUrl(value) {
  if (!value) return '';
  const text = String(value);
  if (text.includes('/ipfs/')) return `${IPFS_GATEWAY}/${text.split('/ipfs/')[1]}`;
  if (/^https?:\/\//i.test(text)) return text;
  return `${IPFS_GATEWAY}/${text.replace(/^ipfs:\/\//, '')}`;
}

export default function MyPlotsPanel({ refreshNonce, onSelectFarmer }) {
  const [farmers, setFarmers] = useState([]);
  const [farmerSearch, setFarmerSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [needsWater, setNeedsWater] = useState(false);
  const [farmId, setFarmId] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], pagination: null });
  const [farmersLoading, setFarmersLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [leaderboardMetric, setLeaderboardMetric] = useState('plots');
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setFarmersLoading(true);
    axios.get(`${API_BASE_URL}/api/plots/owners`, {
      params: { limit: 250 },
      signal: controller.signal,
    })
      .then((response) => setFarmers(response.data?.items || []))
      .catch((requestError) => {
        if (requestError?.code !== 'ERR_CANCELED') setError('Could not load the farmer list.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setFarmersLoading(false);
      });
    return () => controller.abort();
  }, [refreshNonce]);

  useEffect(() => {
    const controller = new AbortController();
    setLeaderboardLoading(true);
    axios.get(`${API_BASE_URL}/api/plots/leaderboard`, {
      params: { metric: leaderboardMetric, limit: 10 },
      signal: controller.signal,
    })
      .then((response) => setLeaderboard(response.data?.items || []))
      .catch((requestError) => {
        if (requestError?.code !== 'ERR_CANCELED') setError('Could not load the leaderboard.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLeaderboardLoading(false);
      });
    return () => controller.abort();
  }, [leaderboardMetric, refreshNonce]);

  useEffect(() => {
    if (!selectedAccount) {
      setResult({ items: [], pagination: null });
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const params = { page, limit: 12, state: stateFilter };
    if (needsWater) params.needsWater = true;
    if (farmId.trim()) params.farmId = farmId.trim();

    axios.get(`${API_BASE_URL}/api/plots/owner/${selectedAccount}`, {
      params,
      signal: controller.signal,
    })
      .then((response) => setResult(response.data))
      .catch((requestError) => {
        if (requestError?.code !== 'ERR_CANCELED') {
          setError(requestError?.response?.data?.message || 'Could not load this farmer\'s plots.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [selectedAccount, page, stateFilter, needsWater, farmId, refreshNonce]);

  const visibleFarmers = useMemo(() => {
    const search = farmerSearch.trim().toLowerCase();
    return search ? farmers.filter((farmer) => farmer.account.includes(search)) : farmers;
  }, [farmers, farmerSearch]);

  const selectFarmer = (account) => {
    setSelectedAccount(account);
    onSelectFarmer?.(account);
    setPage(1);
    setStateFilter('all');
    setNeedsWater(false);
    setFarmId('');
  };

  const clearFarmer = () => {
    setSelectedAccount('');
    onSelectFarmer?.('');
    setResult({ items: [], pagination: null });
  };

  return (
    <section className="my-plots-panel">
      <div className="my-plots-heading">
        <div>
          <h2>Farmer Plots</h2>
          <p>Select a farmer to request and view only that account's plots.</p>
        </div>
        <span className="my-plots-total">{farmers.length} farmers</span>
      </div>

      <div className="farmer-leaderboard">
        <div className="leaderboard-header"><strong>Farmer Leaderboard</strong><span>Current on-chain state</span></div>
        <div className="leaderboard-tabs">
          {[['plots', 'Plots'], ['farms', 'Farms'], ['growing', 'Growing'], ['ready', 'Ready'], ['needs_water', 'Need Water']].map(([metric, label]) => (
            <button type="button" key={metric} className={leaderboardMetric === metric ? 'is-active' : ''} onClick={() => setLeaderboardMetric(metric)}>{label}</button>
          ))}
        </div>
        {leaderboardLoading ? <div className="my-plots-message">Loading rankings...</div> : (
          <div className="leaderboard-list">
            {leaderboard.map((entry) => (
              <button type="button" key={entry.account} onClick={() => selectFarmer(entry.account)}>
                <span className="leaderboard-rank">#{entry.rank}</span><strong>{entry.account}</strong><b>{entry.value}</b>
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="farmer-search">
        Find farmer
        <input value={farmerSearch} placeholder="Search WAX account" onChange={(event) => setFarmerSearch(event.target.value.toLowerCase())} />
      </label>

      <div className="farmer-list" aria-label="Farmers with plots">
        {farmersLoading && <span className="my-plots-message">Loading farmers...</span>}
        {!farmersLoading && visibleFarmers.map((farmer) => (
          <button
            type="button"
            key={farmer.account}
            className={selectedAccount === farmer.account ? 'is-selected' : ''}
            onClick={() => selectFarmer(farmer.account)}
          >
            <strong>{farmer.account}</strong>
            <span>{farmer.plot_count} plots / {farmer.farm_count} farms</span>
          </button>
        ))}
      </div>

      {!selectedAccount ? (
        <div className="my-plots-message">Choose a farmer above. No plot data is loaded until you make a selection.</div>
      ) : (
        <>
          <div className="selected-farmer-row">
            <strong>Viewing {selectedAccount}</strong>
            <button type="button" onClick={clearFarmer}>Clear</button>
          </div>

          <div className="my-plots-filters">
            <label>Status<select value={stateFilter} onChange={(event) => { setStateFilter(event.target.value); setPage(1); }}><option value="all">All</option><option value="empty">Has empty slot</option><option value="growing">Growing</option><option value="ready">Ready to harvest</option></select></label>
            <label>Farm asset ID<input value={farmId} inputMode="numeric" placeholder="All farms" onChange={(event) => { setFarmId(event.target.value.replace(/\D/g, '')); setPage(1); }} /></label>
            <label className="my-plots-water-filter"><input type="checkbox" checked={needsWater} onChange={(event) => { setNeedsWater(event.target.checked); setPage(1); }} />Needs water now</label>
          </div>

          {error && <div className="my-plots-message error">{error}</div>}
          {loading && <div className="my-plots-message">Loading {selectedAccount}'s plots...</div>}
          {!loading && !error && (result.items || []).length === 0 && <div className="my-plots-message">No plots match these filters.</div>}

          <div className="my-plots-grid">
            {(result.items || []).map((plot) => {
              const counts = (plot.slots || []).reduce((value, slot) => { const state = String(slot.state || '').toLowerCase(); value[state] = (value[state] || 0) + 1; return value; }, { empty: 0, growing: 0, ready: 0 });
              return <article className="my-plot-card" key={plot.plot_asset_id}>{plot.image ? <img src={imageUrl(plot.image)} alt="" /> : <div className="my-plot-image-empty" />}<div className="my-plot-info"><strong>{String(plot.name || 'Plot')}</strong><span>Plot #{plot.plot_asset_id}</span><span>Farm #{plot.farm_id}</span><div className="my-plot-states"><b>{counts.empty} empty</b><b>{counts.growing} growing</b><b>{counts.ready} ready</b></div></div></article>;
            })}
          </div>

          {result.pagination && result.pagination.total_pages > 1 && <div className="my-plots-pagination"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {result.pagination.page} of {result.pagination.total_pages}</span><button disabled={!result.pagination.has_more || loading} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
        </>
      )}
    </section>
  );
}

