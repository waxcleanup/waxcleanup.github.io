// src/components/UnequippedTools.js
import React, { useEffect, useState } from 'react';
import { fetchUnequippedStakedTools } from '../services/tools';
import { equipTool } from '../services/toolEquipActions';
import { unstakeTool } from '../services/toolActions';   // ✅ use removetool
import './UnequippedTools.css';

export default function UnequippedTools({ actor, onChanged }) {
  const [tools, setTools] = useState([]);
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busyAsset, setBusyAsset] = useState(null);

  async function load() {
    if (!actor) return;

    setLoading(true);
    setError(null);

    try {
      const payload = await fetchUnequippedStakedTools(actor);

      const list = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
        ? payload
        : [];

      setTools(list);
      setRaw(payload);
    } catch (e) {
      console.error('UnequippedTools load error:', e);
      setError(e?.message || String(e));
      setTools([]);
      setRaw(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;

      if (actor) await load();
      else {
        setTools([]);
        setRaw(null);
        setError(null);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor]);

  const notifyChanged = () => {
    if (typeof onChanged === 'function') onChanged();
  };

  const handleEquip = async (assetId) => {
    if (!actor || !assetId) return;

    try {
      setBusyAsset(String(assetId));
      setError(null);

      // ✅ correct signature
      await equipTool({ actor, toolAssetId: String(assetId) });

      await load();
      notifyChanged();
    } catch (e) {
      console.error('equipTool error:', e);
      setError(e?.message || String(e));
    } finally {
      setBusyAsset(null);
    }
  };

  const handleUnstake = async (assetId) => {
    if (!actor || !assetId) return;

    try {
      setBusyAsset(String(assetId));
      setError(null);

      // ✅ correct action for unstaking
      await unstakeTool(actor, String(assetId));

      await load();
      notifyChanged();
    } catch (e) {
      console.error('unstakeTool error:', e);
      setError(e?.message || String(e));
    } finally {
      setBusyAsset(null);
    }
  };

  return (
    <div className="unequipped-tools-wrap">
      <div className="unequipped-tools-header">
        <div className="unequipped-tools-title">Staked Tools (Unequipped)</div>
        <div className="unequipped-tools-sub">
          actor: <span className="mono">{String(actor || '—')}</span>
        </div>
      </div>

      {loading && <div className="unequipped-tools-note">Loading…</div>}
      {error && <div className="unequipped-tools-error">Error: {error}</div>}

      {!loading && !error && tools.length === 0 && (
        <div className="unequipped-tools-note">No unequipped staked tools found.</div>
      )}

      <div className="unequipped-tools-grid">
        {tools.map((t) => {
          const assetId = String(t.asset_id);
          const isBusy = busyAsset === assetId;

          return (
            <div key={assetId} className="unequipped-tool-card">
              <img className="unequipped-tool-img" src={t.img} alt={t.name || 'Tool'} />
              <div className="unequipped-tool-name">{t.name || 'Unnamed Tool'}</div>
              <div className="unequipped-tool-meta">
                <span>{t.rarity || 'Unknown'}</span>
                <span className="mono">#{assetId}</span>
              </div>

              <div className="unequipped-tool-actions">
                <button
                  className="unequipped-tool-btn"
                  disabled={isBusy}
                  onClick={() => handleEquip(assetId)}
                >
                  {isBusy ? 'Working…' : 'Equip'}
                </button>

                <button
                  className="unequipped-tool-btn secondary"
                  disabled={isBusy}
                  onClick={() => handleUnstake(assetId)}
                >
                  {isBusy ? 'Working…' : 'Unstake'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <details className="unequipped-tools-debug">
        <summary>Debug payload</summary>
        <pre>{JSON.stringify(raw, null, 2)}</pre>
      </details>
    </div>
  );
}

