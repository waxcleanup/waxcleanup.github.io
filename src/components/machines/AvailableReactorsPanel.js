// src/components/machines/AvailableReactorsPanel.js
import React from 'react';
import { buildIpfsUrl } from './machineUtils';

export default function AvailableReactorsPanel({
  loading,
  reactors,
  busyKey,
  onStake,
  getMachineImage,
  getMachineAssetId,
  getMachineName,
  getTemplateId,
  getMachineRarity,
}) {
  return (
    <section className="machines-panel">
      <div className="machines-panel-top">
        <h3>Available Reactors</h3>
        <span>{reactors.length}</span>
      </div>

      {loading ? (
        <p className="machines-muted">Loading machines...</p>
      ) : reactors.length === 0 ? (
        <p className="machines-muted">No unstaked reactor NFTs found.</p>
      ) : (
        <div className="machines-card-list">
          {reactors.map((reactor, idx) => {
            const image = getMachineImage(reactor);
            const assetId = getMachineAssetId(reactor);
            const imageUrl = buildIpfsUrl(image);

            return (
              <div className="machine-card" key={assetId || idx}>
                <div className="machine-card-main">
                  {image ? (
                    <img
                      className="machine-card-image"
                      src={imageUrl}
                      alt={getMachineName(reactor)}
                      onError={(e) => {
                        console.error('Failed to load machine image:', image, imageUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}

                  <div className="machine-card-info">
                    <h4>{getMachineName(reactor)}</h4>
                    <div className="machine-meta-row">
                      <span>Asset ID: {assetId}</span>
                    </div>
                    <div className="machine-meta-row">
                      <span>Template: {getTemplateId(reactor) ?? 'N/A'}</span>
                      <span>{getMachineRarity(reactor)}</span>
                    </div>
                  </div>
                </div>

                <button
                  className="machine-action-btn"
                  onClick={() => onStake(assetId)}
                  disabled={busyKey === `stake-${assetId}`}
                >
                  {busyKey === `stake-${assetId}` ? 'Staking...' : 'Stake Reactor'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
