// src/components/FarmDisplay.js
import React, { useMemo } from 'react';
import FarmCard from './FarmCard';
import './FarmDisplay.css';

export default function FarmDisplay({
  farmInfo,
  allFarms,
  pendingAction,
  onStakeFarm,
  onUnstakeFarm,
  onStakeCell,
  onUnstakeCell,
  onRechargeFarm,
  onPlantSlot,
  onChanged,
  refreshNonce,
}) {
  const globalMap = useMemo(() => {
    return (allFarms || []).reduce((map, f) => {
      map[String(f.asset_id)] = f;
      return map;
    }, {});
  }, [allFarms]);

  const getGlobal = (assetId) => globalMap[String(assetId)] || {};

  const templateFallbackName = farmInfo?.name || null;
  const templateFallbackImage = farmInfo?.ipfs || null;

  const ownedIds = useMemo(() => {
    const s = new Set();
    (farmInfo?.staked || []).forEach((f) => s.add(String(f.asset_id)));
    (farmInfo?.unstaked || []).forEach((f) => s.add(String(f.asset_id)));
    return s;
  }, [farmInfo]);

  const ownedFarms = useMemo(() => {
    const staked = (farmInfo?.staked || []).map((f) => {
      const g = getGlobal(f.asset_id);
      return {
        ...g,
        asset_id: String(f.asset_id),
        template_id: f.template_id ?? g.template_id,
        owner: f.owner ?? g.owner,
        created_at: f.created_at ?? g.created_at,
        farm_energy: f.farm_energy ?? g.farm_energy,
        reward_pool: f.reward_pool ?? g.reward_pool,
        staked: true,
        cell_asset_id: f.cell_asset_id || null,
        name: f.name ?? g.name ?? templateFallbackName,
        image: f.image ?? g.image ?? templateFallbackImage,
      };
    });

    const unstaked = (farmInfo?.unstaked || []).map((f) => {
      const g = getGlobal(f.asset_id);
      return {
        ...g,
        asset_id: String(f.asset_id),
        template_id: f.template_id ?? g.template_id,
        owner: f.owner ?? g.owner,
        created_at: f.created_at ?? g.created_at,
        farm_energy: f.farm_energy ?? g.farm_energy,
        reward_pool: f.reward_pool ?? g.reward_pool,
        staked: false,
        cell_asset_id: null,
        name: f.name ?? g.name ?? templateFallbackName,
        image: f.image ?? g.image ?? templateFallbackImage,
      };
    });

    return [...staked, ...unstaked];
  }, [farmInfo, globalMap, templateFallbackName, templateFallbackImage]);

  const globalLoaded = Array.isArray(allFarms);
  const globalCount = globalLoaded ? allFarms.length : 0;

  const availableFarms = useMemo(() => {
    if (!Array.isArray(allFarms)) return [];
    return allFarms
      .map((f) => ({
        ...f,
        asset_id: String(f.asset_id),
        staked: false,
        cell_asset_id: null,
      }))
      .filter((f) => !ownedIds.has(String(f.asset_id)));
  }, [allFarms, ownedIds]);

  // ✅ Only show the section if global farms actually exist
  const showGlobalSection = globalLoaded && globalCount > 0;

  return (
    <div className="farm-display">
      <section className="your-farms">
        <h2>Your Farms</h2>

        {farmInfo == null ? (
          <p>Loading your farms…</p>
        ) : ownedFarms.length > 0 ? (
          <div className="farms-grid">
            {ownedFarms.map((farm) => (
              <FarmCard
                key={String(farm.asset_id)}
                farm={farm}
                cellList={farmInfo?.cells || []}
                pendingAction={pendingAction}
                onStakeFarm={() => onStakeFarm && onStakeFarm(farm)}
                onUnstakeFarm={() => onUnstakeFarm && onUnstakeFarm(farm)}
                onStakeCell={() => onStakeCell && onStakeCell(farm.asset_id)}
                onUnstakeCell={() => onUnstakeCell && onUnstakeCell(farm.asset_id)}
                onRechargeFarm={() => onRechargeFarm && onRechargeFarm(farm.asset_id)}
                allowFarmStake={true}
                allowCellStake={true}
                onPlantSlot={onPlantSlot}
                onChanged={onChanged}
                refreshNonce={refreshNonce}
              />
            ))}
          </div>
        ) : (
          <p>No farms owned.</p>
        )}
      </section>

      {showGlobalSection && (
        <section className="global-farms">
          <h2>Global Farms</h2>

          {availableFarms.length > 0 ? (
            <div className="farms-grid">
              {availableFarms.map((farm) => (
                <FarmCard
                  key={String(farm.asset_id)}
                  farm={farm}
                  cellList={farmInfo?.cells || []}
                  pendingAction={pendingAction}
                  allowFarmStake={false}
                  allowCellStake={false}
                  onPlantSlot={onPlantSlot}
                  onChanged={onChanged}
                  refreshNonce={refreshNonce}
                />
              ))}
            </div>
          ) : (
            <p>You already own all currently indexed farms.</p>
          )}
        </section>
      )}
    </div>
  );
}

