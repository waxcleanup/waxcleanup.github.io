import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { stakeIncinerator } from '../services/transactionActions';

const ConfirmationModal = ({ accountName, incinerator, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      console.log('Account Name:', accountName);
      console.log('Incinerator Details:', incinerator);

      if (!accountName || !incinerator) {
        throw new Error('Missing account or incinerator details.');
      }

      if (!incinerator.template_id) {
        throw new Error('Selected incinerator is missing template_id. Cannot proceed with staking.');
      }

      // Call the stakeIncinerator action
      const transactionId = await stakeIncinerator(accountName, incinerator);
      console.log('Staking successful. Transaction ID:', transactionId);

      // Trigger the onSuccess callback after successful staking
      if (onSuccess) {
        onSuccess(transactionId);
      }
    } catch (error) {
      console.error('Error during staking:', error.message, error.stack);
      alert('Failed to stake incinerator. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Confirm Stake</h3>
        {incinerator && (
          <div className="incinerator-card">
            <img
              src={incinerator.img ? `https://ipfs.io/ipfs/${incinerator.img}` : '/path/to/default-image.png'}
              alt={incinerator.template_name || 'Unnamed Incinerator'}
              className="incinerator-image"
            />
            <p>{incinerator.template_name || 'Unnamed Incinerator'}</p>
            <p className="asset-id">
              Asset ID: {incinerator.asset_id ? incinerator.asset_id : 'N/A'}
            </p>
          </div>
        )}
        <p className="staking-description">
          Staking locks your incinerator for use in burning NFTs. Once staked, you will need to unstake it if you want to transfer or reuse it elsewhere.
        </p>
        <button className="confirm-button" onClick={handleConfirm} disabled={loading}>
          {loading ? (
            <span>
              <i className="loading-spinner" /> Staking...
            </span>
          ) : (
            'Confirm'
          )}
        </button>
        <button className="cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};

ConfirmationModal.propTypes = {
  accountName: PropTypes.string.isRequired,
  incinerator: PropTypes.shape({
    asset_id: PropTypes.string.isRequired,
    img: PropTypes.string,
    template_name: PropTypes.string,
    template_id: PropTypes.string.isRequired, // Ensures template_id is present
  }).isRequired,
  onSuccess: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default ConfirmationModal;
