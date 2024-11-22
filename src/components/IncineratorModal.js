import React from 'react';
import './BurnRoom.css'; // Ensures styling consistency with BurnRoom

const IncineratorModal = ({
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
                <div key={incinerator.asset_id} className="incinerator-card">
                  <img
                    src={`https://ipfs.io/ipfs/${incinerator.img}`}
                    alt={incinerator.name || 'Unnamed Incinerator'}
                    className="incinerator-image"
                  />
                  <p className="incinerator-name">
                    {incinerator.name || 'Unnamed Incinerator'}
                  </p>
                  <p>Asset ID: {incinerator.asset_id}</p>

                  {/* Progress Bars */}
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill fuel-bar"
                      style={{ width: `${(incinerator.fuel / 100000) * 100}%` }}
                    >
                      <span className="progress-bar-text">
                        Fuel: {incinerator.fuel || 0}/100000
                      </span>
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill energy-bar"
                      style={{ width: `${(incinerator.energy / 10) * 100}%` }}
                    >
                      <span className="progress-bar-text">
                        Energy: {incinerator.energy || 0}/10
                      </span>
                    </div>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill durability-bar"
                      style={{
                        width: `${(incinerator.durability / 500) * 100}%`,
                      }}
                    >
                      <span className="progress-bar-text">
                        Durability: {incinerator.durability || 0}/500
                      </span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="button-container">
                    <button
                      className="fuel-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadFuel(incinerator.asset_id, 10000);
                      }}
                    >
                      Load Fuel
                    </button>
                    <button
                      className="energy-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadEnergy(incinerator.asset_id);
                      }}
                    >
                      Load Energy
                    </button>
                    <button
                      className="repair-durability-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        repairDurability(incinerator.asset_id);
                      }}
                    >
                      Repair Durability
                    </button>
                    <button
                      className="select-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onIncineratorSelect(incinerator);
                      }}
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p>No staked incinerators available.</p>
            )}
          </div>
        </div>

        {/* Unstaked Incinerators Section */}
        <div className="unstaked-section">
          <h4>Unstaked Incinerators</h4>
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
                          onClick={() => onUnstakedStake(incinerator)}
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

export default IncineratorModal;
