// src/components/StakePlotModal.js
import React, { useMemo, useState, useEffect } from 'react';
import './StakePlotModal.css';

export default function StakePlotModal({
  open,
  plotAsset,
  farms = [],          // ✅ global farms now
  onConfirm,
  onClose,
}) {
  const safeFarms = useMemo(() => (farms || []).filter(Boolean), [farms]);
  const [selectedFarmId, setSelectedFarmId] = useState('');

  useEffect(() => {
    if (!open) return;
    const first = safeFarms?.[0]?.asset_id ? String(safeFarms[0].asset_id) : '';
    setSelectedFarmId(first);
  }, [open, safeFarms]);

  if (!open) return null;

  const canConfirm = Boolean(selectedFarmId && plotAsset?.asset_id);

  return (
    <div className="stakeplot-backdrop" onClick={onClose}>
      <div className="stakeplot-modal" onClick={(e) => e.stopPropagation()}>
        <div className="stakeplot-header">
          <h3>Stake Plot</h3>
          <button className="stakeplot-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="stakeplot-body">
          <p className="stakeplot-sub">Select a farm to stake this plot into.</p>

          {!safeFarms.length ? (
            <div className="stakeplot-empty">
              <p>No farms found.</p>
            </div>
          ) : (
            <>
              <label className="stakeplot-label">Farm</label>
              <select
                className="stakeplot-select"
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
              >
                {safeFarms.map((f) => {
                  const id = String(f.asset_id);
                  const label = f.name
                    ? `${f.name} (owner: ${f.owner})`
                    : `Farm ${id} (owner: ${f.owner})`;

                  return (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </>
          )}
        </div>

        <div className="stakeplot-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!canConfirm || safeFarms.length === 0}
            onClick={() => onConfirm && onConfirm(selectedFarmId)}
          >
            Stake
          </button>
        </div>
      </div>
    </div>
  );
}

