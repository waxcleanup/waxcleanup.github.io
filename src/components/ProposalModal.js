import React, { useState, useEffect } from 'react';
import './ProposalModal.css';

function ProposalModal({
  templateId,
  proposalType = 'NFT Burn',
  initialTrashFee = '1000', // Default Trash Fee
  initialCinderReward = '',
  setTrashFee,
  setCinderReward,
  handleProposalSubmit,
  onClose,
}) {
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize local state or fallback to default values
  const [localTrashFee, setLocalTrashFee] = useState(initialTrashFee || '1000');
  const [localCinderReward, setLocalCinderReward] = useState(initialCinderReward || '');

  // Synchronize props if they change
  useEffect(() => {
    setLocalTrashFee(initialTrashFee || '1000');
    setLocalCinderReward(initialCinderReward || '');
  }, [initialTrashFee, initialCinderReward]);

  // Dynamic validation for asset decimals
  const isValidAsset = (value, decimals) => {
    const regex = new RegExp(`^(\\d+(\\.\\d{1,${decimals}})?)$`);
    return regex.test(value);
  };

  // Update Trash Fee with validation
  const handleTrashFeeChange = (e) => {
    const value = e.target.value;

    // Prevent values below 1000 or above 100000
    if (value && parseFloat(value) < 1000) {
      setErrorMessage('Trash Fee cannot be less than 1,000 TRASH.');
      return;
    }

    if (value && parseFloat(value) > 100000) {
      setErrorMessage('Trash Fee cannot exceed 100,000 TRASH.');
      return;
    }

    // Validate format and update state
    if (isValidAsset(value, 3) || value === '') {
      setLocalTrashFee(value);
      setTrashFee(value); // Update parent state
      setErrorMessage('');
    } else {
      setErrorMessage('Invalid format for Trash Fee. Use up to 3 decimals.');
    }
  };

  // Update Cinder Reward with validation
  const handleCinderRewardChange = (e) => {
    const value = e.target.value;

    // Prevent values above 50.000000
    if (value && parseFloat(value) > 50) {
      setErrorMessage('Cinder Reward must not exceed 50.000000 CINDER.');
      return;
    }

    if (isValidAsset(value, 6) || value === '') {
      setLocalCinderReward(value);
      setCinderReward(value); // Update parent state
      setErrorMessage('');
    } else {
      setErrorMessage('Invalid format for Cinder Reward. Use up to 6 decimals.');
    }
  };

  const onSubmit = () => {
    if (!localTrashFee || !localCinderReward) {
      setErrorMessage('Please enter values for Trash Fee and Cinder Reward.');
      return;
    }

    const trashFeeValue = parseFloat(localTrashFee);
    const cinderRewardValue = parseFloat(localCinderReward);

    // Validate Trash Fee
    if (trashFeeValue < 1000) {
      setErrorMessage('Trash Fee must be at least 1,000 TRASH.');
      return;
    }

    if (trashFeeValue > 100000) {
      setErrorMessage('Trash Fee must not exceed 100,000 TRASH.');
      return;
    }

    // Validate Cinder Reward
    if (cinderRewardValue > 50) {
      setErrorMessage('Cinder Reward must not exceed 50.000000 CINDER.');
      return;
    }

    const formattedTrashFee = trashFeeValue.toFixed(3);
    const formattedCinderReward = cinderRewardValue.toFixed(6);

    setTrashFee(`${formattedTrashFee} TRASH`);
    setCinderReward(`${formattedCinderReward} CINDER`);

    // Properly invoke handleProposalSubmit
    if (handleProposalSubmit) {
      handleProposalSubmit({
        trashFee: `${formattedTrashFee} TRASH`,
        cinderReward: `${formattedCinderReward} CINDER`,
        templateId,
        proposalType,
      });
    } else {
      setErrorMessage('Error: Proposal submission handler is not defined.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Create a Proposal</h3>
        <p>Template ID: <strong>{templateId}</strong></p>
        <p className="proposal-fee-note">Note: A fee of 1,000 TRASH is required to create this proposal.</p>
        <p className="proposal-note">The TRASH fee must be at least 1,000 TRASH and not exceed 100,000 TRASH.</p>
        <p className="proposal-note">The CINDER reward must not exceed 50.000000 CINDER.</p>

        <div className="modal-field">
          <label>Proposal Type:</label>
          <input type="text" value={proposalType} readOnly />
        </div>

        <div className="modal-field">
          <label>Trash Fee:</label>
          <input
            type="text"
            value={localTrashFee}
            onChange={handleTrashFeeChange}
            placeholder="Enter Trash Fee"
          />
        </div>

        <div className="modal-field">
          <label>Cinder Reward:</label>
          <input
            type="text"
            value={localCinderReward}
            onChange={handleCinderRewardChange}
            placeholder="Enter Cinder Reward"
          />
        </div>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <button
          onClick={onSubmit}
          className="submit"
          disabled={!localTrashFee || !localCinderReward || !!errorMessage}
        >
          Submit Proposal
        </button>

        <button onClick={onClose} className="close">Close</button>
      </div>
    </div>
  );
}

export default ProposalModal;
