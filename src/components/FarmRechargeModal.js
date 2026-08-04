import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './FarmRechargeModal.css';

const ENERGY_PER_CINDER = 2;

function compactNumber(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export default function FarmRechargeModal({
  farm,
  cinderBalance = 0,
  pending = false,
  onConfirm,
  onClose,
}) {
  const [amount, setAmount] = useState('1');
  const [submitError, setSubmitError] = useState('');

  const numericAmount = Number(amount);
  const validation = useMemo(() => {
    if (amount === '' || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return 'Enter a CINDER amount greater than zero.';
    }
    if (numericAmount > Number(cinderBalance || 0)) {
      return 'This amount is greater than your available CINDER balance.';
    }
    return '';
  }, [amount, numericAmount, cinderBalance]);

  if (!farm || typeof document === 'undefined') return null;

  const estimatedEnergy = Number.isFinite(numericAmount) && numericAmount > 0
    ? numericAmount * ENERGY_PER_CINDER
    : 0;

  const submit = async (event) => {
    event.preventDefault();
    if (validation || pending) return;
    setSubmitError('');
    try {
      await onConfirm(numericAmount);
    } catch (error) {
      setSubmitError(error?.message || 'Farm recharge failed.');
    }
  };

  return createPortal(
    <div className="farm-recharge-overlay" role="presentation" onMouseDown={onClose}>
      <form
        className="farm-recharge-modal"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="farm-recharge-header">
          <div>
            <span className="farm-recharge-eyebrow">Farm energy</span>
            <h3>Recharge Farm</h3>
          </div>
          <button type="button" className="farm-recharge-close" onClick={onClose} disabled={pending}>
            ×
          </button>
        </div>

        <div className="farm-recharge-summary">
          <div>
            <span>Farm</span>
            <strong>{farm.name || `Farm #${String(farm.asset_id).slice(-5)}`}</strong>
          </div>
          <div>
            <span>Current energy</span>
            <strong>⚡ {compactNumber(farm.farm_energy)}</strong>
          </div>
          <div>
            <span>Battery</span>
            <strong>{farm.cell_asset_id ? `#${farm.cell_asset_id}` : 'Not equipped'}</strong>
          </div>
          <div>
            <span>Available</span>
            <strong>{compactNumber(cinderBalance)} CINDER</strong>
          </div>
        </div>

        <label className="farm-recharge-field">
          <span>CINDER to spend</span>
          <div className="farm-recharge-input-row">
            <input
              type="number"
              inputMode="decimal"
              min="0.000001"
              step="0.000001"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              autoFocus
              disabled={pending}
            />
            <button
              type="button"
              onClick={() => setAmount(String(cinderBalance || ''))}
              disabled={pending || Number(cinderBalance || 0) <= 0}
            >
              Max
            </button>
          </div>
        </label>

        <div className="farm-recharge-preview">
          <span>Estimated energy added</span>
          <strong>+{compactNumber(estimatedEnergy)} ⚡</strong>
          <small>Current on-chain rate: 1 CINDER grants 2 farm energy, up to capacity.</small>
        </div>

        {(validation || submitError) && (
          <div className="farm-recharge-error">{submitError || validation}</div>
        )}

        <div className="farm-recharge-actions">
          <button type="button" className="farm-recharge-cancel" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button type="submit" className="farm-recharge-confirm" disabled={Boolean(validation) || pending}>
            {pending ? 'Waiting for Anchor…' : `Recharge with ${compactNumber(numericAmount)} CINDER`}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
