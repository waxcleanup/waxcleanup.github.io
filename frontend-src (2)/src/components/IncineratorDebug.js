// src/components/IncineratorDebug.js
import React, { useEffect, useState } from 'react';
import { fetchStakedIncinerators, fetchUnstakedIncinerators } from '../services/incinerators';
import { fetchBurnableNFTs } from '../services/fetchBurnableNFTs';

const IncineratorDebug = ({ accountName }) => {
  const [staked, setStaked] = useState([]);
  const [unstaked, setUnstaked] = useState([]);
  const [burnables, setBurnables] = useState([]);
  const [error, setError] = useState(null);

  const loadData = async () => {
    if (!accountName) return;

    try {
      const [s, u, b] = await Promise.all([
        fetchStakedIncinerators(accountName),
        fetchUnstakedIncinerators(accountName),
        fetchBurnableNFTs(accountName)
      ]);
      setStaked(s);
      setUnstaked(u);
      setBurnables(b);
      setError(null);
    } catch (err) {
      console.error('[DEBUG ERROR]', err);
      setError(err.message || 'Unknown error');
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [accountName]);

  return (
    <div style={{ padding: 20 }}>
      <h2>🧪 Incinerator Debug Page</h2>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <section style={{ marginTop: 20 }}>
        <h3>🔥 Staked Incinerators</h3>
        <pre style={{ background: '#111', color: '#0f0', padding: '10px' }}>
          {JSON.stringify(staked, null, 2)}
        </pre>
      </section>

      <section style={{ marginTop: 20 }}>
        <h3>🪵 Unstaked Incinerators</h3>
        <pre style={{ background: '#111', color: '#0cf', padding: '10px' }}>
          {JSON.stringify(unstaked, null, 2)}
        </pre>
      </section>

      <section style={{ marginTop: 20 }}>
        <h3>🧾 Burnable NFTs</h3>
        <pre style={{ background: '#111', color: '#ffa500', padding: '10px' }}>
          {JSON.stringify(burnables, null, 2)}
        </pre>
      </section>
    </div>
  );
};

export default IncineratorDebug;
