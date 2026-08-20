import React from 'react';
import './BurnCenter.css';

const NFTSlots = ({
  nftSlots = [null, null, null],
  burnStates = [],
  onBurn,
  onRemoveNFT = () => {}, // ✅ prevents crash if parent forgets to pass it
}) => {
  const resolveIpfsUrl = (ipfsHash) => {
    if (!ipfsHash) return 'default-placeholder.png';

    // Support full URLs and ipfs://
    if (typeof ipfsHash === 'string') {
      if (ipfsHash.includes('/ipfs/')) return `https://maestrobeatz.servegame.com/ipfs/${ipfsHash.split('/ipfs/')[1]}`;
      if (ipfsHash.startsWith('http://') || ipfsHash.startsWith('https://')) return ipfsHash;
      if (ipfsHash.startsWith('ipfs://')) return `https://maestrobeatz.servegame.com/ipfs/${ipfsHash.replace('ipfs://', '')}`;
    }

    return `https://maestrobeatz.servegame.com/ipfs/${ipfsHash}`;
  };

  return (
    // ✅ Added burnroom-nft-slots so BurnRoom.css can style this WITHOUT bloating BurnCenter.css
    <div className="nft-slots burnroom-nft-slots">
      {nftSlots.map((nft, index) => (
        <div key={index} className="nft-slot">
          {nft ? (
            <>
              <img
                src={resolveIpfsUrl(nft.img)}
                alt={nft.template_name || nft.name || 'Unnamed NFT'}
                className="nft-image"
                loading="lazy"
              />

              <p className="nft-name">{nft.template_name || nft.name || 'Unnamed NFT'}</p>
              <p className="asset-id">Asset ID: {nft.asset_id}</p>

              <button
                className="burn-button"
                disabled={!burnStates[index]?.canBurn}
                onClick={() => onBurn(index)}
                title={burnStates[index]?.label || 'Burn unavailable'}
              >
                {burnStates[index]?.label || 'Burn unavailable'}
              </button>

              {/* ✅ Remove button */}
              <button className="remove-nft-button" onClick={() => onRemoveNFT(index)}>
                Remove
              </button>
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

