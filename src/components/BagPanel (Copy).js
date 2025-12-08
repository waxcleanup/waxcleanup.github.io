// src/components/BagPanel.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './BagPanel.css';

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

export default function BagPanel({ wallet }) {
  const [bag, setBag] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const assets = bag?.assets || [];
  const grouped = groupAssets(assets);

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

      {assets.length === 0 && (
        <div className="bag-status">
          Your bag is empty — open some packs or harvest to fill it.
        </div>
      )}

      {assets.length > 0 && (
        <div className="bag-groups">
          {groupOrder.map(({ key, label }) => {
            const list = grouped[key] || [];
            if (!list.length) return null;

            return (
              <div key={key} className="bag-group">
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
                      className={`bag-item-card bag-item-${key}`}
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
