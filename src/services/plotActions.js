// src/services/plotActions.js
import { InitTransaction } from '../hooks/useSession';

const RHYTHM_FARMER_ACCOUNT =
  process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';

function isUserCancelled(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('request was cancelled') ||
    msg.includes('request was canceled') ||
    msg.includes('user cancelled') ||
    msg.includes('user canceled') ||
    msg.includes('user rejected') ||
    msg.includes('rejected') ||
    msg.includes('declined') ||
    err?.code === 402 ||
    err?.name === 'Canceled' ||
    err?.name === 'UserRejectedRequestError'
  );
}

function extractReadableError(err) {
  const msg = String(err?.message || err || '');

  // Common EOSIO assertion format:
  // "assertion failure with message: <text>"
  const m = msg.match(/assertion failure with message:\s*([^\n\r]+)/i);
  if (m?.[1]) return m[1].trim();

  // Some RPC errors have nested details
  const detail =
    err?.json?.error?.details?.[0]?.message ||
    err?.error?.details?.[0]?.message;
  if (detail) {
    const m2 = String(detail).match(/assertion failure with message:\s*(.+)/i);
    return (m2?.[1] || detail).trim();
  }

  return msg || 'Transaction failed.';
}

async function safeTransact(actions) {
  try {
    const result = await InitTransaction({ actions });
    return { ok: true, result };
  } catch (err) {
    if (isUserCancelled(err)) {
      return { ok: false, cancelled: true, message: 'Cancelled' };
    }
    return { ok: false, cancelled: false, message: extractReadableError(err), raw: err };
  }
}

export async function waterPlot(owner, plotAssetId, slotIndex) {
  if (!owner) return { ok: false, cancelled: false, message: 'Missing owner for waterPlot' };
  if (!plotAssetId && plotAssetId !== 0)
    return { ok: false, cancelled: false, message: 'Missing plotAssetId for waterPlot' };
  if (slotIndex === undefined || slotIndex === null)
    return { ok: false, cancelled: false, message: 'Missing slotIndex for waterPlot' };

  const actions = [
    {
      account: RHYTHM_FARMER_ACCOUNT,
      name: 'water',
      data: {
        owner,
        plot_asset_id: Number(plotAssetId),
        slot_index: Number(slotIndex),
      },
    },
  ];

  return safeTransact(actions);
}

export async function harvestPlot(owner, plotAssetId, slotIndex) {
  if (!owner) return { ok: false, cancelled: false, message: 'Missing owner for harvestPlot' };
  if (!plotAssetId && plotAssetId !== 0)
    return { ok: false, cancelled: false, message: 'Missing plotAssetId for harvestPlot' };
  if (slotIndex === undefined || slotIndex === null)
    return { ok: false, cancelled: false, message: 'Missing slotIndex for harvestPlot' };

  const actions = [
    {
      account: RHYTHM_FARMER_ACCOUNT,
      name: 'harvest',
      data: {
        owner,
        plot_asset_id: Number(plotAssetId),
        slot_index: Number(slotIndex),
      },
    },
  ];

  return safeTransact(actions);
}

