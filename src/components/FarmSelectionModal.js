// src/components/FarmSelectionModal.js
import React from 'react';
import PropTypes from 'prop-types';
import './FarmSelectionModal.css'; // New CSS file

const FarmSelectionModal = ({
  stakedFarms,
  unstakedFarms,
  onFarmSelect,
  onClose,
}) => {
  return (
    <div className="farm-modal-overlay">
      <div className="farm-modal-content">
        <button className="farm-modal-close" onClick={onClose}>
          &times;
        </button>
        <h2 className="farm-modal-title">Select a Farm</h2>

        <div className="farm-modal-sections">
          <div className="farm-section">
            <h3 className="farm-section-title">Staked Farms</h3>
            <div className="farm-card-grid">
              {stakedFarms.length > 0 ? (
                stakedFarms.map((farm) => (
                  <div
                    key={farm.asset_id}
                    className="farm-card"
                    onClick={() => onFarmSelect(farm)}
                  >
                    <p>Asset ID: {farm.asset_id}</p>
                    <p>Region: {farm.region || 'N/A'}</p>
                  </div>
                ))
              ) : (
                <p className="farm-status-msg">No staked farms found.</p>
              )}
            </div>
          </div>

          <div className="farm-section">
            <h3 className="farm-section-title">Unstaked Farms</h3>
            <div className="farm-card-grid">
              {unstakedFarms.length > 0 ? (
                unstakedFarms.map((farm) => (
                  <div
                    key={farm.asset_id}
                    className="farm-card"
                    onClick={() => onFarmSelect(farm)}
                  >
                    <p>Asset ID: {farm.asset_id}</p>
                    <p>Region: {farm.region || 'N/A'}</p>
                  </div>
                ))
              ) : (
                <p className="farm-status-msg">No unstaked farms found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

FarmSelectionModal.propTypes = {
  stakedFarms: PropTypes.array.isRequired,
  unstakedFarms: PropTypes.array.isRequired,
  onFarmSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default FarmSelectionModal;
