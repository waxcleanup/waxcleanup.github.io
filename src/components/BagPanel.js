// src/components/BagPanel.js
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './BagPanel.css';

import { depositCompost, depositPack, depositTool } from '../services/depositActions';
import { stakeUserCell } from '../services/userCellActions';
import { stakePlot } from '../services/plotStakeActions';

import StakePlotModal from './StakePlotModal';

// -----------------------------
// IPFS helper (CID -> URL)
// -----------------------------
const IPFS_GATEWAY = (process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs').replace(/\/$/, '');

function toIpfsUrl(image) {
  if (!image) return null;
  const s = String(image).trim();

  if (/^https?:\/\//i.test(s)) return s;

  if (s.startsWith('ipfs://')) {
    const cid = s.replace('ipfs://', '').replace(/^ipfs\//, '');
    return `${IPFS_GATEWAY}/${cid}`;
  }

  const m = s.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  if (m?.[1]) return `${IPFS_GATEWAY}/${m[1]}`;

  return `${IPFS_GATEWAY}/${s}`;
}

function groupAssets(assets = []) {
  const groups = {
    seeds: [],
    compost: [],
    tools: [],
    cores: [],
    plots: [],
    packs: [],
    farms: [],
    other: [],
  };

  assets.forEach((asset) => {
    const rawType = (
      asset.nft_type ||
      asset.tool_type ||
      asset.schema ||
      asset.type ||
      asset.name ||
      ''
    )
      .toString()
      .toLowerCase();

    let bucket = 'other';

    if (rawType.includes('seed')) bucket = 'seeds';
    else if (rawType.includes('compost')) bucket = 'compost';
    else if (rawType.includes('tool') || rawType.includes('watering') || rawType.includes('harvest')) bucket = 'tools';
    else if (rawType.includes('core')) bucket = 'cores';
    else if (rawType.includes('plot')) bucket = 'plots';
    else if (rawType.includes('pack') || rawType.includes('crate')) bucket = 'packs';
    else if (rawType.includes('farm')) bucket = 'farms';

    groups[bucket].push(asset);
  });

  return groups;
}

function safeStr(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function shortId(id) {
  const s = safeStr(id);
  if (s.length <= 10) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

export default function BagPanel({
  wallet,
  farms = null,
  refreshNonce = 0,
  onChanged = null,
}) {
  const [bag, setBag] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [statusMsg, setStatusMsg] = useState(null);
  const [pendingAssetId, setPendingAssetId] = useState(null);

  // ✅ UX controls
  const [filterText, setFilterText] = useState('');
  const [sortMode, setSortMode] = useState('newest'); // newest | name | template | type
  const [collapsed, setCollapsed] = useState({
    seeds: false,
    compost: false,
    tools: false,
    cores: false,
    plots: false,
    packs: false,
    farms: false,
    other: false,
  });

  // Plot stake modal
  const [plotModalOpen, setPlotModalOpen] = useState(false);
  const [plotToStake, setPlotToStake] = useState(null);

  // If farms prop isn't provided, fetch farms as fallback
  const [globalFarms, setGlobalFarms] = useState([]);
  const [farmsLoading, setFarmsLoading] = useState(false);

  const effectiveFarms = useMemo(() => {
    const list = Array.isArray(farms) ? farms : globalFarms;
    return (list || []).map((f) => ({
      ...f,
      image: toIpfsUrl(f.image),
      asset_id: String(f.asset_id),
    }));
  }, [farms, globalFarms]);

  const notifyChanged = async () => {
    if (typeof onChanged === 'function') {
      try {
        await onChanged();
      } catch (e) {
        console.error('[BagPanel] onChanged callback failed:', e);
      }
    }
  };

  // ✅ Auto-dismiss status messages
  useEffect(() => {
    if (!statusMsg) return;
    const t = setTimeout(() => setStatusMsg(null), 4500);
    return () => clearTimeout(t);
  }, [statusMsg]);

  // -----------------------------
  // Load bag
  // -----------------------------
  const fetchBag = async () => {
    if (!wallet) {
      setBag(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/bag/${wallet}`);
      const payload = res.data || { account: wallet, count: 0, assets: [] };

      const normalizedAssets = (payload.assets || []).map((a) => ({
        ...a,
        image: toIpfsUrl(a.image),
        asset_id: safeStr(a.asset_id),
        template_id: safeStr(a.template_id),
      }));

      setBag({ ...payload, assets: normalizedAssets });
    } catch (err) {
      console.error('Error loading bag:', err);
      setError('Could not load your bag inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBag();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, refreshNonce]);

  // -----------------------------
  // Fallback farms loader
  // -----------------------------
  const loadGlobalFarmsFallback = async () => {
    if (Array.isArray(farms)) return farms;
    if (farmsLoading) return globalFarms;

    setFarmsLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/farms`);
      const list = res?.data?.farms || [];
      setGlobalFarms(list);
      return list;
    } catch (err) {
      console.error('Error loading global farms:', err);
      setStatusMsg('Failed to load farms list.');
      setGlobalFarms([]);
      return [];
    } finally {
      setFarmsLoading(false);
    }
  };

  const assets = bag?.assets || [];

  // ✅ filter + sort (before grouping)
  const filteredAssets = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    let list = [...assets];

    if (q) {
      list = list.filter((a) => {
        const hay = [
          a.name,
          a.asset_id,
          a.template_id,
          a.nft_type,
          a.tool_type,
          a.schema,
          a.type,
        ]
          .map((x) => safeStr(x).toLowerCase())
          .join(' ');
        return hay.includes(q);
      });
    }

    const byName = (a, b) => safeStr(a.name).localeCompare(safeStr(b.name));
    const byTemplate = (a, b) => Number(a.template_id || 0) - Number(b.template_id || 0);
    const byType = (a, b) =>
      safeStr(a.nft_type || a.tool_type || a.type).localeCompare(
        safeStr(b.nft_type || b.tool_type || b.type)
      );
    const byNewest = (a, b) => Number(b.asset_id || 0) - Number(a.asset_id || 0);

    if (sortMode === 'name') list.sort(byName);
    else if (sortMode === 'template') list.sort(byTemplate);
    else if (sortMode === 'type') list.sort(byType);
    else list.sort(byNewest);

    return list;
  }, [assets, filterText, sortMode]);

  const grouped = useMemo(() => groupAssets(filteredAssets), [filteredAssets]);

  const removeFromBag = (asset_id) => {
    setBag((prev) => {
      if (!prev) return prev;
      return { ...prev, assets: (prev.assets || []).filter((a) => a.asset_id !== asset_id) };
    });
  };

  const toggleGroup = (key) => {
    setCollapsed((p) => ({ ...p, [key]: !p[key] }));
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text));
      setStatusMsg('Copied to clipboard ✅');
    } catch (e) {
      console.error('Clipboard failed:', e);
      setStatusMsg('Copy failed ❌');
    }
  };

  // -----------------------------
  // Action handlers
  // -----------------------------
  const handleCompostDeposit = async (asset) => {
    try {
      setPendingAssetId(asset.asset_id);
      setStatusMsg('Signing compost deposit…');
      await depositCompost(wallet, asset.asset_id, asset.template_id);
      setStatusMsg('Compost deposited ✅');
      removeFromBag(asset.asset_id);
      await notifyChanged();
    } catch (err) {
      console.error(err);
      setStatusMsg(err.message || 'Compost deposit failed or was cancelled.');
    } finally {
      setPendingAssetId(null);
    }
  };

  const handleSeedPackOpen = async (asset) => {
    try {
      setPendingAssetId(asset.asset_id);
      setStatusMsg('Signing seed pack open…');
      await depositPack(wallet, asset.asset_id, asset.template_id);
      setStatusMsg('Seed pack opened ✅');
      removeFromBag(asset.asset_id);
      await notifyChanged();
    } catch (err) {
      console.error(err);
      setStatusMsg(err.message || 'Seed pack open failed or was cancelled.');
    } finally {
      setPendingAssetId(null);
    }
  };

  const handleGenericPackOpen = async (asset) => {
    try {
      setPendingAssetId(asset.asset_id);
      setStatusMsg('Signing pack open…');
      await depositPack(wallet, asset.asset_id, asset.template_id);
      setStatusMsg('Pack opened ✅');
      removeFromBag(asset.asset_id);
      await notifyChanged();
    } catch (err) {
      console.error(err);
      setStatusMsg(err.message || 'Pack open failed or was cancelled.');
    } finally {
      setPendingAssetId(null);
    }
  };

  const handleToolStake = async (asset) => {
    try {
      setPendingAssetId(asset.asset_id);
      setStatusMsg('Signing tool stake…');
      await depositTool(wallet, asset.asset_id, asset.template_id);
      setStatusMsg('Tool staked ✅');
      removeFromBag(asset.asset_id);
      await notifyChanged();
    } catch (err) {
      console.error(err);
      setStatusMsg(err.message || 'Tool stake failed or was cancelled.');
    } finally {
      setPendingAssetId(null);
    }
  };

  const handleCoreStake = async (asset) => {
    try {
      setPendingAssetId(asset.asset_id);
      setStatusMsg('Signing core stake…');
      await stakeUserCell(wallet, asset.asset_id, asset.template_id);
      setStatusMsg('Core staked ✅');
      removeFromBag(asset.asset_id);
      await notifyChanged();
    } catch (err) {
      console.error(err);
      setStatusMsg(err.message || 'Core stake failed or was cancelled.');
    } finally {
      setPendingAssetId(null);
    }
  };

  // ---- Plot staking flow ----
  const openStakePlotModal = async (asset) => {
    setPlotToStake(asset);
    setPlotModalOpen(true);

    if (!Array.isArray(farms) && !globalFarms.length && !farmsLoading) {
      await loadGlobalFarmsFallback();
    }
  };

  const confirmStakePlot = async (farmId) => {
    if (!plotToStake) return;

    try {
      setPendingAssetId(plotToStake.asset_id);
      setStatusMsg('Signing plot stake…');

      await stakePlot(wallet, farmId, plotToStake.asset_id, plotToStake.template_id);

      setStatusMsg('Plot staked ✅');
      removeFromBag(plotToStake.asset_id);
      setPlotModalOpen(false);
      setPlotToStake(null);

      await notifyChanged();
    } catch (err) {
      console.error(err);
      setStatusMsg(err.message || 'Plot stake failed or was cancelled.');
    } finally {
      setPendingAssetId(null);
    }
  };

  // -----------------------------
  // Render guards
  // -----------------------------
  if (!wallet) {
    return (
      <div className="bag-panel">
        <h3 className="bag-title">🎒 Bag</h3>
        <div className="bag-status">Connect your wallet to see your bag.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bag-panel">
        <h3 className="bag-title">🎒 Bag</h3>
        <div className="bag-status">Loading your bag…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bag-panel">
        <h3 className="bag-title">🎒 Bag</h3>
        <div className="bag-status bag-error">{error}</div>
      </div>
    );
  }

  const groupOrder = [
    { key: 'seeds', label: '🌱 Seeds' },
    { key: 'compost', label: '♻️ Compost' },
    { key: 'tools', label: '🛠 Tools' },
    { key: 'cores', label: '🔋 Core Cells' },
    { key: 'plots', label: '🧱 Plots' },
    { key: 'packs', label: '📦 Packs & Crates' },
    { key: 'farms', label: '🌾 Farms' },
    { key: 'other', label: '📁 Other' },
  ];

  return (
    <div className="bag-panel">
      <div className="bag-header-row">
        <div className="bag-header-left">
          <h3 className="bag-title">🎒 Bag</h3>
          <span className="bag-count">
            {assets.length} item{assets.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="bag-controls">
          <input
            className="bag-search"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search (name / asset / tpl / type)…"
          />

          <select
            className="bag-sort"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
          >
            <option value="newest">Newest</option>
            <option value="name">Name</option>
            <option value="template">Template</option>
            <option value="type">Type</option>
          </select>

          <button
            className="bag-refresh"
            onClick={fetchBag}
            disabled={!!pendingAssetId}
            title="Refresh bag"
          >
            🔄
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="bag-status bag-status-action">
          {statusMsg}
          <button className="bag-status-x" onClick={() => setStatusMsg(null)}>✕</button>
        </div>
      )}

      {assets.length === 0 && (
        <div className="bag-status">Your bag is empty — open packs or harvest to fill it.</div>
      )}

      {/* Plot stake modal */}
      <StakePlotModal
        open={plotModalOpen}
        plotAsset={plotToStake}
        farms={effectiveFarms}
        stakedFarms={effectiveFarms}
        onConfirm={(farmId) => confirmStakePlot(farmId)}
        onClose={() => {
          setPlotModalOpen(false);
          setPlotToStake(null);
        }}
      />

      {filteredAssets.length === 0 && assets.length > 0 && (
        <div className="bag-status">
          No matches for “{filterText}”.
        </div>
      )}

      {filteredAssets.length > 0 && (
        <div className="bag-groups">
          {groupOrder.map(({ key: groupKey, label }) => {
            const list = grouped[groupKey] || [];
            if (!list.length) return null;

            const isCollapsed = !!collapsed[groupKey];

            return (
              <div key={groupKey} className="bag-group">
                <button
                  className="bag-group-header bag-group-toggle"
                  onClick={() => toggleGroup(groupKey)}
                  type="button"
                >
                  <div className="bag-group-left">
                    <h4 className="bag-group-title">{label}</h4>
                    <span className="bag-group-count">{list.length}</span>
                  </div>
                  <div className="bag-group-caret">{isCollapsed ? '▸' : '▾'}</div>
                </button>

                {!isCollapsed && (
                  <div className="bag-grid">
                    {list.map((asset) => {
                      const typeLabel =
                        asset.nft_type || asset.tool_type || asset.type || asset.schema || '';

                      return (
                        <div key={asset.asset_id} className={`bag-item-card bag-item-${groupKey}`}>
                          {!!asset.image && (
                            <img
                              src={asset.image}
                              alt={asset.name || `#${asset.asset_id}`}
                              className="bag-item-image"
                            />
                          )}

                          <div className="bag-item-body">
                            <div className="bag-item-name">{asset.name || `#${asset.asset_id}`}</div>

                            <div className="bag-item-meta">
                              <span className="bag-item-chip">Tpl: {asset.template_id}</span>
                              <span className="bag-item-chip">ID: {shortId(asset.asset_id)}</span>
                              {typeLabel ? <span className="bag-item-tag">{typeLabel}</span> : null}
                            </div>

                            <div className="bag-item-minirow">
                              <button
                                className="bag-item-mini"
                                onClick={() => copyToClipboard(asset.asset_id)}
                                type="button"
                                title="Copy Asset ID"
                              >
                                📋 Copy
                              </button>
                            </div>

                            {/* ACTION BUTTONS */}
                            {groupKey === 'tools' && (
                              <button
                                className="bag-item-btn bag-item-btn-tool"
                                disabled={pendingAssetId === asset.asset_id}
                                onClick={() => handleToolStake(asset)}
                              >
                                {pendingAssetId === asset.asset_id ? 'Staking…' : 'Stake Tool'}
                              </button>
                            )}

                            {groupKey === 'cores' && (
                              <button
                                className="bag-item-btn bag-item-btn-core"
                                disabled={pendingAssetId === asset.asset_id}
                                onClick={() => handleCoreStake(asset)}
                              >
                                {pendingAssetId === asset.asset_id ? 'Staking…' : 'Stake Core'}
                              </button>
                            )}

                            {groupKey === 'plots' && (
                              <button
                                className="bag-item-btn bag-item-btn-plot"
                                disabled={pendingAssetId === asset.asset_id}
                                onClick={() => openStakePlotModal(asset)}
                              >
                                {pendingAssetId === asset.asset_id
                                  ? 'Staking…'
                                  : farmsLoading
                                  ? 'Loading farms…'
                                  : 'Stake Plot'}
                              </button>
                            )}

                            {groupKey === 'compost' && (
                              <button
                                className="bag-item-btn bag-item-btn-compost"
                                disabled={pendingAssetId === asset.asset_id}
                                onClick={() => handleCompostDeposit(asset)}
                              >
                                {pendingAssetId === asset.asset_id ? 'Depositing…' : 'Deposit Compost'}
                              </button>
                            )}

                            {groupKey === 'seeds' && (
                              <button
                                className="bag-item-btn bag-item-btn-pack"
                                disabled={pendingAssetId === asset.asset_id}
                                onClick={() => handleSeedPackOpen(asset)}
                              >
                                {pendingAssetId === asset.asset_id ? 'Opening…' : 'Open Seed Pack'}
                              </button>
                            )}

                            {groupKey === 'packs' && (
                              <button
                                className="bag-item-btn bag-item-btn-pack"
                                disabled={pendingAssetId === asset.asset_id}
                                onClick={() => handleGenericPackOpen(asset)}
                              >
                                {pendingAssetId === asset.asset_id ? 'Opening…' : 'Open Pack'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

