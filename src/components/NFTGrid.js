// src/components/NFTGrid.js
import React from 'react';

const NFTGrid = ({ burnableNFTs, selectedNFT, onNFTClick, onAssignNFT, nftSlots }) => {
  // Check if the NFT is already assigned to a slot
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
      {burnableNFTs.map((nft) => (
        <div
          key={nft.asset_id}
          className={`nft-card ${selectedNFT?.asset_id === nft.asset_id ? 'selected' : ''}`}
          onClick={() => onNFTClick(nft)}
        >
          {/* Display NFT Image */}
          <img
            src={nft.img ? `https://ipfs.io/ipfs/${nft.img}` : 'default-placeholder.png'}
            alt={nft.template_name || 'Unnamed NFT'}
            className="nft-image"
          />

          {/* NFT Information */}
          <div className="nft-info">
            <p className="nft-name">{nft.template_name || 'Unnamed NFT'}</p>
            <p className="nft-reward">Reward: {nft.cinder_reward || 'N/A'}</p>
            <p className="trash-fee">Fee: {nft.trash_fee || 'N/A'}</p>
            <p className="nft-asset-id">Asset ID: {nft.asset_id}</p>

            {/* Enhanced Assign Button */}
            <button
              className={`assign-button ${isNFTAssigned(nft.asset_id) ? 'disabled' : ''}`}
              onClick={(e) => {
                e.stopPropagation(); // Prevent the click event from selecting the card
                handleAssign(nft);
              }}
              disabled={isNFTAssigned(nft.asset_id)} // Disable button if already assigned
            >
              {isNFTAssigned(nft.asset_id) ? 'Already Assigned' : 'Assign to Slot'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NFTGrid;
