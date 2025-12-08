import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import IncineratorDetails from './IncineratorDetails';
import RepairModal from './RepairModal';
import { repairIncinerator } from '../services/transactionActions';

// helper to format seconds into h/m/s
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

const IncineratorModal = ({
  accountName,
  stakedIncinerators = [],
  unstakedIncinerators = [],
  onIncineratorSelect,
  onUnstakedStake,
  onUnstake,
  onClose,
  loadFuel,
  loadEnergy,
  fetchData,
  repairTimers = {},
  onFinalizeRepair
}) => {
  const [loadingIncinerators, setLoadingIncinerators] = useState(true);
  const [incineratorError, setIncineratorError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [message, setMessage] = useState('');

  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairTarget, setRepairTarget] = useState(null);
  const [repairPoints, setRepairPoints] = useState('');
  const [repairError, setRepairError] = useState('');

  useEffect(() => {
    setLoadingIncinerators(true);
    setIncineratorError('');
    const timeout = setTimeout(() => {
      if (!stakedIncinerators.length && !unstakedIncinerators.length) {
        setIncineratorError('Failed to load incinerators.');
        setLoadingIncinerators(false);
      }
    }, 20000);
    if (stakedIncinerators.length + unstakedIncinerators.length > 0) {
      clearTimeout(timeout);
      setLoadingIncinerators(false);
    }
    return () => clearTimeout(timeout);
  }, [stakedIncinerators, unstakedIncinerators]);

  const pollUntilInList = async (targetId, isInListFn, timeout = 10000, interval = 2000) => {
    setIsPolling(true);
    const start = Date.now();
    while (Date.now() - start < timeout) {
      await fetchData();
      if (isInListFn(targetId)) break;
      await new Promise(res => setTimeout(res, interval));
    }
    setIsPolling(false);
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
      setRepairError(`Enter a value between 1 and ${maxNeeded}.`);
      return;
    }
    setIsLoading(true);
    setMessage('Repair in progress…');
    try {
      await repairIncinerator(
        accountName,
        repairTarget.asset_id || repairTarget.id,
        pts
      );
      setMessage('Repair sent, waiting on-chain.');
      setShowRepairModal(false);
      await fetchData();
    } catch (err) {
      console.error('[ERROR] Repair failed:', err);
      setRepairError(err.message || 'Repair failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepairCancel = () => {
    setShowRepairModal(false);
    setRepairError('');
  };

  const handleStakeClick = async (e, inc) => {
    e.stopPropagation();
    setIsLoading(true);
    setMessage('Staking in progress...');
    try {
      await onUnstakedStake(inc);
      setMessage('Waiting for incinerator to appear in staked list...');
      const targetId = inc.asset_id || inc.id;
      await pollUntilInList(
        targetId,
        id => stakedIncinerators.some(i => i.asset_id === id || i.id === id)
      );
      setMessage('Staked!');
    } catch (err) {
      console.error('[ERROR] Stake failed:', err);
      setMessage(`Error staking: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnstakeClick = async (e, inc) => {
    e.stopPropagation();
    if (!window.confirm('Unstake? Fuel and energy reset to 0. Cannot undo.')) return;
    setIsLoading(true);
    setMessage('Unstaking in progress...');
    try {
      await onUnstake(inc);
      setMessage('Waiting for incinerator to return to unstaked list...');
      const targetId = inc.asset_id || inc.id;
      await pollUntilInList(
        targetId,
        id => unstakedIncinerators.some(i => i.asset_id === id || i.id === id)
      );
      setMessage('Unstaked!');
    } catch (err) {
      console.error('[ERROR] Unstake failed:', err);
      setMessage(`Error unstaking: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setRepairError('');
    onClose();
    fetchData();
  };

  const availableStaked = stakedIncinerators;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Select an Incinerator</h3>
        <button className="close-button" onClick={handleClose}>&times;</button>

        {loadingIncinerators && !isPolling ? (
          <div className="loading-overlay">
            <div className="loading-message">🔄 Loading incinerators...</div>
          </div>
        ) : incineratorError ? (
          <div className="error-overlay">
            <p>{incineratorError}</p>
            <button onClick={fetchData}>Retry</button>
            <button onClick={handleClose}>Close</button>
          </div>
        ) : (
          <>
            <div className="staked-section">
              <h4>Staked Incinerators</h4>
              <div className="incinerator-grid">
                {availableStaked.map(inc => {
                  const id = inc.asset_id || inc.id;
                  const seconds = repairTimers[id];
                  const showFinalize = seconds !== undefined && seconds <= 0;
                  return (
                    <div
                      key={id}
                      className="incinerator-card"
                      onClick={() => onIncineratorSelect(inc)}
                    >
                      <IncineratorDetails
                        incinerator={inc}
                        fetchIncineratorData={fetchData}
                        showButtons
                        onRepair={() => handleRepairClick(inc)}
                        onFuelLoad={() => loadFuel(inc)}
                        onEnergyLoad={() => loadEnergy(inc)}
                      />
                      {seconds > 0 && (
                        <p className="repair-timer">
                          Repair in progress: {formatSeconds(seconds)} remaining
                        </p>
                      )}
                      {showFinalize && (
                        <button
                          className="finalize-button"
                          disabled={isLoading}
                          onClick={e => {
                            e.stopPropagation();
                            onFinalizeRepair(id);
                          }}
                        >
                          Finalize Repair
                        </button>
                      )}
                      {inc.durability === 500 && (
                        <button
                          className="unstake-button"
                          disabled={isLoading}
                          onClick={e => handleUnstakeClick(e, inc)}
                        >
                          Unstake
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="unstaked-section">
              <h4>Unstaked Incinerators</h4>
              <div className="incinerator-grid">
                {unstakedIncinerators.map(inc => (
                  <div key={inc.asset_id || inc.id} className="incinerator-card">
                    <IncineratorDetails
                      incinerator={inc}
                      fetchIncineratorData={fetchData}
                      showButtons={false}
                    />
                    <button
                      className="stake-button"
                      disabled={isLoading}
                      onClick={e => handleStakeClick(e, inc)}
                    >
                      Stake
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {showRepairModal && (
          <RepairModal
            repairPoints={repairPoints}
            setRepairPoints={setRepairPoints}
            repairError={repairError}
            setRepairError={setRepairError}
            onMaxClick={() => {
              const needed = repairTarget ? 500 - repairTarget.durability : 0;
              setRepairPoints(needed.toString());
            }}
            onCancel={handleRepairCancel}
            onConfirm={handleRepairConfirm}
            maxPoints={repairTarget ? 500 - repairTarget.durability : 0}
          />
        )}
      </div>
    </div>
  );
};

IncineratorModal.propTypes = {
  accountName: PropTypes.string.isRequired,
  stakedIncinerators: PropTypes.array.isRequired,
  unstakedIncinerators: PropTypes.array.isRequired,
  onIncineratorSelect: PropTypes.func.isRequired,
  onUnstakedStake: PropTypes.func.isRequired,
  onUnstake: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  loadFuel: PropTypes.func.isRequired,
  loadEnergy: PropTypes.func.isRequired,
  fetchData: PropTypes.func.isRequired,
  repairTimers: PropTypes.object,
  onFinalizeRepair: PropTypes.func.isRequired
};

export default IncineratorModal;
