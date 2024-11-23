import React from 'react';

const NFTGrid = ({ burnableNFTs, proposals, selectedNFT, onNFTClick, onAssignNFT, nftSlots }) => {
  // Match NFT with proposals to get additional information
  const getProposalDetails = (templateId) => {
    return proposals.find((proposal) => proposal.template_id === templateId) || {};
  };

  // Check if the NFT is already assigned to a slot
  const isNFTAssigned = (assetId) => nftSlots.some((slot) => slot?.asset_id === assetId);

  // Handle Assign to Slot logic
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
      {burnableNFTs.map((nft) => {
        const { trash_fee, cinder_reward } = getProposalDetails(nft.template_id);

        return (
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
              <p className="trash-fee">Fee: {trash_fee || 'N/A'}</p>
              <p className="nft-reward">Reward: {cinder_reward || 'N/A'}</p>
              
              {/* Assign Button */}
              <button
                className="assign-button"
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
        );
      })}
    </div>
  );
};

export default NFTGrid;
