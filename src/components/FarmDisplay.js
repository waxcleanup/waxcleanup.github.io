// src/components/FarmDisplay.js
import React, { useMemo, useState } from 'react';
import FarmCard from './FarmCard';
import FarmPlotsGrid from './FarmPlotsGrid';
import MyPlotsPanel from './MyPlotsPanel';
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
  onChanged,
  refreshNonce,
  wallet,
}) {
  const walletAccount = (() => {
    if (!wallet) return '';
    if (typeof wallet === 'string') return wallet;
    const rendered = typeof wallet.toString === 'function' ? wallet.toString() : '';
    return rendered && rendered !== '[object Object]' ? rendered : '';
  })();

  const globalMap = useMemo(() => (
    (allFarms || []).reduce((map, farm) => {
      map[String(farm.asset_id)] = farm;
      return map;
    }, {})
  ), [allFarms]);

  const ownedFarms = useMemo(() => {
    const fallbackName = farmInfo?.name || null;
    const fallbackImage = farmInfo?.ipfs || null;
    const mergeFarm = (farm, staked) => {
      const globalFarm = globalMap[String(farm.asset_id)] || {};
      return {
        ...globalFarm,
        ...farm,
        asset_id: String(farm.asset_id),
        staked,
        cell_asset_id: staked ? (farm.cell_asset_id || null) : null,
        name: farm.name ?? globalFarm.name ?? fallbackName,
        image: farm.image ?? globalFarm.image ?? fallbackImage,
      };
    };

    return [
      ...(farmInfo?.staked || []).map((farm) => mergeFarm(farm, true)),
      ...(farmInfo?.unstaked || []).map((farm) => mergeFarm(farm, false)),
    ];
  }, [farmInfo, globalMap]);

  const sharedFarmBase = Array.isArray(allFarms) ? allFarms[0] : null;
  const ownedSharedFarm = sharedFarmBase
    ? ownedFarms.find((farm) => String(farm.asset_id) === String(sharedFarmBase.asset_id))
    : ownedFarms[0];
  const sharedFarm = ownedSharedFarm || sharedFarmBase;
  const managesSharedFarm = Boolean(ownedSharedFarm);
  const [activeView, setActiveView] = useState('my-plots');

  return (
    <div className="farm-display">
      <nav className="farm-view-tabs" aria-label="Farming views">
        <button type="button" className={activeView === 'my-plots' ? 'is-active' : ''} onClick={() => setActiveView('my-plots')}>
          🌱 My Plots
        </button>
        <button type="button" className={activeView === 'community' ? 'is-active' : ''} onClick={() => setActiveView('community')}>
          🏘️ Community Plots
        </button>
      </nav>

      {activeView === 'my-plots' && (
        <div className="my-plots-view">
          <section className="shared-farm-overview" aria-labelledby="global-farm-title">
            <div className="farm-section-heading">
              <div>
                <span className="farm-section-kicker">Shared world</span>
                <h2 id="global-farm-title">Global Farm</h2>
                <p>One community farm powers every farmer's individually owned plots.</p>
              </div>
              <span className="shared-farm-badge">Global</span>
            </div>

            {!Array.isArray(allFarms) ? (
              <p>Loading the Global Farm…</p>
            ) : sharedFarm ? (
              <FarmCard
                farm={sharedFarm}
                cellList={farmInfo?.cells || []}
                pendingAction={pendingAction}
                onStakeFarm={() => onStakeFarm?.(sharedFarm)}
                onUnstakeFarm={() => onUnstakeFarm?.(sharedFarm)}
                onStakeCell={() => onStakeCell?.(sharedFarm.asset_id)}
                onUnstakeCell={() => onUnstakeCell?.(sharedFarm.asset_id)}
                onRechargeFarm={() => onRechargeFarm?.(sharedFarm)}
                allowFarmStake={managesSharedFarm}
                allowCellStake={managesSharedFarm}
                onChanged={onChanged}
                refreshNonce={refreshNonce}
                showPlots={false}
                summaryLayout={true}
              />
            ) : (
              <p>The Global Farm is temporarily unavailable.</p>
            )}
          </section>

          <section className="player-plots-section" id="global-farm-section" aria-labelledby="my-plots-title">
            <div className="farm-section-heading">
              <div>
                <span className="farm-section-kicker">Your field</span>
                <h2 id="my-plots-title">My Plots</h2>
                <p>{walletAccount ? `Showing only plots owned by ${walletAccount}.` : 'Connect your wallet to load your plots and farming actions.'}</p>
              </div>
              {walletAccount && <span className="plot-owner-badge">{walletAccount}</span>}
            </div>

            {walletAccount && sharedFarm?.asset_id ? (
              <FarmPlotsGrid farmId={sharedFarm.asset_id} ownerFilter={walletAccount} onChanged={onChanged} refreshNonce={refreshNonce} />
            ) : (
              <div className="farm-empty-state">{walletAccount ? 'Waiting for the Global Farm…' : 'Connect your wallet to tend your plots.'}</div>
            )}
          </section>
        </div>
      )}

      {activeView === 'community' && (
        <section className="farm-community-view" aria-labelledby="community-plots-title">
          <div className="farm-section-heading">
            <div>
              <span className="farm-section-kicker">Farmer directory</span>
              <h2 id="community-plots-title">Community Plots</h2>
              <p>Select a farmer to view their plots. Other farmers' plots are read-only.</p>
            </div>
          </div>
          <MyPlotsPanel refreshNonce={refreshNonce} />
        </section>
      )}
    </div>
  );
}
