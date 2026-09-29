import React, { useRef, useState } from 'react';
import QuickBagPicker from './QuickBagPicker';
import { stakePlot } from '../services/plotStakeActions';

export default function FarmPlotStakeControl({ wallet, farmId, blocked, onChanged }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function confirm(asset) {
    if (lock.current || blocked || !wallet || !farmId) return;
    lock.current = true; setPending(String(asset.asset_id)); setError('');
    try {
      await stakePlot(wallet, String(farmId), String(asset.asset_id));
      setOpen(false);
      await onChanged?.({ type: 'plot_staked', farmId, plotAssetId: String(asset.asset_id) });
    } catch (e) { setError(e.message || 'Plot staking failed or was cancelled.'); }
    finally { lock.current = false; setPending(null); }
  }
  return <>
    <button type="button" disabled={!wallet || !farmId || blocked || Boolean(pending)} onClick={() => { setError(''); setOpen(true); }}>Stake plot</button>
    <QuickBagPicker open={open} wallet={wallet} category="plots" title={`Stake a plot in farm #${farmId}`} actionLabel="Stake plot" actionError={error} pendingAssetId={pending} onConfirm={confirm} onClose={() => { if (!lock.current) setOpen(false); }} />
    {!open && error && <small role="alert">{error}</small>}
  </>;
}
