import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './YieldPanel.css';

function formatNumber(value) {
  const num = Number(value || 0);
  return num.toLocaleString();
}

export default function YieldPanel() {
  const [data, setData] = useState({
    seeds: [],
    packs: [],
    compost: [],
    tokens: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError('');

        const res = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/game/reference-data`
        );

        if (!mounted) return;

        setData({
          seeds: res.data.seeds || [],
          packs: res.data.packs || [],
          compost: res.data.compost || [],
          tokens: res.data.tokens || [],
        });
      } catch (err) {
        console.error('Failed to load yield panel data:', err);
        if (mounted) {
          setError('Failed to load game yield data.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const seedMap = useMemo(() => {
    const map = new Map();
    for (const seed of data.seeds) {
      map.set(Number(seed.template_id), seed);
    }
    return map;
  }, [data.seeds]);

  const enrichedPacks = useMemo(() => {
    return data.packs.map((pack) => {
      const seed = seedMap.get(Number(pack.seed_type_id));

      if (!seed) {
        return {
          ...pack,
          seed_name: 'Unknown Seed',
          token_symbol_code: '',
          total_yield_display: '0',
          per_seed_display: '0',
        };
      }

      const rawPerSeed = Number(seed.base_yield_raw || 0);
      const tokenDecimals = Number(seed.token_decimals || 0);
      const totalRaw = rawPerSeed * Number(pack.count || 0);
      const divisor = 10 ** tokenDecimals;
      const totalDisplay = (totalRaw / divisor).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: tokenDecimals,
      });

      return {
        ...pack,
        seed_name: seed.seed_name,
        token_symbol_code: seed.token_symbol_code,
        per_seed_display: seed.base_yield_display,
        total_yield_display: totalDisplay,
        growth_duration_display: seed.growth_duration_display,
        water_ticks: seed.water_ticks,
      };
    });
  }, [data.packs, seedMap]);

  const totals = useMemo(() => {
    const totalSeedTypes = data.seeds.length;
    const totalPackTypes = data.packs.length;
    const totalCompostTypes = data.compost.length;
    const totalTokenTypes = data.tokens.length;

    const highestYieldSeed = [...data.seeds].sort(
      (a, b) => Number(b.base_yield_raw || 0) - Number(a.base_yield_raw || 0)
    )[0];

    const bestPack = [...enrichedPacks].sort((a, b) => {
      const aVal = Number(String(a.total_yield_display || '0').replace(/,/g, ''));
      const bVal = Number(String(b.total_yield_display || '0').replace(/,/g, ''));
      return bVal - aVal;
    })[0];

    return {
      totalSeedTypes,
      totalPackTypes,
      totalCompostTypes,
      totalTokenTypes,
      highestYieldSeed,
      bestPack,
    };
  }, [data, enrichedPacks]);

  if (loading) {
    return (
      <div className="yield-panel">
        <div className="yield-loading">Loading yield panel...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="yield-panel">
        <div className="yield-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="yield-panel">
      <div className="yield-header">
        <h2>🌾 In-Game Yield Panel</h2>
        <p>Reference view for seeds, packs, compost, and token outputs.</p>
      </div>

      <div className="yield-summary-grid">
        <div className="yield-card">
          <div className="yield-card-label">Seed Types</div>
          <div className="yield-card-value">{totals.totalSeedTypes}</div>
        </div>

        <div className="yield-card">
          <div className="yield-card-label">Pack Types</div>
          <div className="yield-card-value">{totals.totalPackTypes}</div>
        </div>

        <div className="yield-card">
          <div className="yield-card-label">Compost Types</div>
          <div className="yield-card-value">{totals.totalCompostTypes}</div>
        </div>

        <div className="yield-card">
          <div className="yield-card-label">Tokens</div>
          <div className="yield-card-value">{totals.totalTokenTypes}</div>
        </div>
      </div>

      <div className="yield-highlights">
        <div className="yield-highlight-card">
          <h3>Top Seed Yield</h3>
          {totals.highestYieldSeed ? (
            <>
              <div className="yield-highlight-title">
                {totals.highestYieldSeed.seed_name}
              </div>
              <div className="yield-highlight-stat">
                {totals.highestYieldSeed.base_yield_display}{' '}
                {totals.highestYieldSeed.token_symbol_code} per harvest
              </div>
              <div className="yield-highlight-sub">
                Growth: {totals.highestYieldSeed.growth_duration_display} · Water:{' '}
                {totals.highestYieldSeed.water_ticks} ticks
              </div>
            </>
          ) : (
            <div className="yield-highlight-sub">No seed data found.</div>
          )}
        </div>

        <div className="yield-highlight-card">
          <h3>Best Pack Output</h3>
          {totals.bestPack ? (
            <>
              <div className="yield-highlight-title">{totals.bestPack.label}</div>
              <div className="yield-highlight-stat">
                {totals.bestPack.total_yield_display}{' '}
                {totals.bestPack.token_symbol_code}
              </div>
              <div className="yield-highlight-sub">
                {totals.bestPack.count} × {totals.bestPack.seed_name}
              </div>
            </>
          ) : (
            <div className="yield-highlight-sub">No pack data found.</div>
          )}
        </div>
      </div>

      <div className="yield-section">
        <h3>🌱 Seed Yield Reference</h3>
        <div className="yield-table-wrap">
          <table className="yield-table">
            <thead>
              <tr>
                <th>Seed</th>
                <th>Per Harvest</th>
                <th>Growth</th>
                <th>Water Ticks</th>
                <th>Token</th>
              </tr>
            </thead>
            <tbody>
              {data.seeds.map((seed) => (
                <tr key={seed.template_id}>
                  <td>
                    <div className="yield-main-text">{seed.seed_name}</div>
                    <div className="yield-sub-text">Template #{seed.template_id}</div>
                  </td>
                  <td>
                    {seed.base_yield_display} {seed.token_symbol_code}
                  </td>
                  <td>{seed.growth_duration_display}</td>
                  <td>{seed.water_ticks}</td>
                  <td>{seed.token_symbol_code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="yield-section">
        <h3>📦 Pack Yield Reference</h3>
        <div className="yield-table-wrap">
          <table className="yield-table">
            <thead>
              <tr>
                <th>Pack</th>
                <th>Seed Type</th>
                <th>Seed Count</th>
                <th>Per Seed</th>
                <th>Total Yield</th>
              </tr>
            </thead>
            <tbody>
              {enrichedPacks.map((pack) => (
                <tr key={pack.pack_template_id}>
                  <td>
                    <div className="yield-main-text">{pack.label}</div>
                    <div className="yield-sub-text">
                      Template #{pack.pack_template_id}
                    </div>
                  </td>
                  <td>{pack.seed_name}</td>
                  <td>{pack.count}</td>
                  <td>
                    {pack.per_seed_display} {pack.token_symbol_code}
                  </td>
                  <td className="yield-positive">
                    {pack.total_yield_display} {pack.token_symbol_code}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="yield-section">
        <h3>🪱 Compost Reference</h3>
        <div className="yield-table-wrap">
          <table className="yield-table">
            <thead>
              <tr>
                <th>Template ID</th>
                <th>Compost Yield</th>
                <th>Rarity</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {data.compost.map((item) => (
                <tr key={item.template_id}>
                  <td>{item.template_id}</td>
                  <td>{formatNumber(item.compost_yield)}</td>
                  <td>{item.rarity}</td>
                  <td>{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="yield-section">
        <h3>💰 Token Reference</h3>
        <div className="yield-table-wrap">
          <table className="yield-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Symbol</th>
                <th>Contract</th>
                <th>Decimals</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {data.tokens.map((token) => (
                <tr key={token.id}>
                  <td>{token.id}</td>
                  <td>{token.symbol_code}</td>
                  <td>{token.token_contract}</td>
                  <td>{token.decimals}</td>
                  <td>{token.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
