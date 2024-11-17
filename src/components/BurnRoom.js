import React, { useEffect, useState } from 'react';
import { fetchBurnableNFTs, fetchProposals, fetchIncineratorsFromBlockchain, stakeIncinerator } from '../services/api';
import './BurnRoom.css';

const BurnRoom = ({ accountName, onClose }) => {
  const [burnableNFTs, setBurnableNFTs] = useState([]);
  const [slots, setSlots] = useState([null, null, null]);
  const [nftSlots, setNftSlots] = useState([null, null, null]); // Slots for selected NFTs to burn
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState([]);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [showIncineratorModal, setShowIncineratorModal] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);
  const [confirmationModal, setConfirmationModal] = useState(false);
  const [selectedIncinerator, setSelectedIncinerator] = useState(null);
  const [isFetchingIncinerators, setIsFetchingIncinerators] = useState(false);
  const [showSlots, setShowSlots] = useState(false);
  const [unstakedIncinerators, setUnstakedIncinerators] = useState([]);
  const [stakedIncinerators, setStakedIncinerators] = useState([]);

  useEffect(() => {
    if (accountName) {
      setLoading(true);
      Promise.all([fetchBurnableNFTs(accountName), fetchProposals()])
        .then(([nfts, fetchedProposals]) => {
          setBurnableNFTs(nfts);
          setProposals(fetchedProposals.filter((proposal) => proposal.status === 'approved'));
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching burnable NFTs or proposals:', error);
          setLoading(false);
        });
    }
  }, [accountName]);

  const fetchIncinerators = async () => {
    setIsFetchingIncinerators(true);
    try {
      const userIncinerators = await fetchIncineratorsFromBlockchain(accountName);
      const unstaked = userIncinerators.filter((incinerator) => !incinerator.is_staked);
      const staked = userIncinerators.filter((incinerator) => incinerator.is_staked);
      setUnstakedIncinerators(unstaked);
      setStakedIncinerators(staked);
    } catch (error) {
      console.error('Error fetching incinerators:', error);
      alert('Failed to fetch incinerators.');
    } finally {
      setIsFetchingIncinerators(false);
    }
  };

  const handleNFTClick = (nft) => {
    setSelectedNFT(nft);
  };

  const assignNFTToSlot = (nft, slotIndex) => {
    // Check if the NFT is already assigned to any slot
    if (nftSlots.some((slot) => slot?.asset_id === nft.asset_id)) {
      alert('This NFT is already assigned to a slot.');
      return;
    }

    const updatedSlots = [...nftSlots];
    updatedSlots[slotIndex] = nft;
    setNftSlots(updatedSlots);
  };

  const handleSlotClick = (slotIndex) => {
    if (unstakedIncinerators.length === 0) {
      alert('No unstaked incinerators to assign.');
      return;
    }
    setSelectedSlotIndex(slotIndex);
    setShowIncineratorModal(true);
  };

  const handleStakeClick = (incinerator) => {
    setSelectedIncinerator(incinerator);
    setConfirmationModal(true);
  };

  const confirmStake = async () => {
    try {
      if (selectedIncinerator) {
        const response = await stakeIncinerator(accountName, selectedIncinerator.asset_id);
        if (response.success) {
          alert('Incinerator staked successfully!');
          fetchIncinerators();
        } else {
          alert(`Failed to stake incinerator: ${response.error}`);
        }
      }
    } catch (error) {
      console.error('Error staking incinerator:', error);
      alert('An error occurred while staking the incinerator.');
    } finally {
      setConfirmationModal(false);
      setSelectedIncinerator(null);
    }
  };

  const renderNFTGrid = () => (
    <div className="nft-grid">
      {burnableNFTs.map((nft) => {
        const { trash_fee, cinder_reward } = proposals.find(
          (proposal) => proposal.template_id === nft.template_id
        ) || { trash_fee: null, cinder_reward: null };

        return (
          <div
            key={nft.asset_id}
            className={`nft-card ${selectedNFT?.asset_id === nft.asset_id ? 'selected' : ''}`}
            onClick={() => handleNFTClick(nft)}
          >
            <img
              src={`https://ipfs.io/ipfs/${nft.img}`}
              alt={nft.template_name || 'Unnamed NFT'}
              className="nft-image"
            />
            <div className="nft-info">
              <p className="nft-name">{nft.template_name || 'Unnamed NFT'}</p>
              <p className="trash-fee">Fee: {trash_fee || 'N/A'}</p>
              <p className="nft-reward">Reward: {cinder_reward || 'N/A'}</p>
              <button
                className="assign-button"
                onClick={() => {
                  const emptySlot = nftSlots.findIndex((slot) => slot === null);
                  if (emptySlot !== -1) assignNFTToSlot(nft, emptySlot);
                  else alert('All NFT slots are full.');
                }}
              >
                Assign to Slot
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderIncineratorModal = () => (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Select an Incinerator</h3>

        <div className="unstaked-section">
          <h4>Unstaked Incinerators</h4>
          <div className="incinerator-grid">
            {unstakedIncinerators.length > 0 ? (
              unstakedIncinerators.map((incinerator) => (
                <div key={incinerator.asset_id} className="incinerator-card">
                  <img
                    src={`https://ipfs.io/ipfs/${incinerator.img}`}
                    alt={incinerator.template_name || 'Unnamed Incinerator'}
                    className="incinerator-image"
                  />
                  <p>{incinerator.template_name || 'Unnamed Incinerator'}</p>
                  <p className="asset-id">Asset ID: {incinerator.asset_id}</p>
                  <button
                    className="stake-button"
                    onClick={() => handleStakeClick(incinerator)}
                  >
                    Stake
                  </button>
                </div>
              ))
            ) : (
              <p>No unstaked incinerators available.</p>
            )}
          </div>
        </div>

        <hr className="section-divider" />

        <div className="staked-section">
          <h4>Staked Incinerators</h4>
          <div className="incinerator-grid">
            {stakedIncinerators.length > 0 ? (
              stakedIncinerators.map((incinerator) => (
                <div key={incinerator.asset_id} className="incinerator-card">
                  <img
                    src={`https://ipfs.io/ipfs/${incinerator.img}`}
                    alt={incinerator.template_name || 'Unnamed Incinerator'}
                    className="incinerator-image"
                  />
                  <p>{incinerator.template_name || 'Unnamed Incinerator'}</p>
                  <p className="asset-id">Asset ID: {incinerator.asset_id}</p>
                </div>
              ))
            ) : (
              <p>No staked incinerators available.</p>
            )}
          </div>
        </div>

        <button className="close-button" onClick={() => setShowIncineratorModal(false)}>
          Close
        </button>
      </div>
    </div>
  );

  if (loading) {
    return <div className="burn-room">Loading burnable NFTs...</div>;
  }

  return (
    <div className="burn-room">
      <button className="close-button" onClick={onClose}>
        &times;
      </button>

      <h2 className="burn-room-title">Burn Room</h2>

      <p>Approved NFTs: {burnableNFTs.length}</p>

      <button onClick={() => { fetchIncinerators(); setShowSlots(true); }} disabled={isFetchingIncinerators}>
        {isFetchingIncinerators ? 'Loading Incinerators...' : 'Show Available Incinerators'}
      </button>

      {showSlots && (
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
                </>
              ) : (
                <p>Click to assign an incinerator</p>
              )}
            </div>
          ))}
        </div>
      )}

      <h3>Selected NFTs to Burn</h3>
      <div className="nft-slots">
        {nftSlots.map((nft, index) => (
          <div key={index} className="nft-slot">
            {nft ? (
              <>
                <img
                  src={`https://ipfs.io/ipfs/${nft.img}`}
                  alt={nft.template_name || 'Unnamed NFT'}
                  className="nft-image"
                />
                <p>{nft.template_name || 'Unnamed NFT'}</p>
                <p className="asset-id">Asset ID: {nft.asset_id}</p>
              </>
            ) : (
              <p>Empty Slot</p>
            )}
          </div>
        ))}
      </div>

      {renderNFTGrid()}

      {showIncineratorModal && renderIncineratorModal()}
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
            <button className="confirm-button" onClick={confirmStake}>
              Confirm
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
