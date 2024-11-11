import React, { useState } from 'react';
import './ProposalModal.css';

function ProposalModal({
  templateId,
  proposalType = 'NFT Burn', // Default to 'NFT Burn' if not passed in
  trashFee,
  setTrashFee,
  cinderReward,
  setCinderReward,
  handleProposalSubmit,
  onClose
}) {
  const [errorMessage, setErrorMessage] = useState('');

  // Validation function for asset inputs
  const isValidAsset = (value) => {
    return /^(\d+(\.\d{1,3})?)$/.test(value);
  };

  // Update Trash Fee with validation
  const handleTrashFeeChange = (e) => {
    const value = e.target.value;
    if (isValidAsset(value) || value === '') {
      setTrashFee(value);
      setErrorMessage('');
    } else {
      setErrorMessage('Invalid format for Trash Fee. Use up to 3 decimals.');
    }
  };

  // Update Cinder Reward with validation
  const handleCinderRewardChange = (e) => {
    const value = e.target.value;
    if (isValidAsset(value) || value === '') {
      setCinderReward(value);
      setErrorMessage('');
    } else {
      setErrorMessage('Invalid format for Cinder Reward. Use up to 3 decimals.');
    }
  };

  // Handle form submission
  const onSubmit = () => {
    if (!trashFee || !cinderReward) {
      setErrorMessage('Please enter values for Trash Fee and Cinder Reward.');
      return;
    }
    handleProposalSubmit();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Create a Proposal</h3>
        <p>Template ID: <strong>{templateId}</strong></p>

        {/* Proposal Fee Note */}
        <p className="proposal-fee-note">
          Note: A fee of 1,000 TRASH is required to create this proposal.
        </p>

        {/* Trash Burn Fee Note */}
        <p className="proposal-note">
          The TRASH fee for burning an NFT must be at least 10 TRASH.
        </p>

        {/* Cinder Reward Note */}
        <p className="proposal-note">
          The CINDER reward must not exceed the cap of 5,000.000000 CINDER.
        </p>

        <div className="modal-field">
          <label>Proposal Type:</label>
          <input 
            type="text" 
            value={proposalType} 
            readOnly // Make it read-only
          />
        </div>
        
        <div className="modal-field">
          <label>Trash Fee:</label>
          <input 
            type="text" 
            value={trashFee} 
            onChange={handleTrashFeeChange} 
          />
        </div>
        
        <div className="modal-field">
          <label>Cinder Reward:</label>
          <input 
            type="text" 
            value={cinderReward} 
            onChange={handleCinderRewardChange} 
          />
        </div>

        {/* Display an error message if there's an issue */}
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        
        <button 
          onClick={onSubmit} 
          className="submit" 
          disabled={!trashFee || !cinderReward || !!errorMessage} // Disable if fields are invalid
        >
          Submit Proposal
        </button>
        
        <button onClick={onClose} className="close">Close</button>
      </div>
    </div>
  );
}

export default ProposalModal;
