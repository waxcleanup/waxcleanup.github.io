import TokenLogo from './TokenLogo';
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { loadFuel, loadEnergy } from '../services/transactionActions';

// Helper: normalize IPFS CIDs → full URL
const ipfsToUrl = (value) => {
  if (!value) return null;

  const gateway = process.env.REACT_APP_IPFS_GATEWAY || 'https://maestrobeatz.servegame.com/ipfs';

  if (value.includes('/ipfs/')) {
    return `${gateway.replace(/\/$/, '')}/${value.split('/ipfs/')[1]}`;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  // Strip common prefixes like ipfs:// or ipfs/
  const cleaned = value.replace(/^ipfs:\/\//, '').replace(/^ipfs\//, '');

  return `${gateway}/${cleaned}`;
};

const IncineratorDetails = ({
  incinerator,
  onRepair,
  onRemove,
  fetchIncineratorData,
  showButtons = true,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [transactionType, setTransactionType] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice,setNotice] = useState('');
  const [imgLoaded, setImgLoaded] = useState(true);

  const isEmpty = !incinerator;

  const {
    name = 'Unnamed Incinerator',
    fuel = 0,
    energy = 0,
    durability = 0,
    img,          // may be a CID or full URL
    imgCid,       // in case backend only sends imgCid
    owner = '',
    fuelCap = 100000,
    energyCap = 10,
  } = incinerator || {};

  const assetId = incinerator?.asset_id || incinerator?.id || 'N/A';

  const maxFuelCapacity = fuelCap;
  const maxEnergyCapacity = energyCap;
  const maxDurability = 500;

  const remainingFuelCapacity = useMemo(
    () => Math.max(0,maxFuelCapacity - fuel),
    [fuel, maxFuelCapacity]
  );

  // Decide which field to use and normalize it to a usable URL
  const imgUrl = useMemo(() => {
    const raw = img || imgCid || null;
    if (!raw) return null;
    return ipfsToUrl(raw);
  }, [img, imgCid]);

  const handleTransaction = async () => {
    let completed = false;
    setErrorMessage('');
    setLoading(true);
    try {
      if (transactionType === 'fuel') {
        const numericAmount = Number(amount);
        if (
          !Number.isSafeInteger(numericAmount) ||
          numericAmount <= 0 ||
          numericAmount > remainingFuelCapacity
        ) {
          setErrorMessage(
            `Enter a fuel amount between 1 and ${remainingFuelCapacity}.`
          );
          return;
        }
        await loadFuel(owner, assetId, numericAmount);
        setNotice('Fuel transaction accepted. Refreshing live readings…');
      } else if (transactionType === 'energy') {
        await loadEnergy(owner, assetId);
        setNotice('Energy transaction accepted. Refreshing live readings…');
      }

      window.dispatchEvent(new Event('cleanup:incinerator-changed'));
      await fetchIncineratorData();
      completed = true;
    } catch (error) {
      console.error('[ERROR] Transaction failed:', error);
      const rawMessage = String(error?.message || '');
      const friendlyMessage = rawMessage.toLowerCase().includes('overdrawn balance')
        ? 'Your wallet does not have enough TRASH for this fuel load. Reduce the amount or add TRASH, then try again.'
        : rawMessage || 'The transaction could not be completed. Please try again.';

      setErrorMessage(friendlyMessage);
    } finally {
      setLoading(false);
      if (completed) {
        setShowModal(false);
        setAmount('');
        setTransactionType('');
        setErrorMessage('');
      }
    }
  };

  const handleFuelClick = (e) => {
    e.stopPropagation();
    setTransactionType('fuel');
    setAmount('');
    setErrorMessage('');
    setShowModal(true);
  };

  const handleFuelInputChange = (e) => {
    const rawValue = e.target.value;
    if (rawValue === '') {
      setAmount('');
      setErrorMessage('');
      return;
    }

    const editableValue = rawValue.replace(/^0+(?=\d)/, '');
    const numericValue = Number(editableValue);

    if (numericValue > remainingFuelCapacity) {
      setAmount(String(remainingFuelCapacity));
      setErrorMessage(`Maximum fuel load is ${remainingFuelCapacity}.`);
    } else if (numericValue < 0) {
      setAmount('');
      setErrorMessage('');
    } else {
      setAmount(editableValue);
      setErrorMessage('');
    }
  };

  const handleEnergyClick = (e) => {
    e.stopPropagation();
    setTransactionType('energy');
    setErrorMessage('');
    setShowModal(true);
  };

  const handleImageError = () => {
    setImgLoaded(false);
  };

  if (isEmpty) {
    return <p>Click to assign an incinerator</p>;
  }

  return (
    <div className="incinerator-details">
      {imgLoaded && imgUrl ? (
        <img
          src={imgUrl}
          alt={name}
          className="incinerator-image"
          onError={handleImageError}
        />
      ) : (
        <div className="incinerator-placeholder">Image failed to load</div>
      )}

      <p className="incinerator-name">
        {name}
      </p>
      <p className="asset-id">
        Asset #{assetId}
      </p>

      <div className="progress-bar-container">
        <div
          className="progress-bar-fill fuel-bar"
          style={{ width: `${(fuel / maxFuelCapacity) * 100}%` }}
        />
        <span className="progress-bar-text">
          <TokenLogo symbol="TRASH" size={18} /> Fuel: {Number(fuel).toLocaleString()} / {Number(maxFuelCapacity).toLocaleString()}
        </span>
      </div>

      <div className="progress-bar-container">
        <div
          className="progress-bar-fill energy-bar"
          style={{ width: `${(energy / maxEnergyCapacity) * 100}%` }}
        />
        <span className="progress-bar-text">
          Energy: {energy}/{maxEnergyCapacity}
        </span>
      </div>

      <div className="progress-bar-container">
        <div
          className={`progress-bar-fill durability-bar ${
            durability <= 100 ? 'low' : ''
          }`}
          style={{ width: `${(durability / maxDurability) * 100}%` }}
        />
        <span className="progress-bar-text">
          Durability: {durability}/{maxDurability}
        </span>
      </div>

      {notice && <p className="inc-action-notice" role="status">{notice}</p>}
      {showButtons && (
        <div className="button-container organized-buttons">
          {onRemove && (
            <button
              className="remove-incinerator-button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              Unequip
            </button>
          )}
          <button className="fuel-button" disabled={remainingFuelCapacity<=0||loading} onClick={handleFuelClick}>
            {remainingFuelCapacity<=0 ? "Fuel full" : "Load TRASH fuel"}
          </button>
          <button className="energy-button" disabled={energy>=maxEnergyCapacity||loading} onClick={handleEnergyClick}>
            {energy>=maxEnergyCapacity ? "Energy full" : "Recharge energy"}
          </button>
          <button
            className="repair-button"
            disabled={durability>=maxDurability||loading}
            onClick={(e) => {
              e.stopPropagation();
              onRepair(incinerator);
            }}
          >
            Repair Durability
          </button>
        </div>
      )}

      {showModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="modal-overlay incinerator-transaction-overlay"
            onClick={(e) => {
              e.stopPropagation();
              if (!loading) setShowModal(false);
            }}
          >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h4>{transactionType === "fuel" ? "Load TRASH fuel" : "Recharge incinerator"}</h4><p className="inc-action-target">{name} · #{assetId}</p>

            {transactionType === 'fuel' ? (
              <>
                <p><TokenLogo symbol="TRASH" size={22}/>1 TRASH adds 1 fuel. Space available: <strong>{remainingFuelCapacity.toLocaleString()}</strong>.</p><label htmlFor={`fuel-${assetId}`}>TRASH to load</label>
                <input
                  id={`fuel-${assetId}`}
                  type="number"
                  step="1"
                  value={amount}
                  onChange={handleFuelInputChange}
                  placeholder="Fuel amount"
                  min="1"
                  max={remainingFuelCapacity}
                  disabled={loading}
                /><button type="button" disabled={loading} onClick={()=>setAmount(String(remainingFuelCapacity))}>Fill capacity</button><p>You pay: <strong>{amount || "0"} TRASH</strong>. Your wallet must cover this amount.</p>
              </>
            ) : (
              <p><TokenLogo symbol="CINDER" size={22}/>Recharge from <strong>{energy} / {maxEnergyCapacity}</strong> energy. Cost: <strong>2 CINDER</strong>.</p>
            )}

            {errorMessage && (
              <div className="incinerator-transaction-error" role="alert">
                <span className="incinerator-transaction-error-icon" aria-hidden="true">
                  !
                </span>
                <div>
                  <strong>Transaction not completed</strong>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            <div className="modal-buttons">
              <button onClick={handleTransaction} disabled={loading}>
                {loading ? 'Waiting for wallet…' : transactionType === 'fuel' ? 'Load fuel in wallet' : 'Recharge in wallet'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!loading) setShowModal(false);
                }}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
          document.body
        )}
    </div>
  );
};

IncineratorDetails.propTypes = {
  incinerator: PropTypes.shape({
    name: PropTypes.string,
    asset_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    fuel: PropTypes.number,
    energy: PropTypes.number,
    durability: PropTypes.number,
    img: PropTypes.string,    // CID or full URL
    imgCid: PropTypes.string, // backup, if backend only sends this
    owner: PropTypes.string,
    fuelCap: PropTypes.number,
    energyCap: PropTypes.number,
  }),
  onRepair: PropTypes.func.isRequired,
  onRemove: PropTypes.func,
  fetchIncineratorData: PropTypes.func.isRequired,
  showButtons: PropTypes.bool,
};

export default IncineratorDetails;

