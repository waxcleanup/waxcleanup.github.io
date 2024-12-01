import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import IncineratorDetails from './IncineratorDetails';

const IncineratorModal = ({
  accountName,
  stakedIncinerators = [],
  unstakedIncinerators = [],
  onIncineratorSelect,
  onUnstakedStake,
  onClose,
  loadFuel,
  loadEnergy,
  repairDurability,
  assignedSlots = [],
  fetchData, // Ensure incinerator data refresh
}) => {
  // Filter staked incinerators to exclude those already assigned to slots
  const availableStakedIncinerators = stakedIncinerators.filter(
    (incinerator) => !assignedSlots.some((slot) => slot && slot.asset_id === incinerator.asset_id)
  );

  useEffect(() => {
    console.log('Staked Incinerators Updated:', stakedIncinerators);
    console.log('Unstaked Incinerators Updated:', unstakedIncinerators);
  }, [stakedIncinerators, unstakedIncinerators]);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Select an Incinerator</h3>
        <button className="close-button" onClick={() => { onClose(); fetchData(); }}>
          &times;
        </button>

        {/* Staked Incinerators Section */}
        <div className="staked-section">
          <h4>Staked Incinerators</h4>
          <div className="incinerator-grid">
            {availableStakedIncinerators.length > 0 ? (
              availableStakedIncinerators.map((incinerator) => (
                <div
                  key={incinerator.asset_id}
                  className="incinerator-card"
                  onClick={() => onIncineratorSelect(incinerator)}
                >
                  <IncineratorDetails
                    incinerator={incinerator}
                    onFuelLoad={loadFuel}
                    onEnergyLoad={loadEnergy}
                    onRepair={repairDurability}
                    fetchIncineratorData={fetchData} // Refresh after actions
                    showButtons={false}
                  />
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
                    <tr key={incinerator.asset_id}>
                      <td>{incinerator.asset_id}</td>
                      <td>{incinerator.name || 'Unnamed Incinerator'}</td>
                      <td>
                        <button
                          className="stake-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUnstakedStake(incinerator);
                            fetchData(); // Refresh after staking
                          }}
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
      asset_id: PropTypes.string.isRequired,
      name: PropTypes.string,
    })
  ).isRequired,
  unstakedIncinerators: PropTypes.arrayOf(
    PropTypes.shape({
      asset_id: PropTypes.string.isRequired,
      name: PropTypes.string,
    })
  ).isRequired,
  onIncineratorSelect: PropTypes.func.isRequired,
  onUnstakedStake: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  loadFuel: PropTypes.func,
  loadEnergy: PropTypes.func,
  repairDurability: PropTypes.func,
  assignedSlots: PropTypes.array,
  fetchData: PropTypes.func.isRequired, // Ensure this is passed from BurnRoom
};

export default IncineratorModal;
