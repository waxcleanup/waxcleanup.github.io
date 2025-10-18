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
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [selectedIncinerator, setSelectedIncinerator] = useState(null);
  const [fuelInput, setFuelInput] = useState(0);

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
      await fetchData();
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
      await fetchData();
    } catch (error) {
      console.error('[ERROR] Unstaking failed:', error);
      setMessage(`Error unstaking: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFuelLoad = async (amount) => {
    if (!selectedIncinerator) return;

    setIsLoading(true);
    setMessage('Loading fuel...');
    try {
      const transactionId = await loadFuel(selectedIncinerator, amount);
      if (!transactionId) throw new Error('Fuel loading transaction failed.');

      console.log('[INFO] Fuel loaded. Transaction ID:', transactionId);
      setMessage('Fuel loaded successfully!');
      await fetchData();
    } catch (error) {
      console.error('[ERROR] Fuel loading failed:', error);
      setMessage(`Error loading fuel: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setShowFuelModal(false);
    }
  };

  const handleFuelInputChange = (e) => {
    const maxLoad = selectedIncinerator.max_fuel - selectedIncinerator.fuel;
    const value = Math.min(Math.max(Number(e.target.value), 0), maxLoad); // Clamp value
    setFuelInput(value);
  };

  const handleMaxLoad = () => {
    const maxLoad = selectedIncinerator.max_fuel - selectedIncinerator.fuel;
    handleFuelLoad(maxLoad);
  };

  const handleOpenFuelModal = (incinerator) => {
    setSelectedIncinerator(incinerator);
    setFuelInput(0); // Reset fuel input
    setShowFuelModal(true);
  };

  const handleCloseFuelModal = () => {
    setSelectedIncinerator(null);
    setFuelInput(0);
    setShowFuelModal(false);
  };

  const handleClose = () => {
    console.log('[DEBUG] Closing modal and refreshing data.');
    onClose();
    fetchData();
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
                    onFuelLoad={() => handleOpenFuelModal(incinerator)}
                    onEnergyLoad={loadEnergy}
                    onRepair={repairDurability}
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

        {/* Fuel Modal */}
        {showFuelModal && selectedIncinerator && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Load Fuel for {selectedIncinerator.name || 'Incinerator'}</h3>
              <p>
                Current Fuel: {selectedIncinerator.fuel}/
                {selectedIncinerator.max_fuel}
              </p>
              <div className="fuel-input-section">
                <input
                  type="number"
                  value={fuelInput}
                  onChange={handleFuelInputChange}
                  placeholder="Enter amount"
                  min="1"
                  max={selectedIncinerator.max_fuel - selectedIncinerator.fuel}
                />
                <button
                  onClick={handleMaxLoad}
                  className="max-load-button"
                  disabled={
                    selectedIncinerator.fuel >= selectedIncinerator.max_fuel
                  }
                >
                  Max Load ({selectedIncinerator.max_fuel - selectedIncinerator.fuel})
                </button>
              </div>
              <button
                onClick={() => handleFuelLoad(fuelInput)}
                className="load-button"
                disabled={fuelInput <= 0 || fuelInput > selectedIncinerator.max_fuel - selectedIncinerator.fuel}
              >
                Load Fuel
              </button>
              <button onClick={handleCloseFuelModal} className="close-button">
                Cancel
              </button>
            </div>
          </div>
        )}

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
      fuel: PropTypes.number,
      max_fuel: PropTypes.number,
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
  loadFuel: PropTypes.func.isRequired,
  loadEnergy: PropTypes.func,
  repairDurability: PropTypes.func,
  assignedSlots: PropTypes.array,
  fetchData: PropTypes.func.isRequired,
};

export default IncineratorModal;
