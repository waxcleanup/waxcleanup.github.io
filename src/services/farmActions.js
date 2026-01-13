// src/services/farmActions.js
import { InitTransaction } from '../hooks/useSession';

const FARM_CONTRACT =
  process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';

const TOKEN_CONTRACT =
  process.env.REACT_APP_CINDER_CONTRACT || 'cleanuptoken';

const CINDER_SYMBOL = process.env.REACT_APP_CINDER_SYMBOL || 'CINDER';
const CINDER_PRECISION = Number(process.env.REACT_APP_CINDER_PRECISION || 6);

/**
 * Stake a farm NFT by transferring it to the rhythmfarmer contract.
 * Memo format: "Stake Farm:<asset_id>:<template_id>"
 */
export const stakeFarm = async (accountName, asset_id, template_id) => {
  if (!accountName) throw new Error('Missing accountName');
  if (!asset_id || !template_id) {
    throw new Error('Missing asset_id or template_id for farm staking.');
  }

  const memo = `Stake Farm:${asset_id}:${template_id}`;

  const dataTrx = {
    actions: [
      {
        account: 'atomicassets',
        name: 'transfer',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          from: accountName,
          to: FARM_CONTRACT,
          asset_ids: [String(asset_id)],
          memo,
        },
      },
    ],
  };

  try {
    const result = await InitTransaction(dataTrx);
    if (!result?.transactionId) throw new Error('Farm staking transaction failed.');
    return result.transactionId;
  } catch (error) {
    console.error('[ERROR] Stake farm failed:', error);
    throw new Error(error.message || 'Farm staking failed.');
  }
};

/**
 * Unstake a farm ON-CHAIN (user-signed).
 * Expected contract action: unstakefarm(owner, asset_id)
 */
export const unstakeFarm = async (accountName, asset_id) => {
  if (!accountName) throw new Error('Missing accountName');
  if (!asset_id) throw new Error('Missing asset_id');

  const dataTrx = {
    actions: [
      {
        account: FARM_CONTRACT,
        name: 'unstakefarm',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          owner: accountName,
          asset_id: String(asset_id),
        },
      },
    ],
  };

  try {
    const result = await InitTransaction(dataTrx);
    if (!result?.transactionId) throw new Error('Farm unstake transaction failed.');
    return result.transactionId;
  } catch (error) {
    console.error('[ERROR] Unstake farm failed:', error);
    throw new Error(error.message || 'Farm unstake failed.');
  }
};

/**
 * Recharge a farm by sending CINDER to the farm contract.
 *
 * Transfer memo format: "Recharge Farm:<farm_id>"
 * Backend listener will call: chargefarm(farm_id, qty)
 *
 * amount can be:
 *  - a number (recommended)
 *  - a numeric string ("1", "1.25")
 *  - OR a fully formatted quantity ("1.000000 CINDER") (supported)
 *
 * IMPORTANT:
 * - farm_id is uint64 -> keep as STRING to avoid JS precision loss.
 */
export const rechargeFarm = async (accountName, farm_id, amount) => {
  if (!accountName) throw new Error('Missing accountName');
  if (farm_id == null || farm_id === '') throw new Error('Missing farm_id');

  const farmIdStr = String(farm_id);
  const memo = `Recharge Farm:${farmIdStr}`;

  let quantity;

  // If caller already passed a quantity string like "1.000000 CINDER"
  if (typeof amount === 'string' && amount.includes(' ')) {
    quantity = amount.trim();
  } else {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      throw new Error('Recharge amount must be greater than zero');
    }
    quantity = `${numeric.toFixed(CINDER_PRECISION)} ${CINDER_SYMBOL}`;
  }

  const dataTrx = {
    actions: [
      {
        account: TOKEN_CONTRACT,
        name: 'transfer',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          from: accountName,
          to: FARM_CONTRACT,
          quantity,
          memo,
        },
      },
    ],
  };

  try {
    const result = await InitTransaction(dataTrx);
    if (!result?.transactionId) throw new Error('Farm recharge transaction failed.');
    return result.transactionId;
  } catch (error) {
    console.error('[ERROR] Recharge farm failed:', error);
    throw new Error(error.message || 'Farm recharge failed.');
  }
};

