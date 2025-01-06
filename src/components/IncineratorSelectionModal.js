import React from 'react';
import PropTypes from 'prop-types';
import './IncineratorSelectionModal.css'; // Optional: Add custom styles for the modal

const IncineratorSelectionModal = ({
  stakedIncinerators,
  unstakedIncinerators,
  onIncineratorSelect,
  onClose,
}) => {
  return (
    <div className="incinerator-selection-modal">
      <button className="close-button" onClick={onClose}>
        &times;
      </button>
      <h2>Select an Incinerator</h2>

      <div className="incinerator-sections">
        {/* Staked Incinerators Section */}
        <div className="incinerator-section">
          <h3>Staked Incinerators</h3>
          <div className="incinerator-grid">
            {stakedIncinerators.length > 0 ? (
              stakedIncinerators.map((incinerator) => (
                <div
                  key={incinerator.asset_id}
                  className="incinerator-card"
                  onClick={() => onIncineratorSelect(incinerator)}
                >
                  <p>Asset ID: {incinerator.asset_id}</p>
                  <p>Durability: {incinerator.durability || 'N/A'}</p>
                  {/* Add more details as needed */}
                </div>
              ))
            ) : (
              <p>No staked incinerators available.</p>
            )}
          </div>
        </div>

        {/* Unstaked Incinerators Section */}
        <div className="incinerator-section">
          <h3>Unstaked Incinerators</h3>
          <div className="incinerator-grid">
            {unstakedIncinerators.length > 0 ? (
              unstakedIncinerators.map((incinerator) => (
                <div
                  key={incinerator.asset_id}
                  className="incinerator-card"
                  onClick={() => onIncineratorSelect(incinerator)}
                >
                  <p>Asset ID: {incinerator.asset_id}</p>
                  <p>Durability: {incinerator.durability || 'N/A'}</p>
                  {/* Add more details as needed */}
                </div>
              ))
            ) : (
              <p>No unstaked incinerators available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

IncineratorSelectionModal.propTypes = {
  stakedIncinerators: PropTypes.array.isRequired,
  unstakedIncinerators: PropTypes.array.isRequired,
  onIncineratorSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default IncineratorSelectionModal;
