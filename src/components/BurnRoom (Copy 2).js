import React, { useEffect, useState } from 'react';
import { fetchBurnableNFTs, fetchProposals, fetchIncineratorsFromBlockchain, stakeIncinerator } from '../services/api';
import { fetchStakedIncinerators, fetchUnstakedIncinerators } from '../services/incinerators';
import './BurnRoom.css';
import { InitTransaction } from '../hooks/useSession';
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
  const [isFetchingIncinerators, setIsFetchingIncinerators] = useState(false);
  const [showSlots, setShowSlots] = useState(false);

  useEffect(() => {
    if (accountName) {
      setLoading(true);
      Promise.all([fetchBurnableNFTs(accountName), fetchProposals()])
        .then(([nfts, fetchedProposals]) => {
          setBurnableNFTs(nfts);
          setProposals(fetchedProposals.filter((proposal) => proposal.status === 'approved'));
          fetchIncinerators();
          fetchUnstakedIncinerators();
        })
        .catch((error) => console.error('Error fetching data:', error))
        .finally(() => setLoading(false));
    }
  }, [accountName]);

  const fetchIncinerators = async () => {
    try {
      const incinerators = await fetchStakedIncinerators(accountName);
      setStakedIncinerators(
        incinerators.map((incinerator) => ({
          ...incinerator,
          template_name: incinerator.name || 'Unnamed Incinerator',
        }))
      );
    } catch (error) {
      console.error('Error fetching staked incinerators:', error);
    }
  };

  const fetchUnstakedIncinerators = async () => {
    try {
      const incinerators = await fetchUnstakedIncinerators(accountName);
      setUnstakedIncinerators(
        incinerators.map((incinerator) => ({
          ...incinerator,
          template_name: incinerator.name || 'Unnamed Incinerator',
        }))
      );
    } catch (error) {
      console.error('Error fetching unstaked incinerators:', error);
    }
  };

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

  const handleStakeClick = (incinerator) => {
    setSelectedIncinerator(incinerator);
    setConfirmationModal(true);
  };

  const confirmStake = async () => {
    try {
      if (!selectedIncinerator) {
        alert('No incinerator selected for staking.');
        return;
      }

      setLoading(true);
      const { asset_id, template_id } = selectedIncinerator;

      if (!template_id) {
        throw new Error('Selected incinerator is missing template_id. Cannot proceed with staking.');
      }

      const memo = `Stake NFT:${asset_id}`;
      const dataTrx = {
        actions: [
          {
            account: 'atomicassets',
            name: 'transfer',
            authorization: [],
            data: {
              from: accountName,
              to: 'cleanupcentr',
              asset_ids: [String(asset_id)],
              memo,
            },
          },
        ],
      };

      console.log('Initiating stake transaction with memo:', memo);
      const result = await InitTransaction(dataTrx);

      if (result && result.transactionId) {
        alert(`Incinerator staked successfully! Transaction ID: ${result.transactionId}`);
        fetchIncinerators();
        fetchUnstakedIncinerators();
      } else {
        alert('Staking transaction failed.');
      }
    } catch (error) {
      console.error('Error during staking transaction:', error);
      alert('A network error occurred while staking. Please try again.');
    } finally {
      setLoading(false);
      setConfirmationModal(false);
      setSelectedIncinerator(null);
    }
  };

  const handleIncineratorSelect = (incinerator) => {
    const updatedSlots = [...slots];
    updatedSlots[selectedSlotIndex] = {
      ...incinerator,
      fuel: incinerator.fuel || 0,
      energy: incinerator.energy || 0,
      durability: incinerator.durability || 0,
    };
    setSlots(updatedSlots);
    setShowIncineratorModal(false);
    setStakedIncinerators(stakedIncinerators.filter((i) => i.asset_id !== incinerator.asset_id));
  };

  const handleBurnNFT = async (nft, incinerator) => {
    try {
      if (!nft || !incinerator) {
        alert('Please select both an NFT and an incinerator to proceed with burning.');
        return;
      }

      setLoading(true);
      const dataTrx = {
        actions: [
          {
            account: 'atomicassets',
            name: 'transfer',
            authorization: [],
            data: {
              from: accountName,
              to: 'cleanupcentr',
              asset_ids: [String(nft.asset_id)],
              memo: `Incinerate NFT:${incinerator.id}`,
            },
          },
        ],
      };

      console.log('Initiating burn transaction with NFT:', nft.asset_id);
      const result = await InitTransaction(dataTrx);

      if (result && result.transactionId) {
        alert(`NFT burned successfully! Transaction ID: ${result.transactionId}`);
        fetchBurnableNFTs(accountName);
        fetchIncinerators();
        fetchUnstakedIncinerators();
      } else {
        alert('Burn transaction failed.');
      }
    } catch (error) {
      console.error('Error during burn transaction:', error);
      alert('A network error occurred while burning. Please try again.');
    } finally {
      setLoading(false);
      setSelectedNFT(null);
    }
  };

  const toggleShowSlots = () => {
    setShowSlots(!showSlots);
    if (!showSlots) {
      fetchIncinerators();
      fetchUnstakedIncinerators();
    }
  };

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
              <button
                className="burn-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveIncinerator(index);
                }}
              >
                Remove Incinerator
              </button>
              {slot ? (
                <>
                  <img
                    src={`https://ipfs.io/ipfs/${slot.img}`}
                    alt={slot.template_name || 'Unnamed Incinerator'}
                    className="incinerator-image"
                  />
                  <p>{slot.template_name || 'Unnamed Incinerator'}</p>
                  <p className="asset-id">Asset ID: {slot.id}</p>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill fuel-bar" style={{ width: `${(slot.fuel / 100000) * 100}%`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span className="progress-bar-text">Fuel: {slot.fuel}/100000</span>
                    </div>
                  </div>
                  <button className="load-fuel-button fuel-button" onClick={(e) => { e.stopPropagation(); }}>Add Fuel</button>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill energy-bar" style={{ width: `${(slot.energy / 10) * 100}%`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span className="progress-bar-text">Energy: {slot.energy}/10</span>
                    </div>
                  </div>
                  <button className="load-energy-button energy-button" onClick={(e) => { e.stopPropagation(); }}>Add Energy</button>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill durability-bar" style={{ width: `${(slot.durability / 500) * 100}%`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span className="progress-bar-text">Durability: {slot.durability}/500</span>
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

      {showSlots && (
        <div className="unstaked-section">
          <h4>Unstaked Incinerators</h4>
          <div className="incinerator-grid">
            {unstakedIncinerators.length > 0 ? (
              unstakedIncinerators.map((incinerator) => (
                <div key={incinerator.asset_id} className="incinerator-card" onClick={() => handleIncineratorSelect(incinerator)}>
                  <img
                    src={
                      incinerator.img
                        ? `https://ipfs.io/ipfs/${incinerator.img}`
                        : 'default-placeholder.png'
                    }
                    alt={incinerator.template_name || 'Unnamed Incinerator'}
                    className="incinerator-image"
                  />
                  <p>{incinerator.template_name || 'Unnamed Incinerator'}</p>
                  <p className="asset-id">Asset ID: {incinerator.asset_id}</p>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill fuel-bar" style={{ width: `${(incinerator.fuel / 100000) * 100}%`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span className="progress-bar-text">Fuel: {incinerator.fuel}/100000</span>
                    </div>
                  </div>
                  <button className="load-fuel-button fuel-button" onClick={(e) => { e.stopPropagation(); }}>Add Fuel</button>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill energy-bar" style={{ width: `${(incinerator.energy / 10) * 100}%`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span className="progress-bar-text">Energy: {incinerator.energy}/10</span>
                    </div>
                  </div>
                  <button className="load-energy-button energy-button" onClick={(e) => { e.stopPropagation(); }}>Add Energy</button>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill durability-bar" style={{ width: `${(incinerator.durability / 500) * 100}%`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span className="progress-bar-text">Durability: {incinerator.durability}/500</span>
                    </div>
                  </div>
                  <button className="stake-button" onClick={(e) => {
                    e.stopPropagation();
                    handleStakeClick(incinerator);
                  }}>
                    Stake Incinerator
                  </button>
                </div>
              ))
            ) : (
              <p>No unstaked incinerators available.</p>
            )}
          </div>
        </div>
      )}

      {showIncineratorModal && (
        <IncineratorModal
          stakedIncinerators={stakedIncinerators}
          onIncineratorSelect={handleIncineratorSelect}
          onClose={() => setShowIncineratorModal(false)}
          loadFuel={(id, amount) => console.log(`Load ${amount} fuel to incinerator ${id}`)}
          loadEnergy={(id) => console.log(`Load energy to incinerator ${id}`)}
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
                <div className="progress-bar-container">
                  <div className="progress-bar-fill fuel-bar" style={{ width: `${(selectedIncinerator.fuel / 100000) * 100}%`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <span className="progress-bar-text">Fuel: {selectedIncinerator.fuel}/100000</span>
                  </div>
                </div>
                <button className="load-fuel-button fuel-button">Add Fuel</button>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill energy-bar" style={{ width: `${(selectedIncinerator.energy / 10) * 100}%`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <span className="progress-bar-text">Energy: {selectedIncinerator.energy}/10</span>
                  </div>
                </div>
                <button className="load-energy-button energy-button">Add Energy</button>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill durability-bar" style={{ width: `${(selectedIncinerator.durability / 500) * 100}%`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <span className="progress-bar-text">Durability: {selectedIncinerator.durability}/500</span>
                  </div>
                </div>
              </div>
            )}
            <p className="staking-description">
              Staking locks your incinerator for use in burning NFTs. Once staked, you will need to unstake it if you want to transfer or reuse it elsewhere. To unstake the durability must be maxed out.
            </p>
            <button className="confirm-button" onClick={confirmStake}>
              {loading ? 'Staking...' : 'Confirm'}
            </button>
            <button className="cancel-button" onClick={() => setConfirmationModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BurnRoom;
