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

  return (
    <div className="farm-card compact">
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

        <p>
          <strong>Status:</strong> {statusLabel}
        </p>

        {createdLabel && (
          <p>
            <strong>Created:</strong> {createdLabel}
          </p>
        )}

        <p>
          <strong>Energy:</strong> ⚡ {farm_energy ?? 0}
        </p>

        <p>
          <strong>Reward Pool:</strong> {reward_pool ?? 0} CINDER
        </p>

        {/* Only show battery line if this is your farm card */}
        {allowFarmStake && staked && (
          <p>
            <strong>Battery:</strong> {cell_asset_id ? `🔋 ${cell_asset_id}` : 'None'}
          </p>
        )}
      </div>

      <div className="farm-actions">
        {allowFarmStake &&
          (staked ? (
            <button
              onClick={() => onUnstakeFarm && onUnstakeFarm(farm)}
              disabled={isPending(`farm-${asset_id}`)}
            >
              Unstake Farm
            </button>
          ) : (
            <button
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
              className="unstake-btn"
              onClick={() => onUnstakeCell && onUnstakeCell(asset_id)}
              disabled={isPending(`cell-un-${asset_id}`)}
            >
              Unstake Battery
            </button>
          ) : (
            <button
              className="stake-btn"
              onClick={() => onStakeCell && onStakeCell(asset_id)}
              disabled={isPending(`cell-${asset_id}`)}
            >
              Stake Battery
            </button>
          ))}

        {canRecharge && (
          <button
            className="stake-btn"
            onClick={() => onRechargeFarm && onRechargeFarm(String(asset_id))}
            disabled={isPending(`recharge-${String(asset_id)}`)}
          >
            {isPending(`recharge-${String(asset_id)}`) ? 'Recharging…' : 'Recharge Farm'}
          </button>
        )}
      </div>

      <div className="farm-plots-section">
        <h4 className="farm-plots-title">Plots</h4>

        <FarmPlotsGrid
          farmId={asset_id}
          onChanged={onChanged}
          refreshNonce={refreshNonce}
        />
      </div>
    </div>
  );
}

