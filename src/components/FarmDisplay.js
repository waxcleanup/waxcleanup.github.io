// src/components/FarmDisplay.js
import React from 'react';
import FarmCard from './FarmCard';
import './FarmDisplay.css';

/**
 * FarmDisplay renders two sections:
 * - Your Farms: shows metadata for owned farms (staked & unstaked) and allows farm-level staking
 * - Available Farms: shows all farms and allows battery-level staking
 */
export default function FarmDisplay({
  farmInfo,
  allFarms,
  pendingAction,
  onStakeFarm,
  onUnstakeFarm,
  onStakeCell,
  onUnstakeCell,
  onPlantSlot,    // 🔹 NEW: optional planting handler from Farming.js
}) {
  // Build a lookup of global farm metadata by asset_id
  const globalMap = (allFarms || []).reduce((map, f) => {
    // use string keys to avoid type mismatches
    map[String(f.asset_id)] = f;
    return map;
  }, {});

  // Merge user-owned farms (staked + unstaked) with their global metadata
  const ownedFarms = [
    ...(farmInfo?.staked || []).map(f => ({
      ...globalMap[f.asset_id],
      asset_id: f.asset_id,
      template_id: f.template_id,
      staked: true,
      cell_asset_id: f.cell_asset_id || null,
    })),
    ...(farmInfo?.unstaked || []).map(f => ({
      ...globalMap[f.asset_id],
      asset_id: f.asset_id,
      template_id: f.template_id,
      staked: false,
      cell_asset_id: null,
    })),
  ];

  return (
    <div className="farm-display">
      {/* Your Farms: only farm-level staking */}
      <section className="your-farms">
        <h2>Your Farms</h2>
        {farmInfo == null ? (
          <p>Loading your farms…</p>
        ) : ownedFarms.length > 0 ? (
          ownedFarms.map(farm => (
            <FarmCard
              key={farm.asset_id}
              farm={farm}
              cellList={farmInfo.cells || []}
              pendingAction={pendingAction}
              onStakeFarm={() => onStakeFarm(farm)}
              onUnstakeFarm={() => onUnstakeFarm(farm)}
              allowFarmStake={true}
              allowCellStake={false}
              onPlantSlot={onPlantSlot}   // 🔹 pass through to FarmCard
            />
          ))
        ) : (
          <p>No farms owned.</p>
        )}
      </section>

      {/* Available Farms: only battery-level staking */}
      <section className="global-farms">
        <h2>Available Farms</h2>
        {allFarms?.length > 0 ? (
          allFarms.map(farm => (
            <FarmCard
              key={farm.asset_id}
              farm={farm}
              cellList={farmInfo?.cells || []}
              pendingAction={pendingAction}
              onStakeCell={() => onStakeCell(farm.asset_id, farm.template_id)}
              onUnstakeCell={() => onUnstakeCell(farm.asset_id)}
              allowFarmStake={false}
              allowCellStake={true}
              onPlantSlot={onPlantSlot}   // 🔹 also available here if needed
            />
          ))
        ) : (
          <p>Loading farms…</p>
        )}
      </section>
    </div>
  );
}

