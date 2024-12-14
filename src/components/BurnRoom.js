import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { fetchBurnableNFTs } from '../services/fetchBurnableNFTs';
import { fetchUnstakedIncinerators, fetchStakedIncinerators } from '../services/incinerators';
import { stakeIncinerator, burnNFT, unstakeIncinerator } from '../services/transactionActions';
import { getBurnRecordsByAssetId } from '../services/burnRecordsApi'; // Keeping this import
import './BurnRoom.css';
import NFTGrid from './NFTGrid';
import NFTSlots from './NFTSlots';
import IncineratorModal from './IncineratorModal';
import IncineratorDetails from './IncineratorDetails';

const BurnRoom = ({ accountName, onClose }) => {
  const [burnableNFTs, setBurnableNFTs] = useState([]);
  const [slots, setSlots] = useState([null, null, null]); // Incinerator slots
  const [nftSlots, setNftSlots] = useState([null, null, null]); // NFT selection slots
  const [loading, setLoading] = useState(true);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [stakedIncinerators, setStakedIncinerators] = useState([]);
  const [unstakedIncinerators, setUnstakedIncinerators] = useState([]);
  const [showIncineratorModal, setShowIncineratorModal] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);
  const [burnMessage, setBurnMessage] = useState('');
  const [messageVisible, setMessageVisible] = useState(false);

  // Fetch all required data
const [recentlyBurnedNFTs, setRecentlyBurnedNFTs] = useState([]);

const fetchData = useCallback(async () => {
  setLoading(true);
  try {
    const [nfts, unstaked, staked] = await Promise.all([
      fetchBurnableNFTs(accountName),
      fetchUnstakedIncinerators(accountName),
      fetchStakedIncinerators(accountName),
    ]);

    // Normalize staked incinerators to ensure `asset_id` exists
    const normalizedStaked = staked.map((inc) => ({
      ...inc,
      asset_id: inc.asset_id || inc.id, // Fallback to `id` if `asset_id` is missing
    }));

    // Exclude recently burned NFTs
    const filteredNFTs = nfts.filter(
      (nft) => !recentlyBurnedNFTs.includes(nft.asset_id)
    );

    setBurnableNFTs(filteredNFTs);
    setUnstakedIncinerators(unstaked);
    setStakedIncinerators(normalizedStaked);

    // Update slots with refreshed incinerator data
    setSlots((prevSlots) =>
      prevSlots.map((slot) => {
        if (!slot) return null; // Keep empty slots as is
        return normalizedStaked.find((inc) => inc.asset_id === slot.asset_id) || null;
      })
    );

    console.log('[INFO] Data fetched successfully.');
  } catch (error) {
    console.error('[ERROR] Failed to fetch data:', error);
  } finally {
    setLoading(false);
  }
}, [accountName, recentlyBurnedNFTs]);

  useEffect(() => {
    fetchData(); // Fetch data on component mount
  }, [fetchData]);

  const handleSlotClick = (slotIndex) => {
    setSelectedSlotIndex(slotIndex);
    setShowIncineratorModal(true);
  };

  const handleModalClose = () => {
    setSelectedSlotIndex(null);
    setShowIncineratorModal(false);
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
    setSelectedSlotIndex(null);
  };

  // Polling for Transaction Completion (for both staking and unstaking)
  const pollForTransaction = async (transactionId, timeout = 15000, interval = 1000) => {
    const startTime = Date.now();
    
    const poll = async () => {
      try {
        console.log('[INFO] Polling for transaction update...');
        await fetchData(); // Ensure the UI updates after polling

        const elapsedTime = Date.now() - startTime;
        if (elapsedTime > timeout) {
          console.warn('[WARNING] Polling timed out.');
          clearInterval(pollInterval); // Stop polling after timeout
        }
      } catch (error) {
        console.error('[ERROR] Polling failed:', error);
      }
    };

    const pollInterval = setInterval(poll, interval); // Start polling every interval
    setTimeout(() => clearInterval(pollInterval), timeout); // Stop polling after timeout
  };

  const handleStakeUnstakedIncinerator = async (incinerator) => {
    try {
      console.log('[INFO] Staking incinerator:', incinerator);
      const transactionId = await stakeIncinerator(accountName, incinerator);
      console.log('[INFO] Incinerator staked successfully. Transaction ID:', transactionId);
      
      if (transactionId) {
        await pollForTransaction(transactionId); // Poll for updates after staking
      }

    } catch (error) {
      console.error('[ERROR] Failed to stake incinerator:', error);
    }
  };

  const handleUnstakeIncinerator = async (incinerator) => {
    try {
      if (!incinerator.asset_id) {
        throw new Error('Incinerator object is missing asset_id.');
      }
      console.log('[INFO] Initiating unstake for incinerator:', incinerator);
      const transactionId = await unstakeIncinerator(accountName, incinerator);
      console.log('[INFO] Unstake transaction ID:', transactionId);
      
      if (transactionId) {
        await pollForTransaction(transactionId); // Poll for updates after unstaking
      }

    } catch (error) {
      console.error('[ERROR] Failed to unstake incinerator:', error);
    }
  };

  const showMessage = (message) => {
    setBurnMessage(message);
    setMessageVisible(true);

    setTimeout(() => {
      setMessageVisible(false);
      setBurnMessage('');
    }, 10000);
  };

const pollBurnStatus = (assetId, timeout = 10000, interval = 100) => {
  const startTime = Date.now();
  const pollInterval = setInterval(async () => {
    try {
      console.log(`[INFO] Polling burn status for asset ${assetId}...`);
      const records = await getBurnRecordsByAssetId(assetId);
      console.log('[DEBUG] Burn records:', records);

      const burnRecord = records.find((record) => record.asset_id === assetId);

      if (burnRecord) {
        if (burnRecord.status === 'burned') {
          showMessage(`Burn successful! Reward: ${burnRecord.cinder_reward}`);
          clearInterval(pollInterval); // Stop polling

          // Delay before refreshing the grid
          setTimeout(async () => {
            await fetchData(); // Refresh burnable NFTs and other data
          }, 6000); // 2-second delay
        } else if (burnRecord.status === 'failed') {
          showMessage('Burn failed. Please try again.');
          clearInterval(pollInterval);
        }
        return; // Exit the polling function
      }

      if (Date.now() - startTime > timeout) {
        showMessage('Burn process timed out. Please check later.');
        clearInterval(pollInterval); // Stop polling on timeout
      }
    } catch (error) {
      console.error('[ERROR] Polling failed:', error);
      showMessage('Error fetching burn status.');
      clearInterval(pollInterval); // Stop polling on error
    }
  }, interval);
};

const pollIncineratorData = async (interval = 500, duration = 15000) => {
  const startTime = Date.now();

  const poll = async () => {
    try {
      console.log('[INFO] Polling incinerator data...');
      await fetchData(); // Fetch incinerator data
    } catch (error) {
      console.error('[ERROR] Polling incinerator data failed:', error);
    }
  };

  const intervalId = setInterval(() => {
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime >= duration) {
      clearInterval(intervalId); // Stop polling after the duration
      console.log('[INFO] Stopped polling incinerator data.');
    } else {
      poll(); // Fetch data at each interval
    }
  }, interval);
};
const handleBurnNFT = async (slotIndex) => {
  try {
    const incinerator = slots[slotIndex];
    const nft = nftSlots[slotIndex];

    if (!nft || !incinerator) {
      alert('Please assign both an NFT and an incinerator to the slot.');
      return;
    }

    console.log('[INFO] Burning NFT:', { nft, incinerator });
    showMessage('Burn process initiated...');
    await burnNFT(accountName, nft, incinerator);

    // Remove the burned NFT from the local burnableNFTs state
    setBurnableNFTs((prevNFTs) =>
      prevNFTs.filter((burnable) => burnable.asset_id !== nft.asset_id)
    );

    // Add the burned NFT to recentlyBurnedNFTs
    setRecentlyBurnedNFTs((prev) => [...prev, nft.asset_id]);

    // Poll burn status after initiating the burn
    pollBurnStatus(nft.asset_id);

    // Clear the NFT from the slot after initiating the burn
    setNftSlots((prevSlots) => {
      const updatedSlots = [...prevSlots];
      updatedSlots[slotIndex] = null; // Clear the burned NFT slot
      return updatedSlots;
    });

    // Poll incinerator data for updates
    pollIncineratorData(1000, 10000);
  } catch (error) {
    console.error('[ERROR] Burn transaction failed:', error);
    showMessage('Failed to burn NFT. Please try again.');
  }
};


  return (
    <div className="burn-room">
      <button className="close-button" onClick={onClose}>
        &times;
      </button>
      <h2>Burn Room</h2>

      {loading && <p>Loading...</p>}

      <NFTGrid
        burnableNFTs={burnableNFTs}
        selectedNFT={selectedNFT}
        onNFTClick={(nft) => setSelectedNFT(nft)}
        onAssignNFT={(nft, index) => {
          const updatedSlots = [...nftSlots];
          updatedSlots[index] = nft;
          setNftSlots(updatedSlots);
        }}
        nftSlots={nftSlots}
      />

      {messageVisible && <div className="burn-message">{burnMessage}</div>}

      <div className="selected-nfts-container">
        <h3>Selected NFTs to Burn</h3>
        <NFTSlots nftSlots={nftSlots} slots={slots} onBurn={handleBurnNFT} />
      </div>

      <h3>Incinerator Slots</h3>

<div className="incinerator-grid">
  {slots.map((slot, index) => (
    <div
      key={index}
      className={`incinerator-card ${slot ? '' : 'empty-incinerator'}`}
      onClick={() => handleSlotClick(index)} // Opens the modal
    >
      {slot ? (
        <IncineratorDetails
          incinerator={slot}
          onRemove={() => handleRemoveIncinerator(index)}
          fetchIncineratorData={fetchData} // Pass the fetchData function here
        />
      ) : (
        <p>Slot {index + 1} - Empty</p>
      )}
    </div>
  ))}
</div>

      {showIncineratorModal && (
        <IncineratorModal
          accountName={accountName}
          stakedIncinerators={stakedIncinerators}
          unstakedIncinerators={unstakedIncinerators}
          assignedSlots={slots}
          onIncineratorSelect={handleStakedIncineratorSelect}
          onUnstakedStake={handleStakeUnstakedIncinerator} // Pass the stake handler here
          onUnstake={handleUnstakeIncinerator} // Pass the unstake handler here
          onClose={handleModalClose}
          fetchData={fetchData}
        />
      )}
    </div>
  );
};

BurnRoom.propTypes = {
  accountName: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default BurnRoom;
