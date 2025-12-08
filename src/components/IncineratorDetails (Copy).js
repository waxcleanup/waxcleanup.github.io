import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { loadFuel, loadEnergy } from '../services/transactionActions';

const IncineratorDetails = ({
  incinerator,
  onRepair,
  onRemove,
  fetchIncineratorData,
  showButtons = true,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [transactionType, setTransactionType] = useState('');
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [imgLoaded, setImgLoaded] = useState(true);

  const isEmpty = !incinerator;

  const {
    name = 'Unnamed Incinerator',
    fuel = 0,
    energy = 0,
    durability = 0,
    img = 'default-placeholder.png',
    owner = '',
    fuelCap = 100000,
    energyCap = 10,
  } = incinerator || {};

  const assetId = incinerator?.asset_id || incinerator?.id || 'N/A';

  const maxFuelCapacity = fuelCap;
  const maxEnergyCapacity = energyCap;
  const maxDurability = 500;

  const remainingFuelCapacity = useMemo(
    () => maxFuelCapacity - fuel,
    [fuel, maxFuelCapacity]
  );

  const pollIncineratorData = async (interval = 2000, duration = 10000) => {
    const startTime = Date.now();

    const poll = async () => {
      try {
        await fetchIncineratorData();
      } catch (error) {
        console.error('[ERROR] Polling incinerator data failed:', error);
      }
    };

    const intervalId = setInterval(() => {
      if (Date.now() - startTime >= duration) {
        clearInterval(intervalId);
      } else {
        poll();
      }
    }, interval);

    // Final refresh at the end of the polling window
    setTimeout(() => {
      fetchIncineratorData().catch((err) =>
        console.error('[ERROR] Final poll failed:', err)
      );
    }, duration);
  };

  const handleTransaction = async () => {
    setLoading(true);
    try {
      if (transactionType === 'fuel') {
        if (amount <= 0 || amount > remainingFuelCapacity) {
          alert(`Please enter a valid amount (1 - ${remainingFuelCapacity}).`);
          setLoading(false);
          return;
        }
        await loadFuel(owner, assetId, amount);
        alert(`Successfully loaded ${amount} fuel!`);
      } else if (transactionType === 'energy') {
        await loadEnergy(owner, assetId);
        alert('Energy fully loaded!');
      }

      await pollIncineratorData();
    } catch (error) {
      console.error('[ERROR] Transaction failed:', error);
      alert(error.message || 'Transaction failed. Please try again.');
    } finally {
      setLoading(false);
      setShowModal(false);
      setAmount(0);
      setTransactionType('');
      setErrorMessage('');
    }
  };

  const handleFuelClick = (e) => {
    e.stopPropagation();
    setTransactionType('fuel');
    setAmount(0);
    setErrorMessage('');
    setShowModal(true);
  };

  const handleFuelInputChange = (e) => {
    const input = Number(e.target.value);
    if (input > remainingFuelCapacity) {
      setAmount(remainingFuelCapacity);
      setErrorMessage(`Maximum fuel load is ${remainingFuelCapacity}.`);
    } else if (input < 0) {
      setAmount(0);
      setErrorMessage('');
    } else {
      setAmount(input);
      setErrorMessage('');
    }
  };

  const handleEnergyClick = (e) => {
    e.stopPropagation();
    setTransactionType('energy');
    setErrorMessage('');
    setShowModal(true);
  };

  const handleImageError = () => {
    setImgLoaded(false);
  };

  if (isEmpty) {
    return <p>Click to assign an incinerator</p>;
  }

  return (
    <div className="incinerator-details">
      {imgLoaded ? (
        <img
          src={`${process.env.REACT_APP_IPFS_GATEWAY}/${img}`}
          alt={name}
          className="incinerator-image"
          onError={handleImageError}
        />
      ) : (
        <div className="incinerator-placeholder">Image failed to load</div>
      )}

      <p className="incinerator-name">
        <strong>Name:</strong> {name}
      </p>
      <p className="asset-id">
        <strong>Asset ID:</strong> {assetId}
      </p>

      <div className="progress-bar-container">
        <div
          className="progress-bar-fill fuel-bar"
          style={{ width: `${(fuel / maxFuelCapacity) * 100}%` }}
        />
        <span className="progress-bar-text">
          Fuel: {fuel}/{maxFuelCapacity}
        </span>
      </div>

      <div className="progress-bar-container">
        <div
          className="progress-bar-fill energy-bar"
          style={{ width: `${(energy / maxEnergyCapacity) * 100}%` }}
        />
        <span className="progress-bar-text">
          Energy: {energy}/{maxEnergyCapacity}
        </span>
      </div>

      <div className="progress-bar-container">
        <div
          className={`progress-bar-fill durability-bar ${
            durability <= 100 ? 'low' : ''
          }`}
          style={{ width: `${(durability / maxDurability) * 100}%` }}
        />
        <span className="progress-bar-text">
          Durability: {durability}/{maxDurability}
        </span>
      </div>

      {showButtons && (
        <div className="button-container organized-buttons">
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
          <button className="fuel-button" onClick={handleFuelClick}>
            Load Fuel
          </button>
          <button className="energy-button" onClick={handleEnergyClick}>
            Load Energy
          </button>
          <button
            className="repair-button"
            onClick={(e) => {
              e.stopPropagation();
              onRepair(incinerator);
            }}
          >
            Repair Durability
          </button>
        </div>
      )}

      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            // Prevent triggering the parent card click (which opens other modals)
            e.stopPropagation();
            if (!loading) setShowModal(false);
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h4>Confirm Transaction</h4>

            {transactionType === 'fuel' ? (
              <>
                <p>Enter the amount of fuel to load:</p>
                <input
                  type="number"
                  value={amount}
                  onChange={handleFuelInputChange}
                  placeholder="Fuel amount"
                  min="1"
                  max={remainingFuelCapacity}
                  disabled={loading}
                />
                {errorMessage && (
                  <p className="error-message">{errorMessage}</p>
                )}
              </>
            ) : (
              <p>Loading energy will cost 2 CINDER tokens. Proceed?</p>
            )}

            <div className="modal-buttons">
              <button onClick={handleTransaction} disabled={loading}>
                {loading ? 'Processing...' : 'Confirm'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!loading) setShowModal(false);
                }}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

IncineratorDetails.propTypes = {
  incinerator: PropTypes.shape({
    name: PropTypes.string,
    asset_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    fuel: PropTypes.number,
    energy: PropTypes.number,
    durability: PropTypes.number,
    img: PropTypes.string,
    owner: PropTypes.string,
    fuelCap: PropTypes.number,
    energyCap: PropTypes.number,
  }),
  onRepair: PropTypes.func.isRequired,
  onRemove: PropTypes.func,
  fetchIncineratorData: PropTypes.func.isRequired,
  showButtons: PropTypes.bool,
};

export default IncineratorDetails;

