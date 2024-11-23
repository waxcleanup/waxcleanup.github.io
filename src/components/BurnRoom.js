import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { fetchBurnableNFTs, fetchProposals } from '../services/api';
import { fetchUnstakedIncinerators, fetchStakedIncinerators } from '../services/incinerators';
import { stakeIncinerator, burnNFT } from '../services/transactionActions';
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
  const [proposals, setProposals] = useState([]);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [stakedIncinerators, setStakedIncinerators] = useState([]);
  const [unstakedIncinerators, setUnstakedIncinerators] = useState([]);
  const [showIncineratorModal, setShowIncineratorModal] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);

  // Fetch all required data on mount or when accountName changes
  useEffect(() => {
    if (accountName) {
      fetchData();
    }
  }, [accountName]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [nfts, fetchedProposals, unstaked, staked] = await Promise.all([
        fetchBurnableNFTs(accountName),
        fetchProposals(),
        fetchUnstakedIncinerators(accountName),
        fetchStakedIncinerators(accountName),
      ]);
      setBurnableNFTs(nfts);
      setProposals(fetchedProposals.filter((proposal) => proposal.status === 'approved'));
      setUnstakedIncinerators(unstaked);
      setStakedIncinerators(staked);

      console.log('Fetched data:', {
        nfts,
        proposals: fetchedProposals,
        unstakedIncinerators: unstaked,
        stakedIncinerators: staked,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
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

  const handleStakedIncineratorSelect = (incinerator) => {
    const updatedSlots = [...slots];
    updatedSlots[selectedSlotIndex] = incinerator;
    setSlots(updatedSlots);

    setStakedIncinerators((prev) =>
      prev.filter((i) => i.asset_id !== incinerator.asset_id)
    );

    setShowIncineratorModal(false);
  };

  const handleStakeUnstakedIncinerator = async (incinerator) => {
    try {
      if (!accountName) {
        console.error('Account name is missing. User must log in.');
        alert('Please log in to stake an incinerator.');
        return;
      }
      console.log('Staking incinerator:', incinerator);
      const transactionId = await stakeIncinerator(accountName, incinerator);
      console.log('Staked successfully. Transaction ID:', transactionId);
      await fetchData();
    } catch (error) {
      console.error('Error staking incinerator:', error);
    }
  };

  const handleBurnNFT = async (slotIndex) => {
    try {
      const incinerator = slots[slotIndex];
      const nft = nftSlots[slotIndex];

      if (!nft || !incinerator) {
        alert('Please assign both an NFT and an incinerator to the slot.');
        return;
      }

      console.log('Burning NFT:', { nft, incinerator });
      const transactionId = await burnNFT(accountName, nft, incinerator);
      console.log('NFT burned successfully. Transaction ID:', transactionId);

      await fetchData();

      const updatedNFTSlots = [...nftSlots];
      updatedNFTSlots[slotIndex] = null;
      setNftSlots(updatedNFTSlots);
    } catch (error) {
      console.error('Error during burn transaction:', error);
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading Burn Room... Please wait.</div>;
  }

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
          onBurn={(nft, incinerator) => handleBurnNFT(slots.indexOf(incinerator))}
        />
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
            <IncineratorDetails
              incinerator={slot}
              onFuelLoad={() => console.log('Load fuel triggered')}
              onEnergyLoad={() => console.log('Load energy triggered')}
              onRepair={() => console.log('Repair durability triggered')}
              onRemove={() => handleRemoveIncinerator(index)}
              showButtons
            />
          </div>
        ))}
      </div>

      {/* Incinerator Modal */}
      {showIncineratorModal && (
        <IncineratorModal
	  accountName={typeof accountName === 'object' ? accountName.value : accountName} // Ensure string type
	  stakedIncinerators={stakedIncinerators}
	  unstakedIncinerators={unstakedIncinerators}
	  onIncineratorSelect={handleStakedIncineratorSelect}
	  onUnstakedStake={handleStakeUnstakedIncinerator}
	  onClose={() => setShowIncineratorModal(false)}
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
