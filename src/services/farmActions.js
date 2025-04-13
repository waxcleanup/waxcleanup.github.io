// src/services/farmActions.js
import { InitTransaction } from '../hooks/useSession';

/**
 * Stake a farm NFT by transferring it to the rhythmfarmer contract.
 * @param {string} accountName - The WAX account name of the user.
 * @param {string|number} asset_id - The asset ID of the farm NFT to stake.
 * @param {string|number} template_id - The template ID of the NFT.
 * @returns {Promise<string>} - The transaction ID of the staking transaction.
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
    if (!result || !result.transactionId) throw new Error('Farm staking transaction failed.');
    return result.transactionId;
  } catch (error) {
    console.error('[ERROR] Stake farm failed:', error);
    throw new Error(error.message || 'Farm staking failed.');
  }
};

/**
 * Unstake a farm by calling the smart contract action directly.
 * @param {string} accountName - The WAX account name of the user.
 * @param {string|number} asset_id - The asset ID of the farm NFT to unstake.
 * @returns {Promise<string>} - The transaction ID of the unstake transaction.
 */
export const unstakeFarm = async (accountName, asset_id) => {
  if (!asset_id) throw new Error('Missing asset_id for unstake.');

  const dataTrx = {
    actions: [
      {
        account: 'rhythmfarmer',
        name: 'removefarm',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          asset_id: Number(asset_id),
        },
      },
    ],
  };

  try {
    const result = await InitTransaction(dataTrx);
    if (!result || !result.transactionId) throw new Error('Unstake transaction failed.');
    return result.transactionId.toString();
  } catch (error) {
    console.error('[ERROR] Unstake farm failed:', error);
    throw new Error(error.message || 'Farm unstaking failed.');
  }
};
