import React, { useState } from 'react';
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
    owner = '',
  } = incinerator;

  const maxFuelCapacity = 100000;
  const maxEnergyCapacity = 10;
  const maxDurability = 500;
  const remainingFuelCapacity = maxFuelCapacity - fuel;

  const pollIncineratorData = async (interval = 1000, duration = 5000) => {
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
    setTimeout(() => fetchIncineratorData(), duration);
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
        await loadFuel(owner, id, amount);
        alert(`Successfully loaded ${amount} fuel!`);
      } else if (transactionType === 'energy') {
        await loadEnergy(owner, id);
        alert('Energy fully loaded!');
      }
      pollIncineratorData();
    } catch (error) {
      console.error('[ERROR] Transaction failed:', error);
      alert(error.message || 'Transaction failed. Please try again.');
    } finally {
      setLoading(false);
      setShowModal(false);
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
    setShowModal(true);
  };

  return (
    <div className="incinerator-details">
      <img
        src={`https://ipfs.io/ipfs/${img}`}
        alt={name}
        className="incinerator-image"
      />
      <p className="incinerator-name"><strong>Name:</strong> {name}</p>
      <p className="asset-id"><strong>Asset ID:</strong> {id}</p>

      {/* Progress Bars */}
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
          className={`progress-bar-fill durability-bar ${durability <= 100 ? 'low' : ''}`}
          style={{ width: `${(durability / maxDurability) * 100}%` }}
        />
        <span className="progress-bar-text">
          Durability: {durability}/{maxDurability}
        </span>
      </div>

      {/* Action Buttons */}
      {showButtons && (
        <div className="button-container organized-buttons">
          {onRemove && (
            <button
              className="remove-incinerator-button"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
            >
              Remove
            </button>
          )}
          <button className="fuel-button" onClick={handleFuelClick}>Load Fuel</button>
          <button className="energy-button" onClick={handleEnergyClick}>Load Energy</button>
          <button
            className="repair-button"
            onClick={(e) => { e.stopPropagation(); onRepair(incinerator); }}
          >
            Repair Durability
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
                {errorMessage && <p className="error-message">{errorMessage}</p>}
              </>
            ) : (
              <p>Loading energy will cost 2 CINDER tokens. Proceed?</p>
            )}
            <div className="modal-buttons">
              <button onClick={handleTransaction} disabled={loading}>
                {loading ? 'Processing...' : 'Confirm'}
              </button>
              <button onClick={() => setShowModal(false)} disabled={loading}>Cancel</button>
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
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    fuel: PropTypes.number,
    energy: PropTypes.number,
    durability: PropTypes.number,
    img: PropTypes.string,
    owner: PropTypes.string,
  }),
  onRepair: PropTypes.func.isRequired,
  onRemove: PropTypes.func,
  fetchIncineratorData: PropTypes.func.isRequired,
  showButtons: PropTypes.bool,
};

export default IncineratorDetails;
