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

  const [localTrashFee, setLocalTrashFee] = useState(initialTrashFee || '1000');
  const [localCinderReward, setLocalCinderReward] = useState(initialCinderReward || '');

  // Sync ONLY local state when props change
  useEffect(() => {
    setLocalTrashFee(initialTrashFee || '1000');
    setLocalCinderReward(initialCinderReward || '');
    setErrorMessage('');
  }, [initialTrashFee, initialCinderReward]);

  const isValidAsset = (value, decimals) => {
    if (value === '') return true; // allow empty while typing
    const regex = new RegExp(`^(\\d+(\\.\\d{1,${decimals}})?)$`);
    return regex.test(value);
  };

  // TRASH: up to 3 decimals, enforce max while typing
  const handleTrashFeeChange = (e) => {
    const value = e.target.value;

    if (value === '') {
      setLocalTrashFee('');
      if (setTrashFee) setTrashFee('');
      setErrorMessage('');
      return;
    }

    if (!isValidAsset(value, 3)) {
      setErrorMessage('Invalid format for Trash Fee. Use up to 3 decimals.');
      setLocalTrashFee(value);
      return;
    }

    const num = parseFloat(value);

    if (num > 100000) {
      setErrorMessage('Trash Fee cannot exceed 100,000 TRASH.');
      setLocalTrashFee(value);
      return;
    }

    setLocalTrashFee(value);
    if (setTrashFee) setTrashFee(value);
    setErrorMessage('');
  };

  // CINDER: up to 6 decimals, <= 5
  const handleCinderRewardChange = (e) => {
    const value = e.target.value;

    if (value === '') {
      setLocalCinderReward('');
      if (setCinderReward) setCinderReward('');
      setErrorMessage('');
      return;
    }

    if (!isValidAsset(value, 6)) {
      setErrorMessage('Invalid format for Cinder Reward. Use up to 6 decimals.');
      setLocalCinderReward(value);
      return;
    }

    const num = parseFloat(value);

    if (num > 5) {
      setErrorMessage('Cinder Reward must not exceed 5.000000 CINDER.');
      setLocalCinderReward(value);
      return;
    }

    setLocalCinderReward(value);
    if (setCinderReward) setCinderReward(value);
    setErrorMessage('');
  };

  const onSubmit = () => {
    if (!localTrashFee || !localCinderReward) {
      setErrorMessage('Please enter values for Trash Fee and Cinder Reward.');
      return;
    }

    const trashFeeValue = parseFloat(localTrashFee);
    const cinderRewardValue = parseFloat(localCinderReward);

    // full min/max for TRASH
    if (trashFeeValue < 1000) {
      setErrorMessage('Trash Fee must be at least 1,000 TRASH.');
      return;
    }

    if (trashFeeValue > 100000) {
      setErrorMessage('Trash Fee must not exceed 100,000 TRASH.');
      return;
    }

    // CINDER max
    if (cinderRewardValue > 5) {
      setErrorMessage('Cinder Reward must not exceed 5.000000 CINDER.');
      return;
    }

    const formattedTrashFee = trashFeeValue.toFixed(3);
    const formattedCinderReward = cinderRewardValue.toFixed(6);

    if (setTrashFee) setTrashFee(`${formattedTrashFee} TRASH`);
    if (setCinderReward) setCinderReward(`${formattedCinderReward} CINDER`);

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

  // button disabled logic
  const trashNum = parseFloat(localTrashFee);
  const cinderNum = parseFloat(localCinderReward);

  const trashInRange =
    localTrashFee !== '' &&
    !Number.isNaN(trashNum) &&
    trashNum >= 1000 &&
    trashNum <= 100000;

  const cinderInRange =
    localCinderReward !== '' &&
    !Number.isNaN(cinderNum) &&
    cinderNum <= 5;

  const isSubmitDisabled =
    !localTrashFee ||
    !localCinderReward ||
    !!errorMessage ||
    !trashInRange ||
    !cinderInRange;

  const handleClose = () => {
    // reset local state so next open is clean
    setErrorMessage('');
    setLocalTrashFee(initialTrashFee || '1000');
    setLocalCinderReward(initialCinderReward || '');
    if (onClose) onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Create a Proposal</h3>
        <p>
          Template ID: <strong>{templateId}</strong>
        </p>
        <p className="proposal-fee-note">
          Note: A fee of 1,000 TRASH is required to create this proposal.
        </p>
        <p className="proposal-note">
          The TRASH fee must be at least 1,000 TRASH and not exceed 100,000 TRASH.
        </p>
        <p className="proposal-note">
          The CINDER reward must not exceed 5.000000 CINDER.
        </p>

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
          disabled={isSubmitDisabled}
        >
          Submit Proposal
        </button>

        <button onClick={handleClose} className="close">
          Close
        </button>
      </div>
    </div>
  );
}

export default ProposalModal;

