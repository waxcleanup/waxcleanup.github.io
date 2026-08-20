// src/components/NFTGrid.js
import React from 'react';
import PropTypes from 'prop-types';

const resolveIpfsUrl = (val) => {
  if (!val) return 'default-placeholder.png';
  if (typeof val === 'string') {
    if (val.includes('/ipfs/')) return `https://maestrobeatz.servegame.com/ipfs/${val.split('/ipfs/')[1]}`;
    if (val.startsWith('http://') || val.startsWith('https://')) return val;
    if (val.startsWith('ipfs://')) return `https://maestrobeatz.servegame.com/ipfs/${val.replace('ipfs://', '')}`;
  }
  return `https://maestrobeatz.servegame.com/ipfs/${val}`;
};

const NFTGrid = ({
  burnableNFTs = [],
  selectedNFT,
  onNFTClick,

  onAssignNFT,
  onRemoveNFT,      // ✅ NEW: remove from deck
  onBurnNFT,        // ✅ expects (slotIndex) => burns from deck

  nftSlots = [],
  burnStates = [],

  loading = false,
}) => {
  const isNFTAssigned = (assetId) =>
    (nftSlots || []).some((slot) => String(slot?.asset_id) === String(assetId));

  const getAssignedIndex = (assetId) =>
    (nftSlots || []).findIndex((slot) => String(slot?.asset_id) === String(assetId));

  const handleAssign = (nft) => {
    if (isNFTAssigned(nft.asset_id)) {
      alert('This NFT is already assigned to a slot.');
      return;
    }
    const emptySlotIndex = (nftSlots || []).findIndex((slot) => slot === null);
    if (emptySlotIndex !== -1) {
      onAssignNFT(nft, emptySlotIndex);
    } else {
      alert('All NFT slots are full.');
    }
  };

  return (
    <div className="nft-grid">
      {loading ? (
        <p className="loading-message">🔄 Fetching burnable NFTs...</p>
      ) : burnableNFTs.length === 0 ? (
        <p className="no-nfts-message">You don't have any approved NFTs available for burning.</p>
      ) : (
        burnableNFTs.map((nft) => {
          const assigned = isNFTAssigned(nft.asset_id);
          const assignedIndex = assigned ? getAssignedIndex(nft.asset_id) : -1;

          // ✅ IMPORTANT: burn is tied to the SAME slot index
          const burnState = assignedIndex >= 0 ? burnStates?.[assignedIndex] : null;
          const canBurn = Boolean(assigned && burnState?.canBurn);
          const isBurning = Boolean(burnState?.isBurning);

          return (
            <div
              key={nft.asset_id}
              className={`nft-card ${selectedNFT?.asset_id === nft.asset_id ? 'selected' : ''}`}
              onClick={() => onNFTClick(nft)}
            >
              <img
                src={resolveIpfsUrl(nft.img)}
                alt={nft.template_name || nft.name || 'Unnamed NFT'}
                className="nft-image"
                loading="lazy"
              />

              <div className="nft-info">
                <p className="nft-name">{nft.template_name || nft.name || 'Unnamed NFT'}</p>

                <div className="nft-meta">
                  <span className="mint">Mint #{nft.template_mint ?? '—'}</span>
                  <span className={`rule-badge ${nft.rule_type}`}>
                    {nft.rule_type === 'schema' ? 'Schema Rule' : 'Template Rule'}
                  </span>
                </div>

                <div className="nft-economics">
                  <p>
                    <span className="label">Reward</span>
                    <span className="value">{nft.cinder_reward}</span>
                  </p>
                  <p>
                    <span className="label">Fee</span>
                    <span className="value">{nft.trash_fee}</span>
                  </p>
                </div>

                {nft.cap_total != null && nft.cap_remaining != null && (
                  <div className="nft-cap">
                    Cap: <strong>{nft.cap_remaining}</strong> / {nft.cap_total}
                  </div>
                )}

                <p className="nft-asset-id">Asset ID: {nft.asset_id}</p>

                {!assigned ? (
                  <button
                    className="assign-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAssign(nft);
                    }}
                  >
                    Assign to Slot
                  </button>
                ) : (
                  <>
                    <button
                      className={`burn-button ${canBurn ? '' : 'disabled'}`}
                      disabled={!canBurn}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!onBurnNFT) return;

                        if (assignedIndex < 0) return;

                        // ✅ burn via existing deck flow
                        onBurnNFT(assignedIndex);
                      }}
                      title={burnState?.label || 'Burn unavailable'}
                    >
                      {isBurning ? 'Burning…' : burnState?.label || 'Burn unavailable'}
                    </button>

                    {/* ✅ Remove from deck */}
                    <button
                      className="remove-nft-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!onRemoveNFT) return;
                        if (assignedIndex < 0) return;
                        onRemoveNFT(assignedIndex);
                      }}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

NFTGrid.propTypes = {
  burnableNFTs: PropTypes.array,
  selectedNFT: PropTypes.object,
  onNFTClick: PropTypes.func.isRequired,

  onAssignNFT: PropTypes.func.isRequired,
  onRemoveNFT: PropTypes.func, // ✅ NEW
  onBurnNFT: PropTypes.func,   // ✅ expects (slotIndex)

  nftSlots: PropTypes.array,
  burnStates: PropTypes.array,

  loading: PropTypes.bool,
};

export default NFTGrid;

