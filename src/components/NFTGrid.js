// src/components/NFTGrid.js
import React from 'react';
import PropTypes from 'prop-types';

const NFTGrid = ({ burnableNFTs = [], selectedNFT, onNFTClick, onAssignNFT, nftSlots = [], loading = false }) => {
  const isNFTAssigned = (assetId) => nftSlots.some((slot) => slot?.asset_id === assetId);

  const handleAssign = (nft) => {
    if (isNFTAssigned(nft.asset_id)) {
      alert('This NFT is already assigned to a slot.');
      return;
    }
    const emptySlotIndex = nftSlots.findIndex((slot) => slot === null);
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
        <p className="no-nfts-message">
          You don't have any approved NFTs available for burning. Please acquire an approved NFT to proceed.
        </p>
      ) : (
        burnableNFTs.map((nft) => (
          <div
            key={nft.asset_id}
            className={`nft-card ${selectedNFT?.asset_id === nft.asset_id ? 'selected' : ''}`}
            onClick={() => onNFTClick(nft)}
          >
            <img
              src={nft.img ? `https://ipfs.io/ipfs/${nft.img}` : 'default-placeholder.png'}
              alt={nft.template_name || 'Unnamed NFT'}
              className="nft-image"
            />
            <div className="nft-info">
              <p className="nft-name">{nft.template_name || 'Unnamed NFT'}</p>
              <p className="nft-reward">Reward: {nft.cinder_reward || 'N/A'}</p>
              <p className="trash-fee">Fee: {nft.trash_fee || 'N/A'}</p>
              <p className="nft-asset-id">Asset ID: {nft.asset_id}</p>
              <button
                className={`assign-button ${isNFTAssigned(nft.asset_id) ? 'disabled' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAssign(nft);
                }}
                disabled={isNFTAssigned(nft.asset_id)}
              >
                {isNFTAssigned(nft.asset_id) ? 'Already Assigned' : 'Assign to Slot'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

NFTGrid.propTypes = {
  burnableNFTs: PropTypes.array,
  selectedNFT: PropTypes.object,
  onNFTClick: PropTypes.func.isRequired,
  onAssignNFT: PropTypes.func.isRequired,
  nftSlots: PropTypes.array,
  loading: PropTypes.bool,
};

export default NFTGrid;
