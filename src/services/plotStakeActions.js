// src/services/plotStakeActions.js
import { InitTransaction } from '../hooks/useSession';

const FARM_CONTRACT =
  process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';

const ATOMIC_CONTRACT = 'atomicassets';

/**
 * Stake a Plot NFT to a farm.
 *
 * Transfer-based staking handled directly by the contract (on_notify).
 *
 * Memo format:
 *   "stake:plot:<farmId>"
 */
export const stakePlot = async (accountName, farmId, assetId) => {
  if (!accountName) throw new Error('Missing accountName');
  if (farmId == null || farmId === '') throw new Error('Missing farmId');
  if (!assetId) throw new Error('Missing assetId');

  const memo = `stake:plot:${String(farmId)}`;

  const dataTrx = {
    actions: [
      {
        account: ATOMIC_CONTRACT,
        name: 'transfer',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          from: accountName,
          to: FARM_CONTRACT,
          asset_ids: [String(assetId)],
          memo,
        },
      },
    ],
  };

  const result = await InitTransaction(dataTrx);
  if (!result?.transactionId) {
    throw new Error('Plot stake transaction failed.');
  }

  return result.transactionId;
};

/**
 * Unstake a Plot NFT (frontend-signed contract action).
 *
 * ✅ Contract action (from your plots.hpp): removeplot(owner, farm_id, plot_asset_id)
 *
 * NOTE:
 * removeplot removes the plot from the farm + resets slots.
 * If your contract/back-end also needs to transfer the NFT back to the user,
 * that is a separate step (depending on how you implemented NFT returns).
 */
export const unstakePlot = async (accountName, farmId, plotAssetId) => {
  if (!accountName) throw new Error('Missing accountName');
  if (farmId == null || farmId === '') throw new Error('Missing farmId');
  if (!plotAssetId) throw new Error('Missing plotAssetId');

  const dataTrx = {
    actions: [
      {
        account: FARM_CONTRACT,
        name: 'removeplot', // ✅ correct action name
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          owner: accountName,
          farm_id: String(farmId),
          plot_asset_id: String(plotAssetId),
        },
      },
    ],
  };

  const result = await InitTransaction(dataTrx);
  if (!result?.transactionId) throw new Error('Plot unstake transaction failed.');
  return result.transactionId;
};

