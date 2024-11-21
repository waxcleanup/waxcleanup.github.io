import React from 'react';

const IncineratorModal = ({
  stakedIncinerators = [],
  onIncineratorSelect,
  onClose,
  loadFuel,
  loadEnergy,
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Select an Incinerator</h3>

        {/* Staked Incinerators Section */}
        <div className="staked-section">
          <h4>Staked Incinerators</h4>
          <div className="incinerator-grid">
            {stakedIncinerators.length > 0 ? (
              stakedIncinerators.map((incinerator) => (
                <div
                  key={incinerator.id}
                  className="incinerator-card"
                  onClick={() => onIncineratorSelect(incinerator)}
                >
                  <img
                    src={
                      incinerator.img
                        ? `https://ipfs.io/ipfs/${incinerator.img}`
                        : 'default-placeholder.png'
                    }
                    alt={incinerator.template_name || 'Unnamed Incinerator'}
                    className="incinerator-image"
                  />
                  <p className="incinerator-name">
                    {incinerator.template_name || 'Unnamed Incinerator'}
                  </p>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill fuel-bar"
                      style={{
                        width: `${(incinerator.fuel / 100000) * 100}%`,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <span className="progress-bar-text">
                        Fuel: {incinerator.fuel}/100000
                      </span>
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill energy-bar"
                      style={{
                        width: `${(incinerator.energy / 10) * 100}%`,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <span className="progress-bar-text">
                        Energy: {incinerator.energy}/10
                      </span>
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill durability-bar"
                      style={{
                        width: `${(incinerator.durability / 500) * 100}%`,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <span className="progress-bar-text">
                        Durability: {incinerator.durability}/500
                      </span>
                    </div>
                  </div>
                  <button
                    className="load-fuel-button fuel-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadFuel(incinerator.id, 10000);
                    }}
                  >
                    Load Fuel
                  </button>
                  <button
                    className="load-energy-button energy-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadEnergy(incinerator.id);
                    }}
                  >
                    Load Energy
                  </button>
                </div>
              ))
            ) : (
              <p>No staked incinerators available.</p>
            )}
          </div>
        </div>

        <button className="close-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default IncineratorModal;
