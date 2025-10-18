// src/components/FarmCard.js
import React from 'react';
import './FarmCard.css';

/**
 * FarmCard displays a single farm with optional farm-level and battery-level staking/un-staking controls.
 */
export default function FarmCard({
  farm,
  cellList = [],
  pendingAction,
  onStakeFarm,
  onUnstakeFarm,
  onStakeCell,
  onUnstakeCell,
  allowFarmStake = false,
  allowCellStake = false
}) {
  const {
    asset_id,
    template_id,
    owner,
    created_at,
    farm_energy,
    reward_pool,
    image,
    name,
    cell_asset_id,
    staked
  } = farm;

  const formattedDate = new Date(created_at).toLocaleDateString();
  const stakeStatus = staked ? 'Staked' : 'Unstaked';
  const isPending = key => pendingAction === key;

  return (
    <div className="farm-card compact">
      {/* Image */}
      <img
        src={image}
        alt={name || 'Farm'}
        className="farm-card-image"
      />

      {/* Info */}
      <div className="farm-info">
        <h3 className="farm-title">🌾 {name || `Farm #${asset_id.slice(-5)}`}</h3>
        <p><strong>Status:</strong> {stakeStatus}</p>
        <p><strong>Created:</strong> {formattedDate}</p>
        <p><strong>Energy:</strong> ⚡ {farm_energy}</p>
        <p><strong>Reward Pool:</strong> {reward_pool} CINDER</p>
      </div>

      {/* Actions */}
      <div className="farm-actions">
        {/* Farm-level stake/un-stake */}
        {allowFarmStake && (
          staked
            ? <button
                onClick={() => onUnstakeFarm(farm)}
                disabled={isPending(`farm-${asset_id}`)}
              >Unstake Farm</button>
            : <button
                onClick={() => onStakeFarm(farm)}
                disabled={isPending(`farm-${asset_id}`)}
              >Stake Farm</button>
        )}

        {/* Battery stake/un-stake (only on staked farms) */}
        {allowCellStake && staked && (
          cell_asset_id
            ? <button
                className="unstake-btn"
                onClick={() => onUnstakeCell(asset_id)}
                disabled={isPending(`cell-un-${asset_id}`)}
              >Unstake Battery</button>
            : <button
                className="stake-btn"
                onClick={() => onStakeCell(asset_id)}
                disabled={isPending(`cell-${asset_id}`)}
              >Stake Battery</button>
        )}
      </div>
    </div>
  );
}
