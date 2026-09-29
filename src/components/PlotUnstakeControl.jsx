import React from 'react';

export default function PlotUnstakeControl({ plot, wallet, pending, unstaking, onUnstake }) {
  const owned = Boolean(wallet) && String(plot.owner) === String(wallet);
  const hasCrop = (plot.slots || []).some(slot => {
    const state = String(slot?.state || '').toUpperCase();
    return state !== 'EMPTY' && (state === 'GROWING' || state === 'READY' || Number(slot?.seed_tpl_id || 0) > 0);
  });
  const reason = !owned ? 'Only the plot owner can unstake.' : hasCrop ? 'Harvest or remove all crops in this plot before unstaking.' : '';
  return <div className="farm3d-unstake">
    <button type="button" className="unstake-plot-btn" disabled={!owned || hasCrop || pending} title={reason || 'Return this plot NFT to your wallet'} onClick={() => onUnstake(plot.plot_asset_id)}>{unstaking ? 'Unstaking…' : 'Unstake plot'}</button>
    {reason && <small>{reason}</small>}
  </div>;
}
