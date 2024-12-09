import React from 'react';
import './BurnRoom.css';

const NFTSlots = ({ nftSlots = [null, null, null], slots, onBurn }) => {
  // Function to resolve IPFS URL
  const resolveIpfsUrl = (ipfsHash) => {
    return ipfsHash ? `https://ipfs.io/ipfs/${ipfsHash}` : 'default-placeholder.png';
  };

  // Function to check if incinerator has enough fuel and energy for the selected NFT
  const hasEnoughFuelAndEnergy = (incinerator, nft) => {
    if (!incinerator || !nft) return false;

    const requiredFuel = parseFloat(nft.trash_fee || 0); // Ensure 'trash_fee' is a valid number
    const requiredEnergy = parseFloat(nft.energy_cost || 0); // Ensure 'energy_cost' is a valid number
    const availableFuel = parseFloat(incinerator.fuel || 0);
    const availableEnergy = parseFloat(incinerator.energy || 0);

    console.log('[DEBUG] Checking resources for burn:', {
      nft,
      incinerator,
      requiredFuel,
      availableFuel,
      requiredEnergy,
      availableEnergy,
    });

    // Ensure both fuel and energy are sufficient
    return availableFuel >= requiredFuel && availableEnergy >= requiredEnergy && availableEnergy > 0;
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
                hasEnoughFuelAndEnergy(slots[index], nft) ? (
                  <button
                    className="burn-button"
                    onClick={() => onBurn(index)} // Pass the slot index instead of NFT and incinerator
                  >
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
            </>
          ) : (
            <p className="empty-slot-text">Empty Slot</p> // When no NFT is assigned
          )}
        </div>
      ))}
    </div>
  );
};

export default NFTSlots;
