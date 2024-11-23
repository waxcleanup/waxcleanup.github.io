import React from 'react';
import PropTypes from 'prop-types';
import IncineratorDetails from './IncineratorDetails';

const StakeButton = ({ incinerator, onStake }) => {
  const handleStakeClick = () => {
    if (!incinerator) {
      alert('No incinerator selected for staking.');
      return;
    }
    onStake(incinerator);
  };

  return (
    <button
      className="stake-button"
      onClick={(e) => {
        e.stopPropagation(); // Prevent triggering other events
        handleStakeClick();
      }}
    >
      Stake
    </button>
  );
};

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
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Select an Incinerator</h3>
        <button className="close-button" onClick={onClose}>
          &times;
        </button>

        {/* Staked Incinerators Section */}
        <div className="staked-section">
          <h4>Staked Incinerators</h4>
          <div className="incinerator-grid">
            {stakedIncinerators.length > 0 ? (
              stakedIncinerators.map((incinerator) => (
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
                    showButtons={false}
                  />
                  {/* Removed the redundant Asset ID display */}
                </div>
              ))
            ) : (
              <p>No staked incinerators available. Stake an incinerator to start burning NFTs.</p>
            )}
          </div>
        </div>

        {/* Unstaked Incinerators Section */}
        <div className="unstaked-section">
          <h4>Unstaked Incinerators</h4>
          <p className="staking-note">
            Staking locks your incinerator for use in burning NFTs. Once staked, you will need to unstake it if you want to transfer or reuse it elsewhere.
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
                        <StakeButton
                          incinerator={incinerator}
                          onStake={onUnstakedStake}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No unstaked incinerators available. Acquire or unstake an incinerator to proceed.</p>
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
};

export default IncineratorModal;
