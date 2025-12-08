// src/components/BagPanel.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './BagPanel.css';
import { depositCompost, depositPack } from '../services/depositActions';

// Helper to categorize assets into logical groups
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
    const rawType =
      (asset.nft_type ||
        asset.tool_type ||
        asset.schema ||
        asset.type ||
        asset.name ||
        ''
      ).toString()
        .toLowerCase();

    let bucket = 'other';

    if (rawType.includes('seed')) {
      bucket = 'seeds';
    } else if (rawType.includes('compost')) {
      bucket = 'compost';
    } else if (
      rawType.includes('tool') ||
      rawType.includes('watering') ||
      rawType.includes('harvest')
    ) {
      bucket = 'tools';
    } else if (rawType.includes('core')) {
      bucket = 'cores';
    } else if (rawType.includes('plot')) {
      bucket = 'plots';
    } else if (
      rawType.includes('pack') ||
      rawType.includes('crate')
    ) {
      bucket = 'packs';
    } else if (rawType.includes('farm')) {
      bucket = 'farms';
    }

    groups[bucket].push(asset);
  });

  return groups;
}

export default function BagPanel({ wallet, onEquipTool, toolPending }) {
  const [bag, setBag] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [statusMsg, setStatusMsg] = useState(null);
  const [pendingAssetId, setPendingAssetId] = useState(null);

  // Load bag for current wallet
  useEffect(() => {
    const fetchBag = async () => {
      if (!wallet) {
        setBag(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/bag/${wallet}`
        );
        setBag(res.data || { account: wallet, count: 0, assets: [] });
      } catch (err) {
        console.error('Error loading bag:', err);
        setError('Could not load your bag inventory.');
      } finally {
        setLoading(false);
      }
    };

    fetchBag();
  }, [wallet]);

  const assets = bag?.assets || [];
  const grouped = groupAssets(assets);

  const handleCompostDeposit = async (asset) => {
    if (!wallet) return;

    try {
      setPendingAssetId(asset.asset_id);
      setStatusMsg('Signing compost deposit…');

      await depositCompost(wallet, asset.asset_id, asset.template_id);

      setStatusMsg('Compost deposited successfully.');
      setBag((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          assets: prev.assets.filter((a) => a.asset_id !== asset.asset_id),
        };
      });
    } catch (err) {
      console.error(err);
      setStatusMsg(err.message || 'Compost deposit failed or was cancelled.');
    } finally {
      setPendingAssetId(null);
    }
  };

  const handleSeedPackOpen = async (asset) => {
    if (!wallet) return;

    try {
      setPendingAssetId(asset.asset_id);
      setStatusMsg('Signing seed pack open…');

      await depositPack(wallet, asset.asset_id, asset.template_id);

      setStatusMsg('Seed pack opened successfully.');
      setBag((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          assets: prev.assets.filter((a) => a.asset_id !== asset.asset_id),
        };
      });
    } catch (err) {
      console.error(err);
      setStatusMsg(err.message || 'Seed pack open failed or was cancelled.');
    } finally {
      setPendingAssetId(null);
    }
  };

  const handleGenericPackOpen = async (asset) => {
    if (!wallet) return;

    try {
      setPendingAssetId(asset.asset_id);
      setStatusMsg('Signing pack open…');

      await depositPack(wallet, asset.asset_id, asset.template_id);

      setStatusMsg('Pack opened successfully.');
      setBag((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          assets: prev.assets.filter((a) => a.asset_id !== asset.asset_id),
        };
      });
    } catch (err) {
      console.error(err);
      setStatusMsg(err.message || 'Pack open failed or was cancelled.');
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
        <h3 className="bag-title">🎒 Bag</h3>
        <span className="bag-count">
          {assets.length} item{assets.length === 1 ? '' : 's'}
        </span>
      </div>

      {statusMsg && (
        <div className="bag-status bag-status-action">
          {statusMsg}
        </div>
      )}

      {assets.length === 0 && (
        <div className="bag-status">
          Your bag is empty — open some packs or harvest to fill it.
        </div>
      )}

      {assets.length > 0 && (
        <div className="bag-groups">
          {groupOrder.map(({ key: groupKey, label }) => {
            const list = grouped[groupKey] || [];
            if (!list.length) return null;

            return (
              <div key={groupKey} className="bag-group">
                <div className="bag-group-header">
                  <h4 className="bag-group-title">{label}</h4>
                  <span className="bag-group-count">
                    {list.length}
                  </span>
                </div>

                <div className="bag-grid">
                  {list.map((asset) => (
                    <div
                      key={asset.asset_id}
                      className={`bag-item-card bag-item-${groupKey}`}
                    >
                      {asset.image && (
                        <img
                          src={asset.image}
                          alt={asset.name}
                          className="bag-item-image"
                        />
                      )}

                      <div className="bag-item-body">
                        <div className="bag-item-name">
                          {asset.name || `#${asset.asset_id}`}
                        </div>

                        <div className="bag-item-meta">
                          <span>
                            Tpl: {asset.template_id}
                          </span>
                          {asset.nft_type && (
                            <span className="bag-item-tag">
                              {asset.nft_type}
                            </span>
                          )}
                          {asset.tool_type && (
                            <span className="bag-item-tag">
                              {asset.tool_type}
                            </span>
                          )}
                        </div>

                        {/* ---------------------------- */}
                        {/*         ACTION BUTTONS       */}
                        {/* ---------------------------- */}

                        {groupKey === 'tools' && (
                          <button
                            className="bag-item-btn bag-item-btn-equip"
                            disabled={toolPending === `equip-${asset.tool_type}`}
                            onClick={() =>
                              onEquipTool(asset.tool_type, asset.asset_id)
                            }
                          >
                            {toolPending === `equip-${asset.tool_type}`
                              ? 'Equipping…'
                              : 'Equip Tool'}
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
                            disabled={pendingAssetId === asset.asset_id}
                            onClick={() => handleGenericPackOpen(asset)}
                          >
                            {pendingAssetId === asset.asset_id
                              ? 'Opening…'
                              : 'Open Pack'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

