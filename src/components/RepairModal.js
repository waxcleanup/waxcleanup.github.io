import React from 'react';
import PropTypes from 'prop-types';
import './RepairModal.css';

const RepairModal = ({
  repairPoints,
  setRepairPoints,
  repairError,
  setRepairError,
  onCancel,
  onConfirm,
  onMaxClick
}) => {
  const maxDurability = 500;

  return (
    <div className="modal-backdrop fade-in">
      <div className="modal-box popup-glow">
        <h3>🛠 Repair Incinerator</h3>
        <p>1 CINDER = +1 Durability = 1 Minute of Repair Time</p>
        <input
          type="number"
          min="1"
          max={maxDurability}
          value={repairPoints}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (e.target.value === '') {
              setRepairPoints('');
              setRepairError('');
            } else if (!isNaN(val) && val >= 1 && val <= maxDurability) {
              setRepairPoints(val);
              setRepairError('');
            } else if (val > maxDurability) {
              setRepairPoints(maxDurability);
              setRepairError(`Max durability is ${maxDurability}.`);
            } else {
              setRepairError('Enter a number between 1 and 500.');
            }
          }}
          placeholder="Enter repair points"
        />
        {repairError && <p className="error-text">{repairError}</p>}
        <div className="max-button-wrapper">
          <button onClick={onMaxClick}>Max</button>
        </div>
        <div className="modal-buttons">
          <button className="cancel-button" onClick={onCancel}>Cancel</button>
          <button className="confirm-button" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

RepairModal.propTypes = {
  repairPoints: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  setRepairPoints: PropTypes.func,
  repairError: PropTypes.string,
  setRepairError: PropTypes.func,
  onCancel: PropTypes.func,
  onConfirm: PropTypes.func,
  onMaxClick: PropTypes.func
};

export default RepairModal;
