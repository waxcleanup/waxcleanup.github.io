import React, { useEffect, useState } from 'react';
import { fetchBurnableNFTs, fetchProposals } from '../services/api';
import { fetchUnstakedIncinerators, fetchStakedIncinerators } from '../services/incinerators';
import './BurnRoom.css';
import NFTGrid from './NFTGrid';
import NFTSlots from './NFTSlots';
import IncineratorModal from './IncineratorModal';

const BurnRoom = ({ accountName, onClose }) => {
  const [burnableNFTs, setBurnableNFTs] = useState([]);
  const [slots, setSlots] = useState([null, null, null]); // Incinerator slots
  const [nftSlots, setNftSlots] = useState([null, null, null]); // NFT selection slots
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [stakedIncinerators, setStakedIncinerators] = useState([]);
  const [unstakedIncinerators, setUnstakedIncinerators] = useState([]);
  const [showIncineratorModal, setShowIncineratorModal] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);

  useEffect(() => {
    if (accountName) {
      setLoading(true);
      Promise.all([
        fetchBurnableNFTs(accountName),
        fetchProposals(),
        fetchUnstakedIncinerators(accountName),
        fetchStakedIncinerators(accountName),
      ])
        .then(([nfts, fetchedProposals, unstaked, staked]) => {
          setBurnableNFTs(nfts);
          setProposals(fetchedProposals.filter((proposal) => proposal.status === 'approved'));
          setUnstakedIncinerators(unstaked);
          setStakedIncinerators(staked);
        })
        .catch((error) => console.error('Error fetching data:', error))
        .finally(() => setLoading(false));
    }
  }, [accountName]);

  const handleSlotClick = (slotIndex) => {
    setSelectedSlotIndex(slotIndex);
    setShowIncineratorModal(true);
  };

  const handleRemoveIncinerator = (slotIndex) => {
    const updatedSlots = [...slots];
    const removedIncinerator = updatedSlots[slotIndex];
    updatedSlots[slotIndex] = null;
    setSlots(updatedSlots);

    if (removedIncinerator) {
      setStakedIncinerators((prev) => [...prev, removedIncinerator]);
    }
  };

  const handleStakedIncineratorSelect = (incinerator) => {
    const updatedSlots = [...slots];
    updatedSlots[selectedSlotIndex] = incinerator;
    setSlots(updatedSlots);

    setStakedIncinerators((prev) =>
      prev.filter((i) => i.asset_id !== incinerator.asset_id)
    );

    setShowIncineratorModal(false);
  };

  const loadFuel = (incineratorId, amount) => {
    console.log(`Loading ${amount} fuel into incinerator ${incineratorId}`);
    // Add backend or blockchain logic to load fuel
  };

  const loadEnergy = (incineratorId) => {
    console.log(`Loading energy into incinerator ${incineratorId}`);
    // Add backend or blockchain logic to load energy
  };

  const repairDurability = (incineratorId) => {
    console.log(`Repairing durability for ${incineratorId}`);
    // Add backend or blockchain logic to repair durability
  };

  const handleBurnNFT = async () => {
    try {
      const incinerator = slots.find((slot) => slot); // Find the first assigned incinerator
      console.log(`Burning NFT ${selectedNFT.asset_id} with Incinerator ${incinerator.asset_id}`);
      // Add burn logic here (e.g., blockchain transaction)
    } catch (error) {
      console.error('Error during burn transaction:', error);
    }
  };

  return (
    <div className="burn-room">
      <button className="close-button" onClick={onClose}>
        &times;
      </button>
      <h2>Burn Room</h2>

      {/* NFT Grid */}
      <NFTGrid
        burnableNFTs={burnableNFTs}
        proposals={proposals}
        selectedNFT={selectedNFT}
        onNFTClick={(nft) => setSelectedNFT(nft)}
        onAssignNFT={(nft, index) => {
          const updatedSlots = [...nftSlots];
          updatedSlots[index] = nft;
          setNftSlots(updatedSlots);
        }}
        nftSlots={nftSlots}
      />

      {/* Selected NFTs to Burn */}
      <div className="selected-nfts-container">
        <h3>Selected NFTs to Burn</h3>
        <NFTSlots
          slots={slots}
          nftSlots={nftSlots}
          onSlotClick={(index) => handleSlotClick(index)}
        />
        <div className="burn-button-container">
          <button
            className="burn-button"
            onClick={handleBurnNFT}
            disabled={!selectedNFT || !slots.some((slot) => slot)}
          >
            Burn NFT
          </button>
        </div>
      </div>

      {/* Incinerator Slots */}
      <h3>Incinerator Slots</h3>
      <div className="incinerator-grid">
        {slots.map((slot, index) => (
          <div
            key={index}
            className={`incinerator-card ${slot ? '' : 'empty-incinerator'}`}
            onClick={() => handleSlotClick(index)}
          >
            {slot ? (
              <>
                <img
                  src={`https://ipfs.io/ipfs/${slot.img}`}
                  alt={slot.template_name || 'Unnamed Incinerator'}
                  className="incinerator-image"
                />
                <p>{slot.template_name || 'Unnamed Incinerator'}</p>
                <p className="asset-id">Asset ID: {slot.asset_id}</p>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill fuel-bar"
                    style={{ width: `${(slot.fuel / 100000) * 100}%` }}
                  >
                    <span className="progress-bar-text">Fuel: {slot.fuel}/100000</span>
                  </div>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill energy-bar"
                    style={{ width: `${(slot.energy / 10) * 100}%` }}
                  >
                    <span className="progress-bar-text">Energy: {slot.energy}/10</span>
                  </div>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill durability-bar"
                    style={{ width: `${(slot.durability / 500) * 100}%` }}
                  >
                    <span className="progress-bar-text">Durability: {slot.durability}/500</span>
                  </div>
                </div>
                <div className="button-container">
                  <button
                    className="fuel-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadFuel(slot.asset_id, 10000);
                    }}
                  >
                    Load Fuel
                  </button>
                  <button
                    className="energy-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadEnergy(slot.asset_id);
                    }}
                  >
                    Load Energy
                  </button>
                  <button
                    className="repair-durability-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      repairDurability(slot.asset_id);
                    }}
                  >
                    Repair Durability
                  </button>
                  <button
                    className="remove-incinerator-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveIncinerator(index);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </>
            ) : (
              <p>Click to assign an incinerator</p>
            )}
          </div>
        ))}
      </div>

      {/* Incinerator Modal */}
      {showIncineratorModal && (
        <IncineratorModal
          stakedIncinerators={stakedIncinerators}
          unstakedIncinerators={unstakedIncinerators}
          onIncineratorSelect={handleStakedIncineratorSelect}
          onClose={() => setShowIncineratorModal(false)}
          loadFuel={loadFuel}
          loadEnergy={loadEnergy}
          repairDurability={repairDurability}
        />
      )}
    </div>
  );
};

export default BurnRoom;
