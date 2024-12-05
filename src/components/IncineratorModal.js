import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import IncineratorDetails from './IncineratorDetails';

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
  repairDurability,
  assignedSlots = [],
  fetchData,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Filter staked incinerators to exclude those already assigned to slots
  const availableStakedIncinerators = stakedIncinerators.filter(
    (incinerator) =>
      !assignedSlots.some((slot) => slot && slot.asset_id === incinerator.asset_id)
  );

  useEffect(() => {
    console.log('[INFO] Staked Incinerators:', stakedIncinerators);
    console.log('[INFO] Unstaked Incinerators:', unstakedIncinerators);
  }, [stakedIncinerators, unstakedIncinerators]);

  const handleStake = async (e, incinerator) => {
    e.stopPropagation();
    setIsLoading(true);
    setMessage('Staking in progress...');
    try {
      const transactionId = await onUnstakedStake(incinerator);
      if (!transactionId) throw new Error('Staking transaction failed. No transaction ID.');

      console.log('[INFO] Successfully staked. Transaction ID:', transactionId);
      setMessage('Incinerator staked successfully!');
      await fetchData(); // Refresh data immediately after staking
    } catch (error) {
      console.error('[ERROR] Staking failed:', error);
      setMessage(`Error staking: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnstake = async (e, incinerator) => {
    e.stopPropagation();
    setIsLoading(true);
    setMessage('Unstaking in progress...');
    try {
      const transactionId = await onUnstake(incinerator);
      if (!transactionId) throw new Error('Unstaking transaction failed. No transaction ID.');

      console.log('[INFO] Successfully unstaked. Transaction ID:', transactionId);
      setMessage('Incinerator unstaked successfully!');
      await fetchData(); // Refresh data immediately after unstaking
    } catch (error) {
      console.error('[ERROR] Unstaking failed:', error);
      setMessage(`Error unstaking: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle fuel load action
  const handleFuelLoad = async (e, incinerator) => {
    e.stopPropagation();
    setIsLoading(true);
    setMessage('Loading fuel...');
    try {
      const transactionId = await loadFuel(incinerator);
      if (!transactionId) throw new Error('Fuel loading transaction failed.');

      console.log('[INFO] Fuel loaded. Transaction ID:', transactionId);
      setMessage('Fuel loaded successfully!');
      await fetchData(); // Refresh data immediately after fuel loading
    } catch (error) {
      console.error('[ERROR] Fuel loading failed:', error);
      setMessage(`Error loading fuel: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle energy load action
  const handleEnergyLoad = async (e, incinerator) => {
    e.stopPropagation();
    setIsLoading(true);
    setMessage('Loading energy...');
    try {
      const transactionId = await loadEnergy(incinerator);
      if (!transactionId) throw new Error('Energy loading transaction failed.');

      console.log('[INFO] Energy loaded. Transaction ID:', transactionId);
      setMessage('Energy loaded successfully!');
      await fetchData(); // Refresh data immediately after energy loading
    } catch (error) {
      console.error('[ERROR] Energy loading failed:', error);
      setMessage(`Error loading energy: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle durability repair action
  const handleRepairDurability = async (e, incinerator) => {
    e.stopPropagation();
    setIsLoading(true);
    setMessage('Repairing durability...');
    try {
      const transactionId = await repairDurability(incinerator);
      if (!transactionId) throw new Error('Repairing durability transaction failed.');

      console.log('[INFO] Durability repaired. Transaction ID:', transactionId);
      setMessage('Durability repaired successfully!');
      await fetchData(); // Refresh data immediately after durability repair
    } catch (error) {
      console.error('[ERROR] Repair failed:', error);
      setMessage(`Error repairing durability: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    console.log('[DEBUG] Closing modal and refreshing data.');
    onClose();
    fetchData(); // Ensure data is refreshed when closing modal (even though modal auto-updates)
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Select an Incinerator</h3>
        <button className="close-button" onClick={handleClose}>
          &times;
        </button>

        {isLoading && <p className="loading-message">{message}</p>}

        {/* Staked Incinerators Section */}
        <div className="staked-section">
          <h4>Staked Incinerators</h4>
          <div className="incinerator-grid">
            {availableStakedIncinerators.length > 0 ? (
              availableStakedIncinerators.map((incinerator) => (
                <div
                  key={incinerator.asset_id || incinerator.id}
                  className="incinerator-card"
                  onClick={() => onIncineratorSelect(incinerator)}
                >
                  <IncineratorDetails
                    incinerator={incinerator}
                    onFuelLoad={handleFuelLoad}
                    onEnergyLoad={handleEnergyLoad}
                    onRepair={handleRepairDurability}
                    fetchIncineratorData={fetchData}
                    showButtons={false}
                  />
                  {incinerator.durability === 500 && (
                    <button
                      className="unstake-button"
                      onClick={(e) => handleUnstake(e, incinerator)}
                    >
                      Unstake
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p>No available staked incinerators. Stake or unstake an incinerator to proceed.</p>
            )}
          </div>
        </div>

        {/* Unstaked Incinerators Section */}
        <div className="unstaked-section">
          <h4>Unstaked Incinerators</h4>
          <p className="staking-note">
            Staking locks your incinerator for use in burning NFTs.
          </p>
          {unstakedIncinerators.length > 0 ? (
            <div className="table-container">
              <table className="incinerator-table">
                <thead>
                  <tr>
                    <th>Asset ID</th>
                    <th>Name</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {unstakedIncinerators.map((incinerator) => (
                    <tr key={incinerator.asset_id || incinerator.id}>
                      <td>{incinerator.asset_id || incinerator.id}</td>
                      <td>{incinerator.name || 'Unnamed Incinerator'}</td>
                      <td>
                        <button
                          className="stake-button"
                          onClick={(e) => handleStake(e, incinerator)}
                        >
                          Stake
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No unstaked incinerators available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

IncineratorModal.propTypes = {
  accountName: PropTypes.string.isRequired,
  stakedIncinerators: PropTypes.arrayOf(
    PropTypes.shape({
      asset_id: PropTypes.string,
      id: PropTypes.string,
      name: PropTypes.string,
      durability: PropTypes.number,
    })
  ).isRequired,
  unstakedIncinerators: PropTypes.arrayOf(
    PropTypes.shape({
      asset_id: PropTypes.string,
      id: PropTypes.string,
      name: PropTypes.string,
    })
  ).isRequired,
  onIncineratorSelect: PropTypes.func.isRequired,
  onUnstakedStake: PropTypes.func.isRequired,
  onUnstake: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  loadFuel: PropTypes.func,
  loadEnergy: PropTypes.func,
  repairDurability: PropTypes.func,
  assignedSlots: PropTypes.array,
  fetchData: PropTypes.func.isRequired,
};

export default IncineratorModal;
