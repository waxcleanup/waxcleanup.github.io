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

  // Function to calculate brightness and determine text color
  const getTextColor = (backgroundColor) => {
    const hexToRgb = (hex) => {
      const bigint = parseInt(hex.replace('#', ''), 16);
      return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    };
    const [r, g, b] = hexToRgb(backgroundColor);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000; // Perceived brightness formula
    return brightness > 128 ? 'black' : 'white'; // Use black text for light backgrounds, white for dark
  };

  const getDurabilityColor = () => {
    if (durability > 250) return '#C0C0C0'; // Silver for full durability
    if (durability > 100) return '#FFA500'; // Orange for mid-low durability
    return '#FF0000'; // Red for critical durability
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
        const transactionId = await loadFuel(owner, id, amount);
        console.log('Fuel loaded successfully. Transaction ID:', transactionId);
        alert(`Successfully loaded ${amount} fuel!`);
      } else if (transactionType === 'energy') {
        const transactionId = await loadEnergy(owner, id);
        console.log('Energy loaded successfully. Transaction ID:', transactionId);
        alert('Energy fully loaded!');
      }
      await fetchIncineratorData(); // Refresh incinerator data after successful transaction
    } catch (error) {
      console.error('Transaction failed:', error);
      alert(error.message || 'Transaction failed. Please try again.');
    } finally {
      setLoading(false); // End loading state
      setShowModal(false); // Close the modal
    }
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
          <span
            className="progress-bar-text"
            style={{ color: getTextColor('#ADD8E6') }} // Adjust text color dynamically
          >
            Fuel: {fuel}/100000
          </span>
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
          <span
            className="progress-bar-text"
            style={{ color: getTextColor('#FFA500') }} // Adjust text color dynamically
          >
            Energy: {energy}/10
          </span>
        </div>
      </div>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill durability-bar"
          style={{
            width: `${Math.min((durability / 500) * 100, 100)}%`,
            backgroundColor: getDurabilityColor(),
          }}
        >
          <span
            className="progress-bar-text"
            style={{ color: getTextColor(getDurabilityColor()) }} // Adjust text color dynamically
          >
            Durability: {durability}/500
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      {showButtons && (
        <div className="button-container">
          <button
            className="fuel-button"
            onClick={(e) => {
              e.stopPropagation();
              setTransactionType('fuel');
              setShowModal(true);
            }}
          >
            Load Fuel
          </button>
          <button
            className="energy-button"
            onClick={(e) => {
              e.stopPropagation();
              setTransactionType('energy');
              setShowModal(true);
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
