// src/components/ProposalModal.js
import React, { useState, useEffect } from 'react';
import './ProposalModal.css';

function ProposalModal({
  templateId,
  collection = '',
  schema = '',
  proposalType = 'NFT Burn',

  // ✅ Default burn fee (rule param)
  initialTrashFee = '10000',

  initialCinderReward = '0.5',
  initialCap = '10',

  // ✅ static proposal fee (transfer qty) — NOT editable
  initialProposalStake = '100000',

  setTrashFee,
  setCinderReward,
  handleProposalSubmit,
  onClose,
}) {
  const [errorMessage, setErrorMessage] = useState('');

  const getInitialMode = () => {
    const n = Number(templateId);
    return Number.isFinite(n) && n > 0 ? 'template' : 'schema';
  };

  const [proposalMode, setProposalMode] = useState(getInitialMode());

  const [localTrashFee, setLocalTrashFee] = useState(initialTrashFee || '10000');
  const [localCinderReward, setLocalCinderReward] = useState(initialCinderReward || '0.5');
  const [localCap, setLocalCap] = useState(initialCap || '10');

  // ✅ static fee (do not allow editing)
  const [localProposalStake, setLocalProposalStake] = useState(initialProposalStake || '100000');

  // Sync ONLY local state when props change
  useEffect(() => {
    setLocalTrashFee(initialTrashFee || '10000');
    setLocalCinderReward(initialCinderReward || '0.5');
    setLocalCap(initialCap || '10');

    // ✅ keep it in sync but still not editable
    setLocalProposalStake(initialProposalStake || '100000');

    setProposalMode(getInitialMode());
    setErrorMessage('');
  }, [initialTrashFee, initialCinderReward, initialCap, initialProposalStake, templateId]);

  /**
   * Asset input validator (typing-friendly)
   * Allows:
   *  - "1"
   *  - "1."
   *  - "1.2"
   *  - ".2"
   *  - "0.000001"
   * Restricts decimals to `decimals`
   */
  const isValidAsset = (value, decimals) => {
    if (value === '') return true;
    const regex = new RegExp(`^(\\d+)?(\\.(\\d{0,${decimals}})?)?$`);
    return regex.test(value);
    // NOTE: This regex is intentionally permissive for typing (e.g. "1.", ".2")
  };

  // TRASH: up to 3 decimals, enforce min/max
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

    // If user is mid-typing something like "." let it pass quietly
    if (!Number.isFinite(num)) {
      setLocalTrashFee(value);
      setErrorMessage('');
      return;
    }

    // ✅ min burn fee
    if (num < 10000) {
      setErrorMessage('Trash Fee must be at least 10,000 TRASH.');
      setLocalTrashFee(value);
      return;
    }

    if (num > 100000) {
      setErrorMessage('Trash Fee cannot exceed 100,000 TRASH.');
      setLocalTrashFee(value);
      return;
    }

    setLocalTrashFee(value);
    if (setTrashFee) setTrashFee(value);
    setErrorMessage('');
  };

  // CINDER: up to 6 decimals, 0.000001 <= value <= 3
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

    // If user is mid-typing something like "." or "0." let it pass quietly
    if (!Number.isFinite(num)) {
      setLocalCinderReward(value);
      setErrorMessage('');
      return;
    }

    if (num === 0) {
      setErrorMessage('Cinder Reward must be greater than 0.');
      setLocalCinderReward(value);
      return;
    }

    if (num < 0.000001) {
      setErrorMessage('Minimum Cinder Reward is 0.000001 CINDER.');
      setLocalCinderReward(value);
      return;
    }

    if (num > 3) {
      setErrorMessage('Cinder Reward must not exceed 3.000000 CINDER.');
      setLocalCinderReward(value);
      return;
    }

    setLocalCinderReward(value);
    if (setCinderReward) setCinderReward(value);
    setErrorMessage('');
  };

  // CAP: integer only, >= 1
  const handleCapChange = (e) => {
    const value = e.target.value;

    if (value === '') {
      setLocalCap('');
      setErrorMessage('');
      return;
    }

    if (!/^\d*$/.test(value)) {
      setLocalCap(value);
      setErrorMessage('Cap must be a whole number.');
      return;
    }

    const n = Number(value);
    if (!Number.isFinite(n)) {
      setLocalCap(value);
      setErrorMessage('');
      return;
    }

    if (n < 1) {
      setLocalCap(value);
      setErrorMessage('Cap must be at least 1.');
      return;
    }

    if (n > 100000) {
      setLocalCap(value);
      setErrorMessage('Cap cannot exceed 100000.');
      return;
    }

    setLocalCap(value);
    setErrorMessage('');
  };

  const onSubmit = () => {
    // ✅ proposal fee is static; still must exist
    if (!localTrashFee || !localCinderReward || !localCap || !localProposalStake) {
      setErrorMessage('Please enter values for Proposal Fee, Cap, Trash Fee, and Cinder Reward.');
      return;
    }

    // Template proposal requires templateId > 0
    if (proposalMode === 'template') {
      const n = Number(templateId);
      if (!Number.isFinite(n) || n <= 0) {
        setErrorMessage('Select a Template first, or switch to Schema Proposal.');
        return;
      }
    }

    const stakeValue = parseFloat(localProposalStake);
    const capValue = parseInt(localCap, 10);
    const trashFeeValue = parseFloat(localTrashFee);
    const cinderRewardValue = parseFloat(localCinderReward);

    if (
      !Number.isFinite(stakeValue) ||
      !Number.isFinite(capValue) ||
      !Number.isFinite(trashFeeValue) ||
      !Number.isFinite(cinderRewardValue)
    ) {
      setErrorMessage('Please enter valid numeric values.');
      return;
    }

    // ✅ Proposal Fee constraints (static, but validate anyway)
    if (stakeValue < 1000) {
      setErrorMessage('Proposal Fee must be at least 1,000 TRASH.');
      return;
    }
    if (stakeValue > 1000000) {
      setErrorMessage('Proposal Fee must not exceed 1,000,000 TRASH.');
      return;
    }

    if (capValue < 1) {
      setErrorMessage('Cap must be at least 1.');
      return;
    }

    // ✅ burn fee constraints (rule param)
    if (trashFeeValue < 10000) {
      setErrorMessage('Trash Fee must be at least 10,000 TRASH.');
      return;
    }
    if (trashFeeValue > 100000) {
      setErrorMessage('Trash Fee must not exceed 100,000 TRASH.');
      return;
    }

    // CINDER min/max
    if (cinderRewardValue < 0.000001) {
      setErrorMessage('Cinder Reward must be at least 0.000001 CINDER.');
      return;
    }
    if (cinderRewardValue > 3) {
      setErrorMessage('Cinder Reward must not exceed 3.000000 CINDER.');
      return;
    }

    const formattedTrashFee = trashFeeValue.toFixed(3);
    const formattedCinderReward = cinderRewardValue.toFixed(6);
    const formattedStake = stakeValue.toFixed(3);
    const capInt = String(capValue);

    if (setTrashFee) setTrashFee(`${formattedTrashFee} TRASH`);
    if (setCinderReward) setCinderReward(`${formattedCinderReward} CINDER`);

    if (handleProposalSubmit) {
      handleProposalSubmit({
        // keep payload key name to avoid breaking parent code
        proposalStake: `${formattedStake} TRASH`,
        cap: capInt,
        trashFee: `${formattedTrashFee} TRASH`,
        cinderReward: `${formattedCinderReward} CINDER`,
        proposalMode,
        templateId: proposalMode === 'schema' ? '0' : templateId,
        proposalType,
      });
    } else {
      setErrorMessage('Error: Proposal submission handler is not defined.');
    }
  };

  // button disabled logic
  const stakeNum = parseFloat(localProposalStake);
  const capNum = parseInt(localCap, 10);
  const trashNum = parseFloat(localTrashFee);
  const cinderNum = parseFloat(localCinderReward);

  const stakeInRange =
    localProposalStake !== '' &&
    !Number.isNaN(stakeNum) &&
    stakeNum >= 1000 &&
    stakeNum <= 1000000;

  const capInRange = localCap !== '' && !Number.isNaN(capNum) && capNum >= 1 && capNum <= 100000;

  const trashInRange =
    localTrashFee !== '' &&
    !Number.isNaN(trashNum) &&
    trashNum >= 10000 &&
    trashNum <= 100000;

  const cinderInRange =
    localCinderReward !== '' &&
    !Number.isNaN(cinderNum) &&
    cinderNum >= 0.000001 &&
    cinderNum <= 3;

  const isSubmitDisabled =
    !localProposalStake ||
    !localCap ||
    !localTrashFee ||
    !localCinderReward ||
    !!errorMessage ||
    !stakeInRange ||
    !capInRange ||
    !trashInRange ||
    !cinderInRange;

  const handleClose = () => {
    setErrorMessage('');
    setLocalTrashFee(initialTrashFee || '10000');
    setLocalCinderReward(initialCinderReward || '0.5');
    setLocalCap(initialCap || '10');
    setLocalProposalStake(initialProposalStake || '100000');
    if (onClose) onClose();
  };

  const formattedFeeLabel = (() => {
    const n = parseFloat(localProposalStake);
    if (!Number.isFinite(n)) return '';
    return `${n.toFixed(3)} TRASH`;
  })();

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>
          {proposalMode === 'schema'
            ? 'Create a Schema Burn Proposal'
            : 'Create a Template Burn Proposal'}
        </h3>

        <div className="proposal-type-toggle">
          <button
            type="button"
            className={proposalMode === 'schema' ? 'active' : ''}
            onClick={() => setProposalMode('schema')}
          >
            Schema Proposal
          </button>
          <button
            type="button"
            className={proposalMode === 'template' ? 'active' : ''}
            onClick={() => setProposalMode('template')}
            disabled={!templateId || Number(templateId) <= 0}
            title={
              !templateId || Number(templateId) <= 0
                ? 'Select a template to enable template proposals'
                : ''
            }
          >
            Template Proposal
          </button>
        </div>

        <p>
          {proposalMode === 'schema' ? (
            <>
              Collection: <strong>{collection || '—'}</strong>
              <br />
              Schema: <strong>{schema || '—'}</strong>
              <br />
              Template ID: <strong>0</strong>
            </>
          ) : (
            <>
              Collection: <strong>{collection || '—'}</strong>
              <br />
              Schema: <strong>{schema || '—'}</strong>
              <br />
              Template ID: <strong>{templateId}</strong>
            </>
          )}
        </p>

        <p className="proposal-fee-note">
          Note: Creating a proposal is done by transferring TRASH to the contract with a proposal
          memo.
        </p>

        <p className="proposal-note">
          The burn fee must be at least 10,000 TRASH and not exceed 100,000 TRASH.
        </p>

        <p className="proposal-note">
          The CINDER reward must be between 0.000001 and 3.000000 CINDER.
        </p>

        <div className="modal-field">
          <label>Proposal Type:</label>
          <input type="text" value={proposalType} readOnly />
        </div>

        {/* ✅ STATIC PROPOSAL FEE (cannot be changed) */}
        <div className="modal-field">
          <label>Proposal Fee (TRASH):</label>
          <input
            type="text"
            value={formattedFeeLabel || `${localProposalStake} TRASH`}
            readOnly
            disabled
            title="This fee is set by the system."
          />
        </div>

        <div className="modal-field">
          <label>Cap:</label>
          <input type="text" value={localCap} onChange={handleCapChange} placeholder="e.g. 10" />
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

        <button onClick={onSubmit} className="submit" disabled={isSubmitDisabled}>
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

