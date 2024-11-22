import React, { useEffect, useState } from 'react';
import { fetchBurnableNFTs, fetchProposals } from '../services/api';
import { fetchStakedAndUnstakedIncinerators, refreshIncinerators } from '../services/incinerators';
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
  const [confirmationModal, setConfirmationModal] = useState(false);
  const [selectedIncinerator, setSelectedIncinerator] = useState(null);
  const [showSlots, setShowSlots] = useState(false);

  useEffect(() => {
    if (accountName) {
      setLoading(true);
      Promise.all([
        fetchBurnableNFTs(accountName),
        fetchProposals(),
        fetchStakedAndUnstakedIncinerators(accountName),
      ])
        .then(([nfts, fetchedProposals, incinerators]) => {
          setBurnableNFTs(nfts);
          setProposals(fetchedProposals.filter((proposal) => proposal.status === 'approved'));
          setStakedIncinerators(incinerators.staked);
          setUnstakedIncinerators(incinerators.unstaked);
        })
        .catch((error) => console.error('Error fetching data:', error))
        .finally(() => setLoading(false));
    }
  }, [accountName]);

  const handleNFTClick = (nft) => {
    setSelectedNFT(nft);
  };

  const handleAssignNFTToSlot = (nft, slotIndex) => {
    if (nftSlots.some((slot) => slot?.asset_id === nft.asset_id)) {
      alert('This NFT is already assigned to a slot.');
      return;
    }
    const updatedSlots = [...nftSlots];
    updatedSlots[slotIndex] = nft;
    setNftSlots(updatedSlots);
  };

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

  const handleIncineratorSelect = (incinerator) => {
    if (slots.some((slot) => slot && slot.asset_id === incinerator.asset_id)) {
      alert('This incinerator is already assigned to a slot.');
      return;
    }

    const updatedSlots = [...slots];
    updatedSlots[selectedSlotIndex] = {
      ...incinerator,
      fuel: incinerator.fuel || 0,
      energy: incinerator.energy || 0,
      durability: incinerator.durability || 0,
    };

    setSlots(updatedSlots);

    setStakedIncinerators((prev) =>
      prev.filter((i) => i.asset_id !== incinerator.asset_id)
    );

    setShowIncineratorModal(false);
  };

  const handleBurnNFT = async (nft, incinerator) => {
    try {
      setLoading(true);

      // Example burn NFT logic (replace with actual burning logic)
      console.log(`Burning NFT ${nft.asset_id} with Incinerator ${incinerator.asset_id}`);

      refreshIncinerators(accountName).then(({ staked, unstaked }) => {
        setStakedIncinerators(staked);
        setUnstakedIncinerators(unstaked);
      });
    } catch (error) {
      console.error('Error during burn transaction:', error);
    } finally {
      setLoading(false);
      setSelectedNFT(null);
    }
  };

  const toggleShowSlots = () => {
    setShowSlots(!showSlots);
    if (!showSlots) {
      refreshIncinerators(accountName).then(({ staked, unstaked }) => {
        setStakedIncinerators(staked);
        setUnstakedIncinerators(unstaked);
      });
    }
  };

  const availableStakedIncinerators = stakedIncinerators.filter(
    (incinerator) => !slots.some((slot) => slot && slot.asset_id === incinerator.asset_id)
  );

  return (
    <div className="burn-room">
      <button className="close-button" onClick={onClose}>
        &times;
      </button>
      <h2>Burn Room</h2>

      <NFTGrid
        burnableNFTs={burnableNFTs}
        proposals={proposals}
        selectedNFT={selectedNFT}
        onNFTClick={handleNFTClick}
        onAssignNFT={handleAssignNFTToSlot}
        nftSlots={nftSlots}
      />

      <h3>Selected NFTs to Burn</h3>
      <NFTSlots
        slots={slots}
        nftSlots={nftSlots}
        onSlotClick={handleSlotClick}
        onBurn={handleBurnNFT}
      />

      <h3>Available Incinerators</h3>
      <button onClick={toggleShowSlots}>
        {showSlots ? 'Hide Incinerators' : 'Show Incinerators'}
      </button>

      {showSlots && (
        <div className="incinerator-grid">
          {slots.map((slot, index) => (
            <div
              key={index}
              className={`incinerator-card ${slot ? '' : 'empty-incinerator'}`}
              onDoubleClick={() => handleRemoveIncinerator(index)}
            >
              {slot ? (
                <>
                  <button
                    className="burn-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveIncinerator(index);
                    }}
                  >
                    Remove Incinerator
                  </button>
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
                  <button
                    className="load-fuel-button fuel-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(`Load fuel for incinerator ${slot.asset_id}`);
                    }}
                  >
                    Add Fuel
                  </button>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill energy-bar"
                      style={{ width: `${(slot.energy / 10) * 100}%` }}
                    >
                      <span className="progress-bar-text">Energy: {slot.energy}/10</span>
                    </div>
                  </div>
                  <button
                    className="load-energy-button energy-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(`Load energy for incinerator ${slot.asset_id}`);
                    }}
                  >
                    Add Energy
                  </button>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill durability-bar"
                      style={{ width: `${(slot.durability / 500) * 100}%` }}
                    >
                      <span className="progress-bar-text">
                        Durability: {slot.durability}/500
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p onClick={() => handleSlotClick(index)}>Click to assign an incinerator</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showIncineratorModal && (
        <IncineratorModal
          stakedIncinerators={availableStakedIncinerators}
          onIncineratorSelect={handleIncineratorSelect}
          onClose={() => setShowIncineratorModal(false)}
        />
      )}

      {confirmationModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Stake</h3>
            {selectedIncinerator && (
              <div className="incinerator-card">
                <img
                  src={`https://ipfs.io/ipfs/${selectedIncinerator.img}`}
                  alt={selectedIncinerator.template_name || 'Unnamed Incinerator'}
                  className="incinerator-image"
                />
                <p>{selectedIncinerator.template_name || 'Unnamed Incinerator'}</p>
                <p className="asset-id">Asset ID: {selectedIncinerator.asset_id}</p>
              </div>
            )}
            <p className="staking-description">
              Staking locks your incinerator for use in burning NFTs. Once staked, you will need
              to unstake it if you want to transfer or reuse it elsewhere.
            </p>
            <button className="confirm-button">
              {loading ? 'Staking...' : 'Confirm'}
            </button>
            <button
              className="cancel-button"
              onClick={() => setConfirmationModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BurnRoom;
