// src/services/farmActions.js
import { InitTransaction } from '../hooks/useSession';

/**
 * Stake a farm NFT by transferring it to the rhythmfarmer contract.
 * Memo format: "Stake Farm:<asset_id>:<template_id>"
 */
export const stakeFarm = async (accountName, asset_id, template_id) => {
  if (!asset_id || !template_id) {
    throw new Error('Missing asset_id or template_id for farm staking.');
  }

  const memo = `Stake Farm:${asset_id}:${template_id}`;

  const dataTrx = {
    actions: [
      {
        account: 'atomicassets',
        name:    'transfer',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          from:      accountName,
          to:        'rhythmfarmer',
          asset_ids: [String(asset_id)],
          memo,
        },
      },
    ],
  };

  try {
    const result = await InitTransaction(dataTrx);
    if (!result?.transactionId) {
      throw new Error('Farm staking transaction failed.');
    }
    return result.transactionId;
  } catch (error) {
    console.error('[ERROR] Stake farm failed:', error);
    throw new Error(error.message || 'Farm staking failed.');
  }
};

/**
 * Unstake a farm via backend API (production-safe method)
 */
export const unstakeFarm = async (accountName, asset_id) => {
  if (!accountName || !asset_id) {
    throw new Error('Missing account name or asset ID');
  }

  try {
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/farms/unstake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: accountName, asset_id }),
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'Unstake failed');
    return result.transaction_id;
  } catch (err) {
    console.error('[API ERROR] Failed to unstake via backend:', err);
    throw err;
  }
};
