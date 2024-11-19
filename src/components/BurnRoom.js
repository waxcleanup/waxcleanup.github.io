import React, { useEffect, useState } from 'react';
import { fetchBurnableNFTs, fetchProposals, fetchIncineratorsFromBlockchain, stakeIncinerator } from '../services/api';
import { fetchStakedIncinerators } from '../services/incinerators';
import './BurnRoom.css';
import { InitTransaction } from '../hooks/useSession';

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
          fetchIncinerators(); // Fetch both staked and unstaked incinerators
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching data:', error);
          setLoading(false);
        });
    }
  }, [accountName]);

  const fetchIncinerators = async () => {
    try {
      const stakedIncineratorsData = await fetchStakedIncinerators(accountName);

      // Map and include template_name
      setStakedIncinerators(
        stakedIncineratorsData.map((incinerator) => ({
          ...incinerator,
          template_name: incinerator.name || 'Unnamed Incinerator', // Use 'name' or fallback
        }))
      );
    } catch (error) {
      console.error('Error fetching staked incinerators:', error);
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
    setSelectedSlotIndex(slotIndex);
    setShowIncineratorModal(true);
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

      // Ensure incinerator_id and template_id are present
      const { asset_id, template_id } = selectedIncinerator;

      if (!template_id) {
        throw new Error('Selected incinerator is missing template_id. Cannot proceed with staking.');
      }

      // Memo format for staking
      const memo = `Stake NFT:${asset_id}`;

      // Prepare the staking transaction
      const dataTrx = {
        actions: [
          {
            account: 'atomicassets', // The account to transfer NFTs
            name: 'transfer', // The action to transfer NFTs
            authorization: [], // This will be automatically added by InitTransaction
            data: {
              from: accountName,
              to: 'cleanupcentr', // The recipient contract
              asset_ids: [String(asset_id)], // Array of asset IDs to stake
              memo, // Pass the correctly formatted memo
            },
          },
        ],
      };

      console.log('Initiating stake transaction with memo:', memo);

      // Call the InitTransaction function to execute the transaction
      const result = await InitTransaction(dataTrx);

      if (result && result.transactionId) {
        alert(`Incinerator staked successfully! Transaction ID: ${result.transactionId}`);
        fetchIncinerators(); // Refresh incinerator data
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
    setSelectedIncinerator(incinerator);
    setShowIncineratorModal(false);
    const updatedSlots = [...slots];
    updatedSlots[selectedSlotIndex] = incinerator;
    setSlots(updatedSlots);

    // Remove the selected incinerator from the staked list to prevent re-selection
    setStakedIncinerators(stakedIncinerators.filter((i) => i.id !== incinerator.id));
  };

  const burnNFT = async (nft, incinerator) => {
    try {
      if (!nft || !incinerator) {
        alert('Please select both an NFT and an incinerator to proceed with burning.');
        return;
      }

      setLoading(true);

      // Prepare the burning transaction
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

      // Call the InitTransaction function to execute the transaction
      const result = await InitTransaction(dataTrx);

      if (result && result.transactionId) {
        alert(`NFT burned successfully! Transaction ID: ${result.transactionId}`);
        fetchBurnableNFTs(accountName); // Refresh burnable NFT data
        fetchIncinerators(); // Refresh incinerator data
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

  const loadFuel = async (incineratorId, amount) => {
    try {
      // Logic for loading fuel goes here
      console.log(`Loading fuel for incinerator ${incineratorId} with amount ${amount}`);
      // Add API call or contract interaction to load fuel
    } catch (error) {
      console.error('Error loading fuel:', error);
    }
  };

  const loadEnergy = async (incineratorId) => {
    try {
      // Logic for loading energy goes here
      console.log(`Loading energy for incinerator ${incineratorId}`);
      // Add API call or contract interaction to load energy
    } catch (error) {
      console.error('Error loading energy:', error);
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

        <div className="staked-section">
          <h4>Staked Incinerators</h4>
          <div className="incinerator-grid">
            {stakedIncinerators.length > 0 ? (
              stakedIncinerators.map((incinerator) => (
                <div key={incinerator.id} className="incinerator-card" onClick={() => handleIncineratorSelect(incinerator)}>
                  <img
                    src={
                      incinerator.img
                        ? `https://ipfs.io/ipfs/${incinerator.img}`
                        : 'default-placeholder.png' // Replace with a placeholder image path
                    }
                    alt={incinerator.template_name || 'Unnamed Incinerator'}
                    className="incinerator-image"
                  />
                  <p>{incinerator.template_name || 'Unnamed Incinerator'}</p>
                  <p className="asset-id">Asset ID: {incinerator.id}</p>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill fuel-bar" style={{ width: `${(incinerator.fuel / 100000) * 100}%`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span className="progress-bar-text">{incinerator.fuel}/100000</span>
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill energy-bar" style={{ width: `${(incinerator.energy / 10) * 100}%`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span className="progress-bar-text">{incinerator.energy}/10</span>
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${(incinerator.durability / 500) * 100}%`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span className="progress-bar-text">{incinerator.durability}/500</span>
                    </div>
                  </div>
                  <button className="load-fuel-button fuel-button" onClick={() => loadFuel(incinerator.id, 10000)}>
                    Load Fuel
                  </button>
                  <button className="load-energy-button energy-button" onClick={() => loadEnergy(incinerator.id)}>
                    Load Energy
                  </button>
                </div>
              ))
            ) : (
              <p>No staked incinerators available.</p>
            )}
          </div>
        </div>

        <div className="unstaked-section">
          <h4>Unstaked Incinerators</h4>
          <div className="incinerator-grid">
            {unstakedIncinerators.length > 0 ? (
              unstakedIncinerators.map((incinerator) => (
                <div key={incinerator.asset_id} className="incinerator-card">
                  <img
                    src={
                      incinerator.img
                        ? `https://ipfs.io/ipfs/${incinerator.img}`
                        : 'default-placeholder.png' // Replace with a placeholder image path
                    }
                    alt={incinerator.template_name || 'Unnamed Incinerator'}
                    className="incinerator-image"
                  />
                  <p>{incinerator.template_name || 'Unnamed Incinerator'}</p>
                  <p className="asset-id">Asset ID: {incinerator.asset_id}</p>
                </div>
              ))
            ) : (
              <p>No unstaked incinerators available.</p>
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

      <p>Approved NFTs: {burnableNFTs.filter(nft => proposals.some(proposal => proposal.template_id === nft.template_id)).length}</p>

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
                  <p className="asset-id">Asset ID: {slot.id}</p>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill fuel-bar" style={{ width: `${(slot.fuel / 100000) * 100}%`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span className="progress-bar-text">{slot.fuel}/100000</span>
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill energy-bar" style={{ width: `${(slot.energy / 10) * 100}%`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span className="progress-bar-text">{slot.energy}/10</span>
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${(slot.durability / 500) * 100}%`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <span className="progress-bar-text">{slot.durability}/500</span>
                    </div>
                  </div>
                  <button className="load-fuel-button fuel-button" onClick={() => loadFuel(slot.id, 10000)}>
                    Load Fuel
                  </button>
                  <button className="load-energy-button energy-button" onClick={() => loadEnergy(slot.id)}>
                    Load Energy
                  </button>
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
                <button className="burn-button" onClick={() => burnNFT(nft, slots[selectedSlotIndex])}>
                  Burn NFT
                </button>
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
            {/* Add the descriptive text here */}
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
