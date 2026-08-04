// src/components/FarmCard.js
import React from 'react';
import './FarmCard.css';
import FarmPlotsGrid from './FarmPlotsGrid';

const IPFS_GATEWAY = (
  process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs'
).replace(/\/$/, '');

function resolveIpfsImageSrc(image) {
  if (!image) return '';

  const s = String(image).trim();

  if (/^https?:\/\//i.test(s)) return s;

  if (s.startsWith('ipfs://')) {
    const cid = s.replace('ipfs://', '').replace(/^ipfs\//, '');
    return `${IPFS_GATEWAY}/${cid}`;
  }

  if (s.includes('/ipfs/')) {
    const cid = s.split('/ipfs/')[1];
    return `${IPFS_GATEWAY}/${cid}`;
  }

  return `${IPFS_GATEWAY}/${s}`;
}

function safeDateLabel(created_at) {
  if (!created_at) return null;
  const d = new Date(created_at);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}
function formatAssetLabel(value, symbol) {
  const parts = String(value ?? 0).trim().split(/\s+/).filter(Boolean);
  while (parts.length && parts[parts.length - 1].toUpperCase() === symbol) {
    parts.pop();
  }
  return `${parts.join(' ') || '0'} ${symbol}`;
}


/**
 * FarmCard displays a single farm with optional farm-level and battery-level
 * staking/un-staking controls, plus plots grid.
 */
export default function FarmCard({
  farm,
  cellList = [],
  pendingAction,
  onStakeFarm,
  onUnstakeFarm,
  onStakeCell,
  onUnstakeCell,
  onRechargeFarm,
  allowFarmStake = false,
  allowCellStake = false,
  onChanged,
  refreshNonce,
  showMyPlotsOnly = false, // ✅ NEW: plot filter toggle
}) {
  const {
    asset_id,
    farm_energy,
    reward_pool,
    image,
    name,
    cell_asset_id,
    staked,
    created_at,
  } = farm || {};

  const isPending = (key) => pendingAction === key;

  // ✅ Status label that won't confuse users in "Available Farms"
  const statusLabel = allowFarmStake ? (staked ? 'Staked' : 'Unstaked') : 'Available';

  // ✅ SHOW recharge as long as it's your farm + staked + handler exists
  // (do NOT require battery)
  const canRecharge = Boolean(allowFarmStake && staked && onRechargeFarm);

  const createdLabel = allowFarmStake && staked ? safeDateLabel(created_at) : null;

  const imgSrc = resolveIpfsImageSrc(image);

  const rewardPoolLabel = formatAssetLabel(reward_pool, 'CINDER');
  return (
    <div className={`farm-card compact ${allowFarmStake ? 'owner-farm-card' : ''}`}>
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={name || 'Farm'}
          className="farm-card-image"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = '';
          }}
        />
      ) : (
        <div className="farm-card-image farm-card-image--empty" />
      )}

      <div className="farm-info">
        <h3 className="farm-title">
          🌾 {name || (asset_id ? `Farm #${String(asset_id).slice(-5)}` : 'Farm')}
        </h3>

        <div className="farm-status-row">
          <span className={`farm-status-badge ${staked ? 'is-staked' : ''}`}>
            {statusLabel}
          </span>
          {asset_id && <span className="farm-asset-label">Asset #{asset_id}</span>}
        </div>

        <div className="farm-stat-grid">
          <div className="farm-stat">
            <span>Farm Energy</span>
            <strong>⚡ {farm_energy ?? 0}</strong>
          </div>
          <div className="farm-stat">
            <span>Reward Pool</span>
            <strong>{rewardPoolLabel}</strong>
          </div>
          {createdLabel && (
            <div className="farm-stat">
              <span>Created</span>
              <strong>{createdLabel}</strong>
            </div>
          )}
          {allowFarmStake && staked && (
            <div className="farm-stat">
              <span>Battery</span>
              <strong>{cell_asset_id ? `🔋 ${cell_asset_id}` : 'Not equipped'}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="farm-actions">
        {allowFarmStake &&
          (staked ? (
            <button
              onClick={() => onUnstakeFarm && onUnstakeFarm(farm)}
              className="farm-action-danger"
              disabled={isPending(`farm-${asset_id}`)}
            >
              Unstake Farm
            </button>
          ) : (
            <button
              className="farm-action-primary"
              onClick={() => onStakeFarm && onStakeFarm(farm)}
              disabled={isPending(`farm-${asset_id}`)}
            >
              Stake Farm
            </button>
          ))}

        {allowCellStake &&
          allowFarmStake &&
          staked &&
          (cell_asset_id ? (
            <button
              className="farm-action-danger"
              onClick={() => onUnstakeCell && onUnstakeCell(asset_id)}
              disabled={isPending(`cell-un-${asset_id}`)}
            >
              Unstake Battery
            </button>
          ) : (
            <button
              className="farm-action-secondary"
              onClick={() => onStakeCell && onStakeCell(asset_id)}
              disabled={isPending(`cell-${asset_id}`)}
            >
              Stake Battery
            </button>
          ))}

        {canRecharge && (
          <button
            className="farm-action-primary"
            onClick={() => onRechargeFarm && onRechargeFarm(String(asset_id))}
            disabled={isPending(`recharge-${String(asset_id)}`)}
          >
            {isPending(`recharge-${String(asset_id)}`)
              ? 'Recharging…'
              : 'Recharge Farm'}
          </button>
        )}
      </div>

      <div className="farm-plots-section">
        <h4 className="farm-plots-title">Plots</h4>

        <FarmPlotsGrid
          farmId={asset_id}
          onChanged={onChanged}
          refreshNonce={refreshNonce}
          showMyPlotsOnly={showMyPlotsOnly} // ✅ NEW
        />
      </div>
    </div>
  );
}
