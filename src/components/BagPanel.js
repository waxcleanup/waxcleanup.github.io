// src/components/BagPanel.js
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './BagPanel.css';

import {
  depositCompost,
  depositPack,
  openCratePack,
  depositTool,
} from '../services/depositActions';
import { stakeUserCell } from '../services/userCellActions';
import { stakePlot } from '../services/plotStakeActions';

import StakePlotModal from './StakePlotModal';

// -----------------------------
// IPFS helper (CID -> URL)
// -----------------------------
const IPFS_GATEWAY = (
  process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs'
).replace(/\/$/, '');

const FALLBACK_IPFS_GATEWAY = 'https://ipfs.io/ipfs';

function extractIpfsCid(image) {
  if (!image) return null;

  const s = String(image).trim();
  if (!s) return null;

  if (s.startsWith('ipfs://')) {
    return s.replace('ipfs://', '').replace(/^ipfs\//, '');
  }

  const m = s.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  if (m?.[1]) return m[1];

  if (!/^https?:\/\//i.test(s)) return s;

  return null;
}

function toIpfsUrl(image) {
  if (!image) return null;
  const s = String(image).trim();

  if (/^https?:\/\//i.test(s)) return s;

  const cid = extractIpfsCid(s);
  if (!cid) return null;

  return `${IPFS_GATEWAY}/${cid}`;
}

function buildFallbackImageUrl(image) {
  const cid = extractIpfsCid(image);
  if (!cid) return null;
  return `${FALLBACK_IPFS_GATEWAY}/${cid}`;
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
    else if (
      rawType.includes('tool') ||
      rawType.includes('watering') ||
      rawType.includes('harvest')
    ) {
      bucket = 'tools';
    } else if (rawType.includes('core')) bucket = 'cores';
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

function normalizeBagAsset(a) {
  const rawImg =
    a.image ||
    a.img ||
    a?.data?.img ||
    a?.data?.image ||
    a?.template?.immutable_data?.img ||
    a?.template?.immutable_data?.image ||
    a?.immutable_data?.img ||
    a?.immutable_data?.image ||
    null;

  return {
    ...a,
    raw_image: rawImg,
    image: toIpfsUrl(rawImg),
    asset_id: safeStr(a.asset_id),
    template_id: safeStr(a.template_id),
    recipe_id: a.recipe_id ?? null,
    open_method: a.open_method ?? null,
    open_memo: a.open_memo ?? null,
    can_open: a.can_open ?? null,
  };
}

function getLootDiff(beforeAssets = [], afterAssets = [], openedAssetId = null) {
  const beforeIds = new Set((beforeAssets || []).map((a) => safeStr(a.asset_id)));

  return (afterAssets || []).filter((asset) => {
    const id = safeStr(asset.asset_id);
    if (!id) return false;
    if (openedAssetId && id === safeStr(openedAssetId)) return false;
    return !beforeIds.has(id);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function NFTImage({ asset, className }) {
  if (!asset?.image) return null;

  return (
    <img
      src={asset.image}
      alt={asset.name || `#${asset.asset_id}`}
      className={className}
      loading="lazy"
      onError={(e) => {
        const fallbackUrl = buildFallbackImageUrl(asset.raw_image || asset.image);
        if (fallbackUrl && e.currentTarget.src !== fallbackUrl) {
          e.currentTarget.src = fallbackUrl;
          return;
        }

        e.currentTarget.style.display = 'none';
      }}
    />
  );
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

  const [filterText, setFilterText] = useState('');
  const [sortMode, setSortMode] = useState('newest');
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

  const [plotModalOpen, setPlotModalOpen] = useState(false);
  const [plotToStake, setPlotToStake] = useState(null);

  const [globalFarms, setGlobalFarms] = useState([]);
  const [farmsLoading, setFarmsLoading] = useState(false);

  // Loot reveal modal
  const [lootModalOpen, setLootModalOpen] = useState(false);
  const [lootItems, setLootItems] = useState([]);
  const [lastOpenedPackName, setLastOpenedPackName] = useState('');

  const effectiveFarms = useMemo(() => {
    const list = Array.isArray(farms) ? farms : globalFarms;
    return (list || []).map((f) => {
      const rawImg =
        f.image ||
        f.img ||
        f?.data?.img ||
        f?.data?.image ||
        f?.immutable_data?.img ||
        f?.immutable_data?.image ||
        null;

      return {
        ...f,
        raw_image: rawImg,
        image: toIpfsUrl(rawImg),
        asset_id: String(f.asset_id),
      };
    });
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

  useEffect(() => {
    if (!statusMsg) return;
    const t = setTimeout(() => setStatusMsg(null), 4500);
    return () => clearTimeout(t);
  }, [statusMsg]);

  const fetchBag = async ({ silent = false } = {}) => {
    if (!wallet) {
      setBag(null);
      return [];
    }

    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/bag/${wallet}`
      );
      const payload = res.data || { account: wallet, count: 0, assets: [] };

      const normalizedAssets = (payload.assets || []).map(normalizeBagAsset);
      setBag({ ...payload, assets: normalizedAssets });
      return normalizedAssets;
    } catch (err) {
      console.error('Error loading bag:', err);
      if (!silent) {
        setError('Could not load your bag inventory.');
      }
      return [];
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchBag();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, refreshNonce]);

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
          a.open_method,
          a.recipe_id,
        ]
          .map((x) => safeStr(x).toLowerCase())
          .join(' ');
        return hay.includes(q);
      });
    }

    const byName = (a, b) => safeStr(a.name).localeCompare(safeStr(b.name));
    const byTemplate = (a, b) =>
      Number(a.template_id || 0) - Number(b.template_id || 0);
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
      return {
        ...prev,
        assets: (prev.assets || []).filter((a) => a.asset_id !== asset_id),
      };
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

  const revealLootFromBagDiff = async (beforeAssets, openedAsset) => {
    let bestLoot = [];
    let stablePasses = 0;
    let lastCount = -1;

    // poll for up to ~4 seconds total
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const afterAssets = await fetchBag({ silent: true });
      const loot = getLootDiff(beforeAssets, afterAssets, openedAsset?.asset_id);

      // keep the largest loot set we have seen
      if (loot.length > bestLoot.length) {
        bestLoot = loot;
      }

      // once count stops changing for a couple passes, assume settled
      if (loot.length === lastCount) {
        stablePasses += 1;
      } else {
        stablePasses = 0;
        lastCount = loot.length;
      }

      // if we already found loot and it has stabilized, stop
      if (bestLoot.length > 0 && stablePasses >= 2) {
        break;
      }

      await wait(500);
    }

    if (bestLoot.length > 0) {
      setLootItems(bestLoot);
      setLastOpenedPackName(openedAsset?.name || 'Pack');
      setLootModalOpen(true);
      setStatusMsg(
        `Pack opened ✅ You received ${bestLoot.length} item${bestLoot.length === 1 ? '' : 's'}.`
      );
    } else {
      setLootItems([]);
      setLastOpenedPackName(openedAsset?.name || 'Pack');
      setStatusMsg('Pack opened ✅ Loot may take a moment to appear.');
    }
  };

  const handleCompostDeposit = async (asset) => {
    try {
      setPendingAssetId(asset.asset_id);
      setStatusMsg('Signing compost deposit…');
      await depositCompost(wallet, asset.asset_id, asset.template_id);
      setStatusMsg('Compost deposited ✅');
      removeFromBag(asset.asset_id);
      await notifyChanged();
      await fetchBag({ silent: true });
    } catch (err) {
      console.error(err);
      setStatusMsg(err.message || 'Compost deposit failed or was cancelled.');
    } finally {
      setPendingAssetId(null);
    }
  };

  const handleSeedPackOpen = async (asset) => {
    try {
      const beforeAssets = [...assets];

      setPendingAssetId(asset.asset_id);
      setStatusMsg('Signing seed pack open…');
      await depositPack(wallet, asset.asset_id, asset.template_id);

      removeFromBag(asset.asset_id);
      await notifyChanged();
      await revealLootFromBagDiff(beforeAssets, asset);
    } catch (err) {
      console.error(err);
      setStatusMsg(err.message || 'Seed pack open failed or was cancelled.');
    } finally {
      setPendingAssetId(null);
    }
  };

  const handleGenericPackOpen = async (asset) => {
    try {
      const beforeAssets = [...assets];

      setPendingAssetId(asset.asset_id);
      setStatusMsg('Signing pack open…');
      await openCratePack(wallet, asset);

      removeFromBag(asset.asset_id);
      await notifyChanged();
      await revealLootFromBagDiff(beforeAssets, asset);
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
      await fetchBag({ silent: true });
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
      await fetchBag({ silent: true });
    } catch (err) {
      console.error(err);
      setStatusMsg(err.message || 'Core stake failed or was cancelled.');
    } finally {
      setPendingAssetId(null);
    }
  };

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
      await fetchBag({ silent: true });
    } catch (err) {
      console.error(err);
      setStatusMsg(err.message || 'Plot stake failed or was cancelled.');
    } finally {
      setPendingAssetId(null);
    }
  };

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
            onClick={() => fetchBag()}
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
          <button
            className="bag-status-x"
            onClick={() => setStatusMsg(null)}
            type="button"
          >
            ✕
          </button>
        </div>
      )}

      {assets.length === 0 && (
        <div className="bag-status">
          Your bag is empty — open packs or harvest to fill it.
        </div>
      )}

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

      {lootModalOpen && (
        <div className="bag-loot-overlay" onClick={() => setLootModalOpen(false)}>
          <div
            className="bag-loot-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bag-loot-header">
              <h3 className="bag-loot-title">🎉 {lastOpenedPackName} Opened</h3>
              <button
                className="bag-loot-close"
                onClick={() => setLootModalOpen(false)}
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="bag-loot-subtitle">You received:</div>

            <div className="bag-loot-grid">
              {lootItems.map((item) => (
                <div key={item.asset_id} className="bag-loot-card">
                  <NFTImage asset={item} className="bag-loot-image" />
                  <div className="bag-loot-name">{item.name || `#${item.asset_id}`}</div>
                  <div className="bag-loot-meta">
                    <span className="bag-item-chip">Tpl: {item.template_id}</span>
                    <span className="bag-item-chip">ID: {shortId(item.asset_id)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bag-loot-actions">
              <button
                className="bag-item-btn bag-item-btn-pack"
                onClick={() => setLootModalOpen(false)}
                type="button"
              >
                Nice
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredAssets.length === 0 && assets.length > 0 && (
        <div className="bag-status">No matches for “{filterText}”.</div>
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

                      const isPackUnavailable =
                        groupKey === 'packs' && asset.can_open === false;

                      return (
                        <div
                          key={asset.asset_id}
                          className={`bag-item-card bag-item-${groupKey}`}
                        >
                          <NFTImage asset={asset} className="bag-item-image" />

                          <div className="bag-item-body">
                            <div className="bag-item-name">
                              {asset.name || `#${asset.asset_id}`}
                            </div>

                            <div className="bag-item-meta">
                              <span className="bag-item-chip">
                                Tpl: {asset.template_id}
                              </span>
                              <span className="bag-item-chip">
                                ID: {shortId(asset.asset_id)}
                              </span>
                              {typeLabel ? (
                                <span className="bag-item-tag">{typeLabel}</span>
                              ) : null}
                              {groupKey === 'packs' && asset.recipe_id ? (
                                <span className="bag-item-chip">
                                  Recipe: {asset.recipe_id}
                                </span>
                              ) : null}
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

                            {groupKey === 'tools' && (
                              <button
                                className="bag-item-btn bag-item-btn-tool"
                                disabled={pendingAssetId === asset.asset_id}
                                onClick={() => handleToolStake(asset)}
                              >
                                {pendingAssetId === asset.asset_id
                                  ? 'Staking…'
                                  : 'Stake Tool'}
                              </button>
                            )}

                            {groupKey === 'cores' && (
                              <button
                                className="bag-item-btn bag-item-btn-core"
                                disabled={pendingAssetId === asset.asset_id}
                                onClick={() => handleCoreStake(asset)}
                              >
                                {pendingAssetId === asset.asset_id
                                  ? 'Staking…'
                                  : 'Stake Core'}
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
                                {pendingAssetId === asset.asset_id
                                  ? 'Depositing…'
                                  : 'Deposit Compost'}
                              </button>
                            )}

                            {groupKey === 'seeds' && (
                              <button
                                className="bag-item-btn bag-item-btn-pack"
                                disabled={pendingAssetId === asset.asset_id}
                                onClick={() => handleSeedPackOpen(asset)}
                              >
                                {pendingAssetId === asset.asset_id
                                  ? 'Opening…'
                                  : 'Open Seed Pack'}
                              </button>
                            )}

                            {groupKey === 'packs' && (
                              <button
                                className="bag-item-btn bag-item-btn-pack"
                                disabled={
                                  pendingAssetId === asset.asset_id || isPackUnavailable
                                }
                                onClick={() => handleGenericPackOpen(asset)}
                                title={
                                  isPackUnavailable
                                    ? 'This pack cannot be opened yet.'
                                    : ''
                                }
                              >
                                {pendingAssetId === asset.asset_id
                                  ? 'Opening…'
                                  : isPackUnavailable
                                  ? 'Unavailable'
                                  : 'Open Pack'}
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