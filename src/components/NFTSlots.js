import React from 'react';
import './BurnRoom.css';

const NFTSlots = ({ nftSlots = [null, null, null], slots, onBurn }) => {
  // Function to resolve IPFS URL
  const resolveIpfsUrl = (ipfsHash) => {
    return ipfsHash ? `https://ipfs.io/ipfs/${ipfsHash}` : 'default-placeholder.png';
  };

  return (
    <div className="nft-slots">
      {nftSlots.map((nft, index) => (
        <div key={index} className="nft-slot">
          {nft ? (
            <>
              <img
                src={resolveIpfsUrl(nft.img)} // Use the IPFS resolver
                alt={nft.template_name || nft.name || 'Unnamed NFT'} // Fallback for missing name
                className="nft-image"
              />
              <p className="nft-name">{nft.template_name || nft.name || 'Unnamed NFT'}</p>
              <p className="asset-id">Asset ID: {nft.asset_id}</p>
              {slots[index] ? (
                <button
                  className="burn-button"
                  onClick={() => onBurn(index)} // Pass the slot index instead of NFT and incinerator
                >
                  Burn NFT
                </button>
              ) : (
                <p className="warning-text">Assign an incinerator to burn</p>
              )}
            </>
          ) : (
            <p className="empty-slot-text">Empty Slot</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default NFTSlots;
