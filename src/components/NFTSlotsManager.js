import React from 'react';

const NFTSlotsManager = ({ slots, nftSlots, onSlotClick, onAssignNFTToSlot, onBurn }) => {
  return (
    <div className="nft-slots-container">
      <h3>Selected NFTs to Burn</h3>
      <div className="nft-slots">
        {slots.map((slot, index) => (
          <div
            key={index}
            className={`nft-slot ${slot ? '' : 'empty-slot'}`}
            onClick={() => onSlotClick(index)}
          >
            {nftSlots[index] ? (
              <div className="nft-card">
                <img
                  src={`https://ipfs.io/ipfs/${nftSlots[index].img}`}
                  alt={nftSlots[index].name || 'Unnamed NFT'}
                  className="nft-image"
                />
                <p>{nftSlots[index].name || 'Unnamed NFT'}</p>
                <p className="asset-id">Asset ID: {nftSlots[index].asset_id}</p>
                <button
                  className="burn-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBurn(nftSlots[index], slots[index]);
                  }}
                >
                  Burn NFT
                </button>
              </div>
            ) : (
              <p>Click to assign an NFT</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NFTSlotsManager;
