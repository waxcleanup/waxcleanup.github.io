import React from 'react';
import PropTypes from 'prop-types';
import IncineratorDetails from './IncineratorDetails';

const IncineratorManagerModal = ({
  stakedIncinerators,
  unstakedIncinerators,
  assignedSlots,
  onIncineratorSelect,
  onUnstakedStake,
  onUnstake,
  onClose,
  fetchData,
}) => {
  return (
    <div className="incinerator-manager-modal">
      <button className="close-button" onClick={onClose}>
        &times;
      </button>
      <h2>Manage Incinerators</h2>

      <div className="incinerator-sections">
        {/* Staked Incinerators Section */}
        <div className="incinerator-section">
          <h3>Staked Incinerators</h3>
          <div className="incinerator-grid">
            {stakedIncinerators.map((incinerator) => (
              <IncineratorDetails
                key={incinerator.asset_id}
                incinerator={incinerator}
                onSelect={() => onIncineratorSelect(incinerator)}
                fetchData={fetchData}
              />
            ))}
          </div>
        </div>

        {/* Unstaked Incinerators Section */}
        <div className="incinerator-section">
          <h3>Unstaked Incinerators</h3>
          <div className="incinerator-grid">
            {unstakedIncinerators.map((incinerator) => (
              <IncineratorDetails
                key={incinerator.asset_id}
                incinerator={incinerator}
                onStake={() => onUnstakedStake(incinerator)}
                fetchData={fetchData}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Incinerator Slots */}
      <div className="incinerator-section">
        <h3>Assigned Incinerators</h3>
        <div className="incinerator-grid">
          {assignedSlots.map((slot, index) => (
            <div key={index} className="incinerator-card">
              {slot ? (
                <IncineratorDetails
                  incinerator={slot}
                  onRemove={() => onUnstake(slot)}
                  fetchData={fetchData}
                />
              ) : (
                <p>Slot {index + 1} - Empty</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

IncineratorManagerModal.propTypes = {
  stakedIncinerators: PropTypes.array.isRequired,
  unstakedIncinerators: PropTypes.array.isRequired,
  assignedSlots: PropTypes.array.isRequired,
  onIncineratorSelect: PropTypes.func.isRequired,
  onUnstakedStake: PropTypes.func.isRequired,
  onUnstake: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  fetchData: PropTypes.func.isRequired,
};

export default IncineratorManagerModal;
