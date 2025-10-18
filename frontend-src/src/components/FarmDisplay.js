// src/components/FarmDisplay.js
import React from 'react';
import FarmCard from './FarmCard';
import './Farming.css';

function FarmDisplay({
  farmInfo,
  farmError,
  farmsAsObjects,
  allFarms,
  pendingAction,
  onStakeFarm,
  onUnstakeFarm,
  onStakeCell,
  onUnstakeCell
}) {
  return (
    <>
      <h2 className="farming-header">🏡 Farm Ownership</h2>
      {farmError ? (
        <p className="farming-status">{farmError}</p>
      ) : farmInfo ? (
        farmInfo.count?.staked + farmInfo.count.unstaked > 0 ? (
          <div className="farm-status-card">
            <p><strong>Template ID:</strong> {farmInfo.template_id}</p>
            <p><strong>Farms Owned:</strong> {farmInfo.count.staked + farmInfo.count.unstaked}</p>
            <p><strong>Name:</strong> {farmInfo.name}</p>
            {farmInfo.ipfs && <img src={farmInfo.ipfs} alt="Farm" className="farm-nft-image" />}

            {farmInfo.staked.length > 0 && (
              <>
                <p><strong>Staked:</strong></p>
                <ul>
                  {farmInfo.staked.map(f => (
                    <li key={f.asset_id}>
                      {f.asset_id}
                      <button
                        onClick={() => onUnstakeFarm(f)}
                        disabled={pendingAction === f.asset_id}
                      >
                        Unstake Farm
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {farmInfo.unstaked.length > 0 && (
              <>
                <p><strong>Unstaked:</strong></p>
                <ul>
                  {farmsAsObjects.map(f => (
                    <li key={f.asset_id}>
                      {f.asset_id}
                      <button
                        onClick={() => onStakeFarm(f)}
                        disabled={pendingAction === f.asset_id}
                      >
                        Stake Farm
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {farmInfo.cells?.length > 0 && farmInfo.staked.length > 0 && (
              <>
                <p><strong>Available Farm Cells:</strong></p>
                <ul>
                  {farmInfo.cells.map(cell => (
                    <li key={cell.asset_id}>
                      Cell {cell.asset_id}
                      <button
                        onClick={() => onStakeCell(
                          farmInfo.staked[0].asset_id,
                          cell.asset_id,
                          cell.template_id
                        )}
                        disabled={pendingAction === cell.asset_id}
                      >
                        Stake Cell
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <p className="farming-status">You do not currently own a farm NFT.</p>
        )
      ) : (
        <p className="farming-status">Checking for farm ownership...</p>
      )}

      <h2 className="farming-header">📡 Available Farms (Global)</h2>
      {pendingAction && (
        <div className="farm-loading">
          <div className="spinner" />
          ⏳ Updating global farms...
        </div>
      )}
      <div className="farm-card-grid compact-global-farms">
        {allFarms.map(f => (
          <FarmCard
            key={f.asset_id}
            farm={f}
            onStakeCell={() => {
              if (!farmInfo?.cells?.length) {
                alert("No available farm cells to stake.");
                return;
              }
              const cell = farmInfo.cells[0];
              onStakeCell(f.asset_id, cell.asset_id, cell.template_id);
            }}
          />
        ))}
      </div>
    </>
  );
}

export default FarmDisplay;
