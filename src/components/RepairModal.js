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
  onMaxClick,
  maxPoints
}) => {
  return (
    <div className="modal-backdrop fade-in incinerator-repair">
      <div className="modal-box popup-glow">
        <h3>Restore durability</h3>
        <p>Missing durability: <strong>{maxPoints} / 500</strong></p><p>Each point costs 1 CINDER and takes 1 minute to repair.</p><p>Selected: <strong>{repairPoints || 0} CINDER</strong> · <strong>{repairPoints || 0} minutes</strong></p>
        <input
          type="number"
          min="1"
          max={maxPoints}
          value={repairPoints}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (e.target.value === '') {
              setRepairPoints('');
              setRepairError('');
            } else if (!isNaN(val) && val >= 1 && val <= maxPoints) {
              setRepairPoints(val);
              setRepairError('');
            } else if (val > maxPoints) {
              setRepairPoints(maxPoints);
              setRepairError(`Max repair is ${maxPoints}.`);
            } else {
              setRepairError(`Enter a number between 1 and ${maxPoints}.`);
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
          <button className="confirm-button" onClick={onConfirm}>Start repair in wallet</button>
        </div>
      </div>
    </div>
  );
};

RepairModal.propTypes = {
  repairPoints: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  setRepairPoints: PropTypes.func.isRequired,
  repairError: PropTypes.string,
  setRepairError: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onMaxClick: PropTypes.func.isRequired,
  maxPoints: PropTypes.number.isRequired
};

export default RepairModal;
