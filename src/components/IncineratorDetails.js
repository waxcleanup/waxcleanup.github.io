import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { loadFuel, loadEnergy } from '../services/transactionActions'; // Import transaction actions

const IncineratorDetails = ({
  incinerator,
  onRepair,
  onRemove,
  fetchIncineratorData, // Function to refresh incinerator data
  showButtons = true, // Toggle buttons visibility
}) => {
  const [showModal, setShowModal] = useState(false);
  const [transactionType, setTransactionType] = useState('');
  const [amount, setAmount] = useState(0); // For fuel amount
  const [loading, setLoading] = useState(false); // To show loading state for transactions

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

  const pollIncineratorData = async (interval = 1000, duration = 5000) => {
    const startTime = Date.now();

    const poll = async () => {
      try {
        console.log('[INFO] Polling incinerator data...');
        await fetchIncineratorData(); // Fetch updated incinerator data
      } catch (error) {
        console.error('[ERROR] Polling incinerator data failed:', error);
      }
    };

    const intervalId = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime >= duration) {
        clearInterval(intervalId); // Stop polling after the duration
        console.log('[INFO] Stopped polling incinerator data.');
      } else {
        poll(); // Fetch data at each interval
      }
    }, interval);

    // Fallback to a final fetch after polling ends
    setTimeout(async () => {
      console.log('[INFO] Final fetch to ensure data is updated.');
      await fetchIncineratorData();
    }, duration);
  };

  const handleTransaction = async () => {
    setLoading(true);
    try {
      if (transactionType === 'fuel') {
        if (amount <= 0) {
          alert('Please enter a valid fuel amount greater than 0.');
          setLoading(false);
          return;
        }
        await loadFuel(owner, id, amount);
        alert(`Successfully loaded ${amount} fuel!`);
      } else if (transactionType === 'energy') {
        await loadEnergy(owner, id);
        alert('Energy fully loaded!');
      }

      // Start polling to refresh incinerator data for 5 seconds
      pollIncineratorData(1000, 5000);
    } catch (error) {
      console.error('Transaction failed:', error);
      alert(error.message || 'Transaction failed. Please try again.');
    } finally {
      setLoading(false); // End loading state
      setShowModal(false); // Close the modal
    }
  };

  const handleFuelClick = (e) => {
    e.stopPropagation(); // Prevent parent click handler
    setTransactionType('fuel');
    setShowModal(true);
  };

  const handleEnergyClick = (e) => {
    e.stopPropagation(); // Prevent parent click handler
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
          style={{
            width: fuel >= 100000 ? '100%' : `${Math.min((fuel / 100000) * 100, 100)}%`, // Clamp value
            backgroundColor: '#ADD8E6', // Light blue for fuel
          }}
        >
          <span className="progress-bar-text">Fuel: {fuel}/100000</span>
        </div>
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill energy-bar"
          style={{
            width: `${Math.min((energy / 10) * 100, 100)}%`,
            backgroundColor: '#FFA500', // Orange for energy
          }}
        >
          <span className="progress-bar-text">Energy: {energy}/10</span>
        </div>
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill durability-bar"
          style={{
            width: `${Math.min((durability / 500) * 100, 100)}%`,
            backgroundColor: durability > 250 ? '#C0C0C0' : durability > 100 ? '#FFA500' : '#FF0000',
          }}
        >
          <span className="progress-bar-text">Durability: {durability}/500</span>
        </div>
      </div>

      {/* Action Buttons */}
      {showButtons && (
        <div className="button-container">
          <button className="fuel-button" onClick={handleFuelClick}>
            Load Fuel
          </button>
          <button className="energy-button" onClick={handleEnergyClick}>
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

      {/* Confirmation Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Confirm Transaction</h4>
            {transactionType === 'fuel' ? (
              <div>
                <p>Enter the amount of fuel to load:</p>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="Fuel amount"
                  disabled={loading}
                />
                <p>Cost: {amount} TRASH tokens</p>
              </div>
            ) : (
              <p>Loading energy will cost 2 CINDER tokens. Do you wish to proceed?</p>
            )}
            <div className="modal-buttons">
              <button onClick={handleTransaction} disabled={loading}>
                {loading ? 'Processing...' : 'Confirm'}
              </button>
              <button onClick={() => setShowModal(false)} disabled={loading}>
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
