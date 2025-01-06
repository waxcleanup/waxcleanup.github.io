import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { fetchBurnableNFTs } from '../services/fetchBurnableNFTs';
import { fetchUnstakedIncinerators, fetchStakedIncinerators } from '../services/incinerators';
import { stakeIncinerator, burnNFT, unstakeIncinerator } from '../services/transactionActions';
import { getBurnRecordsByAssetId } from '../services/burnRecordsApi';
import './BurnRoom.css';
import NFTGrid from './NFTGrid';
import NFTSlots from './NFTSlots';
import IncineratorModal from './IncineratorModal';
import IncineratorDetails from './IncineratorDetails';

const BurnRoom = ({ accountName, onClose }) => {
  const [burnableNFTs, setBurnableNFTs] = useState([]);
  const [slots, setSlots] = useState([null, null, null]);
  const [nftSlots, setNftSlots] = useState([null, null, null]);
  const [loading, setLoading] = useState(true);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [stakedIncinerators, setStakedIncinerators] = useState([]);
  const [unstakedIncinerators, setUnstakedIncinerators] = useState([]);
  const [showIncineratorModal, setShowIncineratorModal] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);
  const [burnMessage, setBurnMessage] = useState('');
  const [messageVisible, setMessageVisible] = useState(false);
  const [recentlyBurnedNFTs, setRecentlyBurnedNFTs] = useState([]);
  const [fetching, setFetching] = useState(false);

  const fetchData = useCallback(async () => {
    if (fetching) return; // Prevent overlapping fetches

    setFetching(true);
    setLoading(true);
    try {
      const [nfts, unstaked, staked] = await Promise.all([
        fetchBurnableNFTs(accountName),
        fetchUnstakedIncinerators(accountName),
        fetchStakedIncinerators(accountName),
      ]);

      const normalizedStaked = staked.map((inc) => ({
        ...inc,
        asset_id: inc.asset_id || inc.id, // Normalize `asset_id`
      }));

      const filteredNFTs = nfts.filter(
        (nft) =>
          !recentlyBurnedNFTs.includes(nft.asset_id) &&
          nft.template_id !== 294990 // Exclude template ID 294990
      );

      setBurnableNFTs(filteredNFTs);
      setUnstakedIncinerators(unstaked);
      setStakedIncinerators(normalizedStaked);

      setSlots((prevSlots) =>
        prevSlots.map((slot) => {
          if (!slot) return null;
          return normalizedStaked.find((inc) => inc.asset_id === slot.asset_id) || null;
        })
      );

      console.log('[INFO] Data fetched successfully.');
    } catch (error) {
      console.error('[ERROR] Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [accountName, recentlyBurnedNFTs, fetching]);

  const safeFetchData = async () => {
    if (!fetching) {
      await fetchData();
    }
  };

  useEffect(() => {
    safeFetchData(); // Fetch data on component mount
  }, [safeFetchData]);

  const handleStakeUnstakedIncinerator = async (incinerator) => {
    try {
      const transactionId = await stakeIncinerator(accountName, incinerator);
      if (transactionId) {
        console.log('[INFO] Staking successful. Refreshing data...');
        await safeFetchData();
      }
    } catch (error) {
      console.error('[ERROR] Staking failed:', error);
    }
  };

  const handleUnstakeIncinerator = async (incinerator) => {
    try {
      const transactionId = await unstakeIncinerator(accountName, incinerator);
      if (transactionId) {
        console.log('[INFO] Unstaking successful. Refreshing data...');
        await safeFetchData();
      }
    } catch (error) {
      console.error('[ERROR] Unstaking failed:', error);
    }
  };

  const pollForTransaction = async (transactionId, timeout = 15000, interval = 1000) => {
    const startTime = Date.now();

    const poll = async () => {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > timeout) {
        console.warn('[WARNING] Polling timed out.');
        clearInterval(pollInterval);
        return;
      }

      console.log('[INFO] Polling for transaction update...');
      await safeFetchData();
    };

    const pollInterval = setInterval(poll, interval);
    setTimeout(() => clearInterval(pollInterval), timeout);
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

      setBurnableNFTs((prevNFTs) =>
        prevNFTs.filter((burnable) => burnable.asset_id !== nft.asset_id)
      );

      setRecentlyBurnedNFTs((prev) => [...prev, nft.asset_id]);

      setNftSlots((prevSlots) => {
        const updatedSlots = [...prevSlots];
        updatedSlots[slotIndex] = null;
        return updatedSlots;
      });

      pollForTransaction(nft.asset_id);
    } catch (error) {
      console.error('[ERROR] Burn transaction failed:', error);
      showMessage('Failed to burn NFT. Please try again.');
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
            onClick={() => {
              setSelectedSlotIndex(index);
              setShowIncineratorModal(true);
            }}
          >
            {slot ? (
              <IncineratorDetails
                incinerator={slot}
                onRemove={() => {
                  const updatedSlots = [...slots];
                  updatedSlots[index] = null;
                  setSlots(updatedSlots);
                }}
                fetchIncineratorData={safeFetchData}
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
          onIncineratorSelect={(incinerator) => {
            const updatedSlots = [...slots];
            updatedSlots[selectedSlotIndex] = incinerator;
            setSlots(updatedSlots);
            setStakedIncinerators((prev) =>
              prev.filter((i) => i.asset_id !== incinerator.asset_id)
            );
            setShowIncineratorModal(false);
          }}
          onUnstakedStake={handleStakeUnstakedIncinerator}
          onUnstake={handleUnstakeIncinerator}
          onClose={() => setShowIncineratorModal(false)}
          fetchData={safeFetchData}
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
