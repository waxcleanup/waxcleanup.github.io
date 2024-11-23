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

  return (
    <>
      <img
        src={
          incinerator.img
            ? `https://ipfs.io/ipfs/${incinerator.img}`
            : 'default-placeholder.png'
        }
        alt={incinerator.template_name || 'Unnamed Incinerator'}
        className="incinerator-image"
      />
      <p className="incinerator-name">{incinerator.template_name || 'Unnamed Incinerator'}</p>
      <p className="asset-id">Asset ID: {incinerator.asset_id}</p>

      {/* Progress Bars */}
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill fuel-bar"
          style={{ width: `${(incinerator.fuel / 100000) * 100}%` }}
        >
          <span className="progress-bar-text">Fuel: {incinerator.fuel}/100000</span>
        </div>
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill energy-bar"
          style={{ width: `${(incinerator.energy / 10) * 100}%` }}
        >
          <span className="progress-bar-text">Energy: {incinerator.energy}/10</span>
        </div>
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill durability-bar"
          style={{ width: `${(incinerator.durability / 500) * 100}%` }}
        >
          <span className="progress-bar-text">Durability: {incinerator.durability}/500</span>
        </div>
      </div>

      {/* Buttons */}
      {showButtons && (
        <div className="button-container">
          <button
            className="fuel-button"
            onClick={(e) => {
              e.stopPropagation();
              onFuelLoad(incinerator.asset_id, 10000);
            }}
          >
            Load Fuel
          </button>
          <button
            className="energy-button"
            onClick={(e) => {
              e.stopPropagation();
              onEnergyLoad(incinerator.asset_id);
            }}
          >
            Load Energy
          </button>
          <button
            className="repair-durability-button"
            onClick={(e) => {
              e.stopPropagation();
              onRepair(incinerator.asset_id);
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
    </>
  );
};

export default IncineratorDetails;
