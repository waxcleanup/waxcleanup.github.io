// src/services/depositActions.js
import { InitTransaction } from '../hooks/useSession';

/**
 * Generic NFT deposit → sends atomicassets::transfer
 * Memo format: "Deposit:<Type>:<asset_id>:<template_id>"
 */
const buildDepositTx = (accountName, type, asset_id, template_id) => {
  if (!accountName || !asset_id || !template_id) {
    throw new Error('Missing accountName, asset_id, or template_id for deposit.');
  }

  const memo = `Deposit:${type}:${asset_id}:${template_id}`;

  return {
    actions: [
      {
        account: 'atomicassets',
        name: 'transfer',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          from: accountName,
          to: 'rhythmfarmer',              // 👈 matches RHYTHMFARMER_ACCOUNT
          asset_ids: [String(asset_id)],
          memo,
        },
      },
    ],
  };
};

/**
 * Deposit a Compost NFT (triggers dptcompost on backend listener)
 */
export const depositCompost = async (accountName, asset_id, template_id) => {
  const dataTrx = buildDepositTx(accountName, 'Compost', asset_id, template_id);

  try {
    const result = await InitTransaction(dataTrx);
    if (!result?.transactionId) {
      throw new Error('Compost deposit transaction failed.');
    }
    return result.transactionId;
  } catch (err) {
    console.error('[ERROR] Compost deposit failed:', err);
    throw new Error(err.message || 'Failed to deposit compost.');
  }
};

/**
 * Deposit / Open a Pack NFT (triggers openpack on backend listener)
 */
export const depositPack = async (accountName, asset_id, template_id) => {
  const dataTrx = buildDepositTx(accountName, 'Pack', asset_id, template_id);

  try {
    const result = await InitTransaction(dataTrx);
    if (!result?.transactionId) {
      throw new Error('Pack deposit transaction failed.');
    }
    return result.transactionId;
  } catch (err) {
    console.error('[ERROR] Pack deposit failed:', err);
    throw new Error(err.message || 'Failed to deposit/open pack.');
  }
};
