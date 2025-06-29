// src/services/farmCellActions.js
import { InitTransaction } from '../hooks/useSession';

/**
 * Stake a Farm Cell to a farm.
 * Memo format: "Stake Cell:<farm_id>:<asset_id>:<template_id>"
 */
export const stakeFarmCell = async (accountName, farm_id, asset_id, template_id) => {
  if (!farm_id || !asset_id || !template_id) {
    throw new Error('Missing farm_id, asset_id, or template_id for Farm Cell staking.');
  }

  const memo = `Stake Cell:${farm_id}:${asset_id}:${template_id}`;

  const dataTrx = {
    actions: [
      {
        account: 'atomicassets',
        name: 'transfer',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          from: accountName,
          to: 'rhythmfarmer',
          asset_ids: [String(asset_id)],
          memo,
        },
      },
    ],
  };

  try {
    const result = await InitTransaction(dataTrx);
    if (!result?.transactionId) {
      throw new Error('Farm Cell staking transaction failed.');
    }
    return result.transactionId;
  } catch (error) {
    console.error('[ERROR] Stake Farm Cell failed:', error);
    throw new Error(error.message || 'Farm Cell staking failed.');
  }
};

/**
 * Unstake a Farm Cell from a farm (requires zero energy).
 */
export const unstakeFarmCell = async (accountName, farm_id) => {
  if (!accountName || !farm_id) {
    throw new Error('Missing account name or farm_id');
  }

  const dataTrx = {
    actions: [
      {
        account: 'rhythmfarmer',
        name: 'rmfarmcell',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          user: accountName,
          farm_id: Number(farm_id),
        },
      },
    ],
  };

  try {
    const result = await InitTransaction(dataTrx);
    if (!result?.transactionId) {
      throw new Error('Farm Cell unstaking transaction failed.');
    }
    return result.transactionId;
  } catch (error) {
    console.error('[ERROR] Unstake Farm Cell failed:', error);
    throw new Error(error.message || 'Farm Cell unstaking failed.');
  }
};
