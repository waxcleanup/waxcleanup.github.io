import React, { useEffect, useMemo, useState } from 'react';
import './VoteModal.css';

const DEFAULT_AMOUNT = '10000.000';

function isValidTrashAmount(v) {
  // allow "123", "123.4", "123.45", "123.456"
  if (!v) return false;
  if (!/^\d+(\.\d{0,3})?$/.test(String(v).trim())) return false;
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

function normalizeTrashAmount(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return '';
  return n.toFixed(3);
}

function parseMyStakedToAmount(proposal) {
  // Prefer exact formatted string from backend
  if (proposal?.my_staked_str) {
    const s = String(proposal.my_staked_str).trim();
    // "10000.000 TRASH" -> "10000.000"
    const first = s.split(' ')[0];
    if (isValidTrashAmount(first)) return normalizeTrashAmount(first);
  }

  // fallback numeric
  if (proposal?.my_staked != null) {
    const n = Number(proposal.my_staked);
    if (Number.isFinite(n) && n > 0) return n.toFixed(3);
  }

  return '';
}

export default function VoteModal({
  isOpen,
  onClose,
  onSubmit,
  proposal,
  voteForDefault = true,
  minAmount = null, // optional string/number like "1.000"
}) {
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [voteFor, setVoteFor] = useState(!!voteForDefault);
  const [error, setError] = useState('');

  const title = useMemo(() => {
    if (!proposal) return 'Vote';
    return `Vote on Proposal #${proposal.prop_id}`;
  }, [proposal]);

  useEffect(() => {
    if (!isOpen) return;

    setError('');

    // Prefill direction: if proposal already has my vote, show that
    if (proposal?.my_vote_for != null) {
      setVoteFor(!!proposal.my_vote_for);
    } else {
      setVoteFor(!!voteForDefault);
    }

    // Prefill amount: if user already has stake, default to their stake amount
    const prefill = parseMyStakedToAmount(proposal);
    setAmount(prefill || DEFAULT_AMOUNT);
  }, [isOpen, voteForDefault, proposal]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setError('');

    if (!proposal?.prop_id) {
      setError('Missing proposal.');
      return;
    }

    if (!isValidTrashAmount(amount)) {
      setError('Enter a valid TRASH amount (up to 3 decimals).');
      return;
    }

    const normalized = normalizeTrashAmount(amount);

    if (minAmount != null) {
      const minN = Number(minAmount);
      if (Number.isFinite(minN) && Number(normalized) < minN) {
        setError(`Minimum vote amount is ${Number(minN).toFixed(3)} TRASH.`);
        return;
      }
    }

    try {
      await onSubmit({
        propId: proposal.prop_id,
        voteFor,
        amountTrash: normalized,
      });

      // ✅ DON'T close here — parent closes after it refreshes proposals
      // onClose?.();
    } catch (e) {
      setError(e?.message || 'Vote failed.');
    }
  };

  return (
    <div className="vote-modal-backdrop" onMouseDown={onClose}>
      <div className="vote-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="vote-modal-header">
          <h3>{title}</h3>
          <button className="vote-modal-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {proposal && (
          <div className="vote-modal-meta">
            <div><b>Type:</b> {proposal.proposal_type}</div>
            <div><b>Collection:</b> {proposal.collection}</div>
            <div><b>Schema:</b> {proposal.schema}</div>
          </div>
        )}

        <div className="vote-modal-row">
          <label>Vote Direction</label>
          <div className="vote-modal-toggle">
            <button
              className={`toggle-btn ${voteFor ? 'active' : ''}`}
              onClick={() => setVoteFor(true)}
              type="button"
            >
              For
            </button>
            <button
              className={`toggle-btn ${!voteFor ? 'active' : ''}`}
              onClick={() => setVoteFor(false)}
              type="button"
            >
              Against
            </button>
          </div>
        </div>

        <div className="vote-modal-row">
          <label>TRASH Amount</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10000.000"
            inputMode="decimal"
            className="vote-modal-input"
          />
          <div className="vote-modal-hint">
            Sends: <code>{normalizeTrashAmount(amount) || '0.000'} TRASH</code> with memo{' '}
            <code>stakevote:{proposal?.prop_id}:{voteFor ? 'true' : 'false'}</code>
          </div>
        </div>

        {error ? <div className="vote-modal-error">{error}</div> : null}

        <div className="vote-modal-actions">
          <button className="btn-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSubmit} type="button">
            Submit Vote
          </button>
        </div>
      </div>
    </div>
  );
}

