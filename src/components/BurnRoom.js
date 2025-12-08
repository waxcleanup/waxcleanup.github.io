// src/components/BurnRoom.js
import React, { useCallback, useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { fetchBurnableNFTs, invalidateBurnableNFTCache } from '../services/fetchBurnableNFTs';
import { fetchUnstakedIncinerators, fetchStakedIncinerators } from '../services/incinerators';
import {
  stakeIncinerator,
  burnNFT,
  unstakeIncinerator,
  finalizeRepair,
  repairIncinerator
} from '../services/transactionActions';
import { getRepairStatus } from '../services/repairStatusApi';
import NFTGrid from './NFTGrid';
import NFTSlots from './NFTSlots';
import IncineratorModal from './IncineratorModal';
import IncineratorDetails from './IncineratorDetails';
import RepairModal from './RepairModal';

const BurnRoom = ({ accountName, onClose }) => {
  // --- State ---
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [burnableNFTs, setBurnableNFTs] = useState([]);
  const [slots, setSlots] = useState([null, null, null]);
  const [nftSlots, setNftSlots] = useState([null, null, null]);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [stakedIncinerators, setStakedIncinerators] = useState([]);
  const [unstakedIncinerators, setUnstakedIncinerators] = useState([]);
  const [repairTimers, setRepairTimers] = useState({});
  const [showIncineratorModal, setShowIncineratorModal] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);
  const [burnMessage, setBurnMessage] = useState('');
  const [messageVisible, setMessageVisible] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairTarget, setRepairTarget] = useState(null);
  const [repairPoints, setRepairPoints] = useState('');
  const [repairError, setRepairError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const imgCache = useRef(new Map());

  // Lock background scroll while modal is open + close on ESC
  useEffect(() => {
    document.body.classList.add('modal-open');
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // --- Helper: Fetch repair timers ---
  const fetchRepairTimers = useCallback(async incs => {
    const map = {};
    await Promise.all(
      incs.map(async inc => {
        try {
          const status = await getRepairStatus(inc.asset_id);
          const startMs = Date.parse(status.repair_time + 'Z');
          const endMs = startMs + status.repair_points * 60000;
          map[inc.asset_id] = Math.max(Math.ceil((endMs - Date.now()) / 1000), 0);
        } catch (e) {
          console.error('[ERROR] getRepairStatus failed for', inc.asset_id, e);
        }
      })
    );
    setRepairTimers(map);
  }, []);

  // --- Helper: format countdown ---
  const formatSeconds = secs => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const parts = [];
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  // --- Fetch incinerators + timers ---
  const fetchIncineratorData = useCallback(async () => {
    try {
      const [unstaked, staked] = await Promise.all([
        fetchUnstakedIncinerators(accountName),
        fetchStakedIncinerators(accountName)
      ]);
      const normalized = staked.map(inc => {
        const asset_id = inc.asset_id || inc.id;
        const img = imgCache.current.get(asset_id) || inc.img || inc.imgCid || 'default-placeholder.png';
        imgCache.current.set(asset_id, img);
        return { ...inc, asset_id, img };
      });
      setStakedIncinerators(normalized);
      setUnstakedIncinerators(unstaked.filter(i => !normalized.some(n => n.asset_id === i.asset_id)));
      setSlots(prev => prev.map(slot => slot ? (normalized.find(n => n.asset_id === slot.asset_id) || null) : null));
      await fetchRepairTimers(normalized);
    } catch (err) {
      console.error('[ERROR] Incinerator fetch failed:', err);
    }
  }, [accountName, fetchRepairTimers]);

  // --- Fetch NFTs + incinerators on mount ---
  const fetchData = useCallback(async () => {
    setLoadingNFTs(true);
    try {
      const nfts = await fetchBurnableNFTs(accountName);
      setBurnableNFTs(nfts.filter(n => n.template_id !== 294990));
    } catch (err) {
      console.error('[ERROR] NFT fetch failed:', err);
    } finally {
      setLoadingNFTs(false);
    }
    await fetchIncineratorData();
  }, [accountName, fetchIncineratorData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Live countdown updater ---
  useEffect(() => {
    if (!Object.keys(repairTimers).length) return;
    const interval = setInterval(() => {
      setRepairTimers(prev => {
        const next = {};
        Object.entries(prev).forEach(([id, secs]) => {
          next[id] = secs > 0 ? secs - 1 : 0;
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [repairTimers]);

  // --- Handlers ---
  const handleBurnNFT = async idx => {
    const nft = nftSlots[idx];
    const inc = slots[idx];
    if (!nft || !inc) return alert('Assign both NFT and incinerator');
    try {
      setBurnMessage('Burn initiated…');
      setMessageVisible(true);
      await burnNFT(accountName, nft, inc);
      setBurnableNFTs(prev => prev.filter(i => i.asset_id !== nft.asset_id));
      setNftSlots(prev => prev.map((s, i) => (i === idx ? null : s)));
      invalidateBurnableNFTCache();
      await fetchIncineratorData();
    } catch (err) {
      console.error('[ERROR] Burn failed:', err);
      setBurnMessage('Burn failed.');
    } finally {
      setTimeout(() => setMessageVisible(false), 10000);
    }
  };

  // 🔥 Only change: prevent assigning the same incinerator to more than one slot
  const onIncineratorSelect = inc => {
    const alreadyAssigned = slots.some(
      slot => slot && slot.asset_id === inc.asset_id
    );
    if (alreadyAssigned) {
      alert('This incinerator is already assigned to another slot.');
      setShowIncineratorModal(false);
      return;
    }

    setSlots(prev => prev.map((s, i) => (i === selectedSlotIndex ? inc : s)));
    setStakedIncinerators(prev => prev.filter(i => i.asset_id !== inc.asset_id));
    setShowIncineratorModal(false);
  };

  const handleRepairClick = inc => {
    setRepairTarget(inc);
    setRepairPoints('');
    setRepairError('');
    setShowRepairModal(true);
  };

  const handleRepairConfirm = async () => {
    const maxNeeded = repairTarget ? 500 - repairTarget.durability : 0;
    const pts = parseInt(repairPoints, 10);
    if (!Number.isInteger(pts) || pts < 1 || pts > maxNeeded) {
      setRepairError(`Enter 1–${maxNeeded}`);
      return;
    }
    await repairIncinerator(accountName, repairTarget.asset_id, pts);
    await fetchIncineratorData();
    setShowRepairModal(false);
  };

  const handleRepairCancel = () => setShowRepairModal(false);

  const handleFinalizeRepair = async id => {
    setIsProcessing(true);
    setBurnMessage('Finalizing repair...');
    setMessageVisible(true);
    try {
      await finalizeRepair(accountName, id);
      await fetchIncineratorData();
      setBurnMessage('Repair finalized!');
    } catch (err) {
      console.error('[ERROR] Finalize repair failed:', err);
      alert(`Finalize repair failed: ${err.response?.data?.message || err.message}`);
      setBurnMessage('Finalize failed.');
    } finally {
      setTimeout(() => setMessageVisible(false), 5000);
      setIsProcessing(false);
    }
  };

  const handleUnstake = async inc => {
    await unstakeIncinerator(accountName, inc);
    await fetchIncineratorData();
  };

  const handleUnstakedStake = async inc => {
    await stakeIncinerator(accountName, inc);
    await fetchIncineratorData();
  };

  // Close modal when clicking the dimmed overlay, but not the panel
  const onOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // --- JSX ---
  return (
    <div className="modal-overlay" onClick={onOverlayClick}>
      <div className="modal-content burn-room" onClick={e => e.stopPropagation()}>
        {/* Sticky header (non-scrolling) */}
        <div className="modal-header">
          <h2 className="burn-room-title">Burn Room</h2>
          <button className="close-button" onClick={onClose} aria-label="Close Burn Room">&times;</button>
        </div>

        {/* Scrollable area */}
        <div className="modal-body">
          <NFTGrid
            burnableNFTs={burnableNFTs}
            selectedNFT={selectedNFT}
            onNFTClick={setSelectedNFT}
            onAssignNFT={(nft, i) => setNftSlots(prev => prev.map((s, idx) => (idx === i ? nft : s)))}
            nftSlots={nftSlots}
            loading={loadingNFTs}
          />

          {messageVisible && <div className="burn-message">{burnMessage}</div>}

          <NFTSlots nftSlots={nftSlots} slots={slots} onBurn={handleBurnNFT} />

          <h3>Incinerator Slots</h3>
          <div className="incinerator-grid">
            {slots.map((slot, i) => (
              <div
                key={i}
                className={`incinerator-card ${slot ? '' : 'empty-incinerator'}`}
                onClick={() => { setSelectedSlotIndex(i); setShowIncineratorModal(true); }}
              >
                {slot ? (
                  <>
                    <IncineratorDetails
                      incinerator={slot}
                      fetchIncineratorData={fetchIncineratorData}
                      showButtons
                      onRepair={() => handleRepairClick(slot)}
                      onRemove={() => {
                        setSlots(prev => prev.map((s, idx) => (idx === i ? null : s)));
                        setStakedIncinerators(prev => [...prev, slot]);
                      }}
                    />
                    {repairTimers[slot.asset_id] > 0 && (
                      <p className="repair-timer">Repair in progress: {formatSeconds(repairTimers[slot.asset_id])} remaining</p>
                    )}
                    {repairTimers[slot.asset_id] === 0 && (
                      <button className="finalize-button" onClick={() => handleFinalizeRepair(slot.asset_id)} disabled={isProcessing}>
                        {isProcessing ? 'Processing...' : 'Finalize Repair'}
                      </button>
                    )}
                  </>
                ) : (
                  <p>Slot {i + 1} - Empty</p>
                )}
              </div>
            ))}
          </div>

          {showIncineratorModal && (
            <IncineratorModal
              accountName={accountName}
              stakedIncinerators={stakedIncinerators}
              unstakedIncinerators={unstakedIncinerators}
              assignedSlots={slots}              //* you can ignore this prop if not used *//
              onIncineratorSelect={onIncineratorSelect}
              onUnstakedStake={handleUnstakedStake}
              onUnstake={handleUnstake}
              loadFuel={async () => await fetchIncineratorData()}
              loadEnergy={async () => await fetchIncineratorData()}
              fetchData={fetchIncineratorData}
              repairTimers={repairTimers}
              onFinalizeRepair={handleFinalizeRepair}
              onClose={() => setShowIncineratorModal(false)}
            />
          )}

          {showRepairModal && (
            <RepairModal
              repairPoints={repairPoints}
              setRepairPoints={setRepairPoints}
              repairError={repairError}
              setRepairError={setRepairError}
              onMaxClick={() => setRepairPoints((500 - (repairTarget?.durability || 0)).toString())}
              onCancel={handleRepairCancel}
              onConfirm={handleRepairConfirm}
              maxPoints={repairTarget ? 500 - repairTarget.durability : 0}
            />
          )}
        </div>
      </div>
    </div>
  );
};

BurnRoom.propTypes = {
  accountName: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired
};

export default BurnRoom;

