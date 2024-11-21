import React from 'react';
import './BurnRoom.css';

const NFTSlots = ({ 
  nftSlots = [null, null, null], 
  slots, 
  onBurn 
}) => {
  return (
    <div className="nft-slots">
      {nftSlots.map((nft, index) => (
        <div key={index} className="nft-slot">
          {nft ? (
            <>
              {/* NFT Details */}
              <img
                src={`https://ipfs.io/ipfs/${nft.img}`}
                alt={nft.template_name || 'Unnamed NFT'}
                className="nft-image"
              />
              <p>{nft.template_name || 'Unnamed NFT'}</p>
              <p className="asset-id">Asset ID: {nft.asset_id}</p>
              
              {/* Burn Button or Warning */}
              {slots[index] ? (
                <BurnButton 
                  nft={nft} 
                  incinerator={slots[index]} 
                  onBurn={onBurn} 
                />
              ) : (
                <p className="warning-text">Assign an incinerator to burn</p>
              )}
            </>
          ) : (
            <p>Empty Slot</p>
          )}
        </div>
      ))}
    </div>
  );
};

const BurnButton = ({ nft, incinerator, onBurn }) => {
  const handleBurnClick = () => {
    if (!incinerator) {
      alert('Please assign an incinerator to this slot before burning.');
      return;
    }
    onBurn(nft, incinerator);
  };

  return (
    <button 
      className="burn-button" 
      onClick={handleBurnClick}
    >
      Burn NFT
    </button>
  );
};

export default NFTSlots;
