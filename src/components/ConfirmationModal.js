import React from 'react';

const ConfirmationModal = ({ incinerator, onConfirm, onCancel, loading }) => (
  <div className="modal-overlay">
    <div className="modal-content">
      <h3>Confirm Stake</h3>
      {incinerator && (
        <div className="incinerator-card">
          <img
            src={`https://ipfs.io/ipfs/${incinerator.img}`}
            alt={incinerator.template_name || 'Unnamed Incinerator'}
            className="incinerator-image"
          />
          <p>{incinerator.template_name || 'Unnamed Incinerator'}</p>
          <p className="asset-id">Asset ID: {incinerator.asset_id}</p>
        </div>
      )}
      <p className="staking-description">
        Staking locks your incinerator for use in burning NFTs. Once staked, you will need to unstake it if you want to transfer or reuse it elsewhere.
      </p>
      <button className="confirm-button" onClick={onConfirm} disabled={loading}>
        {loading ? 'Staking...' : 'Confirm'}
      </button>
      <button className="cancel-button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  </div>
);

export default ConfirmationModal;
