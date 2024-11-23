import React from 'react';

const IncineratorDetails = ({
  incinerator,
  onFuelLoad,
  onEnergyLoad,
  onRepair,
  onRemove,
  showButtons = true, // Toggle buttons visibility
}) => {
  if (!incinerator) {
    return <p>Click to assign an incinerator</p>;
  }

  const {
    name = 'Unnamed Incinerator',
    id = 'N/A',
    fuel = 0,
    energy = 0,
    durability = 0,
    img = 'default-placeholder.png',
  } = incinerator;

  return (
    <div className="incinerator-details">
      <img
        src={`https://ipfs.io/ipfs/${img}`}
        alt={name}
        className="incinerator-image"
      />
      <p className="incinerator-name">
        <strong>Name:</strong> {name}
      </p>
      <p className="asset-id">
        <strong>Asset ID:</strong> {id}
      </p>

      {/* Progress Bars */}
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill fuel-bar"
          style={{ width: `${(fuel / 100000) * 100}%` }}
        >
          <span className="progress-bar-text">Fuel: {fuel}/100000</span>
        </div>
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill energy-bar"
          style={{ width: `${(energy / 10) * 100}%` }}
        >
          <span className="progress-bar-text">Energy: {energy}/10</span>
        </div>
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill durability-bar"
          style={{ width: `${(durability / 500) * 100}%` }}
        >
          <span className="progress-bar-text">Durability: {durability}/500</span>
        </div>
      </div>

      {/* Buttons */}
      {showButtons && (
        <div className="button-container">
          <button
            className="fuel-button"
            onClick={(e) => {
              e.stopPropagation();
              onFuelLoad(id, 10000);
            }}
          >
            Load Fuel
          </button>
          <button
            className="energy-button"
            onClick={(e) => {
              e.stopPropagation();
              onEnergyLoad(id);
            }}
          >
            Load Energy
          </button>
          <button
            className="repair-durability-button"
            onClick={(e) => {
              e.stopPropagation();
              onRepair(id);
            }}
          >
            Repair Durability
          </button>
          {onRemove && (
            <button
              className="remove-incinerator-button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default IncineratorDetails;
