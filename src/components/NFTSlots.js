import React from 'react';
import './BurnCenter.css';

const NFTSlots = ({
  nftSlots = [null, null, null],
  slots = [null, null, null],
  onBurn,
  onRemoveNFT = () => {}, // ✅ prevents crash if parent forgets to pass it
}) => {
  const resolveIpfsUrl = (ipfsHash) => {
    if (!ipfsHash) return 'default-placeholder.png';

    // Support full URLs and ipfs://
    if (typeof ipfsHash === 'string') {
      if (ipfsHash.startsWith('http://') || ipfsHash.startsWith('https://')) return ipfsHash;
      if (ipfsHash.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${ipfsHash.replace('ipfs://', '')}`;
    }

    return `https://ipfs.io/ipfs/${ipfsHash}`;
  };

  const hasEnoughFuelAndEnergy = (incinerator, nft) => {
    if (!incinerator || !nft) return false;

    const requiredFuel = parseFloat(nft.trash_fee || 0);
    const requiredEnergy = parseFloat(nft.energy_cost || 0);
    const availableFuel = parseFloat(incinerator.fuel || 0);
    const availableEnergy = parseFloat(incinerator.energy || 0);

    return availableFuel >= requiredFuel && availableEnergy >= requiredEnergy && availableEnergy > 0;
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

              {slots[index] ? (
                hasEnoughFuelAndEnergy(slots[index], nft) ? (
                  <button className="burn-button" onClick={() => onBurn(index)}>
                    Burn NFT
                  </button>
                ) : (
                  <button className="burn-button" disabled>
                    Not enough fuel or energy
                  </button>
                )
              ) : (
                <p className="warning-text">Assign an incinerator to burn</p>
              )}

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

