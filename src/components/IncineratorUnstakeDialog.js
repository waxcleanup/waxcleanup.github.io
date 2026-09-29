import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './IncineratorUnstakeDialog.css';

export default function IncineratorUnstakeDialog({ incinerator, onCancel, onConfirm }) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    cancelRef.current?.focus();
    return () => { dialog.close(); previousFocus?.focus?.(); };
  }, []);
  const fuel = Number(incinerator.fuel || 0);
  const energy = Number(incinerator.energy || 0);
  return createPortal(
    <dialog ref={dialogRef} className="inc-unstake-dialog" aria-labelledby="inc-unstake-title" aria-describedby="inc-unstake-description"
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onCancel(); }}
      onKeyDown={(event) => event.stopPropagation()}
      onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onCancel(); } }}>
      <div className="inc-unstake-content">
        <span className="inc-unstake-eyebrow">INCINERATOR · RETURN TO WALLET</span>
        <h2 id="inc-unstake-title">Unstake this incinerator?</h2>
        <p id="inc-unstake-description">Your NFT will leave the game’s staked inventory and return to your connected wallet.</p>
        <div className="inc-unstake-asset">
          <strong>{incinerator.name || 'Incinerator'}</strong>
          <span>Asset #{String(incinerator.asset_id || incinerator.id)}</span>
        </div>
        <div className="inc-unstake-resources">
          <div><span>Stored fuel</span><strong>{fuel.toLocaleString()}</strong></div>
          <div><span>Stored energy</span><strong>{energy.toLocaleString()}</strong></div>
        </div>
        <p className="inc-unstake-notice">{fuel > 0 || energy > 0 ? 'Stored fuel and energy will be lost when you unstake. They will not be refunded.' : 'This incinerator has no stored fuel or energy to lose.'}</p>
        <p className="inc-unstake-footer">You can stake the NFT again later.</p>
        <div className="inc-unstake-actions">
          <button ref={cancelRef} type="button" className="inc-unstake-cancel" onClick={onCancel}>Keep Staked</button>
          <button type="button" className="inc-unstake-confirm" onClick={onConfirm}>Unstake to Wallet</button>
        </div>
      </div>
    </dialog>, document.body);
}
