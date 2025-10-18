import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { fetchBurnableNFTs } from '../services/fetchBurnableNFTs';
import { fetchUnstakedIncinerators, fetchStakedIncinerators } from '../services/incinerators';
import { stakeIncinerator, burnNFT, unstakeIncinerator, finalizeRepair } from '../services/transactionActions';
import { getRepairStatus } from '../services/repairStatusApi';
import NFTGrid from './NFTGrid';
import NFTSlots from './NFTSlots';
import IncineratorModal from './IncineratorModal';
import IncineratorDetails from './IncineratorDetails';
import RepairModal from './RepairModal';

const BurnRoom = ({ accountName, onClose }) => {
  const [burnableNFTs, setBurnableNFTs] = useState([]);
  const [slots, setSlots] = useState([null, null, null]);
  const [nftSlots, setNftSlots] = useState([null, null, null]);
  const [loading, setLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [stakedIncinerators, setStakedIncinerators] = useState([]);
  const [unstakedIncinerators, setUnstakedIncinerators] = useState([]);
  const [showIncineratorModal, setShowIncineratorModal] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);
  const [burnMessage, setBurnMessage] = useState('');
  const [messageVisible, setMessageVisible] = useState(false);
  const [recentlyBurnedNFTs, setRecentlyBurnedNFTs] = useState([]);
  const [repairTimers, setRepairTimers] = useState({});
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairIncineratorTarget, setRepairIncineratorTarget] = useState(null);
  const [repairPoints, setRepairPoints] = useState('');
  const [repairError, setRepairError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [nfts, unstaked, staked] = await Promise.all([
        fetchBurnableNFTs(accountName),
        fetchUnstakedIncinerators(accountName),
        fetchStakedIncinerators(accountName),
      ]);

      const normalizedStaked = staked.map(inc => ({ ...inc, asset_id: inc.asset_id || inc.id }));
      const stakedIds = new Set(normalizedStaked.map(inc => inc.asset_id));
      const filteredUnstaked = unstaked.filter(inc => !stakedIds.has(inc.asset_id));

      setBurnableNFTs(nfts.filter(nft => !recentlyBurnedNFTs.includes(nft.asset_id) && nft.template_id !== 294990));
      setUnstakedIncinerators(filteredUnstaked);
      setStakedIncinerators(normalizedStaked);

      setSlots(prev =>
        prev.map(slot =>
          slot ? normalizedStaked.find(inc => inc.asset_id === slot.asset_id || inc.id === slot.id) || slot : null
        )
      );

      const timerData = {};
      for (const inc of normalizedStaked) {
        const id = inc.asset_id || inc.id;
        try {
          const status = await getRepairStatus(id);
          if (status?.repair_time) {
            const repairMillis = new Date(status.repair_time + 'Z').getTime();
            const secondsLeft = Math.floor((repairMillis - Date.now()) / 1000);
            timerData[id] = Math.max(0, secondsLeft);
          }
        } catch (err) {
          if (!err.message.includes('404')) console.error(`[ERROR] Failed to fetch repair status for ${id}:`, err);
        }
      }

      setRepairTimers(timerData);
    } catch (error) {
      console.error('[ERROR] Data fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [accountName, recentlyBurnedNFTs]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRepairTimers(prev =>
        Object.fromEntries(
          Object.entries(prev).map(([id, time]) => [id, time > 0 ? time - 1 : 0])
        )
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleBurnNFT = async slotIndex => {
    const nft = nftSlots[slotIndex];
    const incinerator = slots[slotIndex];
    if (!nft || !incinerator) return alert('Please assign both NFT and incinerator.');

    try {
      setBurnMessage('Burn initiated...');
      setMessageVisible(true);
      await burnNFT(accountName, nft, incinerator);
      setBurnableNFTs(prev => prev.filter(item => item.asset_id !== nft.asset_id));
      setRecentlyBurnedNFTs(prev => [...prev, nft.asset_id]);
      setNftSlots(prev => prev.map((slot, i) => (i === slotIndex ? null : slot)));
      fetchData();
    } catch (error) {
      console.error('[ERROR] Burn failed:', error);
      setBurnMessage('Burn failed. Try again.');
    } finally {
      setTimeout(() => setMessageVisible(false), 10000);
    }
  };

  const onIncineratorSelect = incinerator => {
    const updatedSlots = [...slots];
    updatedSlots[selectedSlotIndex] = incinerator;
    setSlots(updatedSlots);
    setStakedIncinerators(prev => prev.filter(i => i.asset_id !== incinerator.asset_id));
    setShowIncineratorModal(false);
  };

  const onRepair = incinerator => {
    setRepairIncineratorTarget(incinerator);
    setRepairPoints('');
    setRepairError('');
    setShowRepairModal(true);
  };

  const handleFinalizeRepair = async incineratorId => {
    try {
      await finalizeRepair(accountName, incineratorId);
      fetchData();
    } catch (err) {
      alert(`Failed to finalize: ${err.message}`);
    }
  };

  const handleUnstake = async incinerator => {
    try {
      await unstakeIncinerator(accountName, incinerator);
      await fetchData();
    } catch (err) {
      alert(`Unstake failed: ${err.message}`);
    }
  };

  const handleUnstakedStake = async (incinerator) => {
    const inc = { ...incinerator, asset_id: incinerator.asset_id || incinerator.id };
    try {
      await stakeIncinerator(accountName, inc);
      await new Promise(resolve => setTimeout(resolve, 3000)); // wait for indexer
      await fetchData();
    } catch (err) {
      console.error('[ERROR] Staking failed:', err);
      alert(`Staking failed: ${err.message}`);
    }
  };

  return (
    <div className="burn-room">
      <button className="close-button" onClick={onClose}>&times;</button>
      <h2>Burn Room</h2>

      <NFTGrid
        burnableNFTs={burnableNFTs}
        selectedNFT={selectedNFT}
        onNFTClick={setSelectedNFT}
        onAssignNFT={(nft, index) => setNftSlots(prev => prev.map((slot, i) => (i === index ? nft : slot)))}
        nftSlots={nftSlots}
      />

      {messageVisible && <div className="burn-message">{burnMessage}</div>}

      <NFTSlots nftSlots={nftSlots} slots={slots} onBurn={handleBurnNFT} />

      <h3>Incinerator Slots</h3>
      <div className="incinerator-grid">
        {slots.map((slot, index) => {
          const id = slot?.asset_id || slot?.id;
          const seconds = repairTimers[id];
          const showFinalize = seconds !== undefined && seconds <= 0;

          return (
            <div key={index} className={`incinerator-card ${slot ? '' : 'empty-incinerator'}`} onClick={() => { setSelectedSlotIndex(index); setShowIncineratorModal(true); }}>
              {slot ? (
                <>
                  <IncineratorDetails
                    incinerator={slot}
                    onRemove={() => setSlots(prev => prev.map((s, i) => i === index ? null : s))}
                    fetchIncineratorData={fetchData}
                    onRepair={onRepair}
                  />
                  {seconds > 0 && <div className="repair-timer">Repair in: {seconds}s</div>}
                  {showFinalize && <button className="fuel-button" onClick={() => handleFinalizeRepair(id)}>Finalize Repair</button>}
                </>
              ) : (
                <p>Slot {index + 1} - Empty</p>
              )}
            </div>
          );
        })}
      </div>

      {showIncineratorModal && (
        <IncineratorModal
          accountName={typeof accountName === 'string' ? accountName : accountName?.name || ''}
          stakedIncinerators={stakedIncinerators}
          unstakedIncinerators={unstakedIncinerators}
          assignedSlots={slots}
          onIncineratorSelect={onIncineratorSelect}
          onUnstakedStake={handleUnstakedStake}
          onUnstake={handleUnstake}
          loadFuel={() => {}}
          onClose={() => setShowIncineratorModal(false)}
          fetchData={fetchData}
          repairTimers={repairTimers}
          onFinalizeRepair={handleFinalizeRepair}
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
