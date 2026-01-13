// src/services/userCellActions.js
import { InitTransaction } from '../hooks/useSession';

const FARM_CONTRACT =
  process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';

/**
 * Stake a User Energy Core (battery) by transferring it to the contract.
 * Contract on_notify should route this based on memo.
 *
 * ✅ Memo format (on_notify):
 *   "stake:usercell"
 *   (optional variant if you support it: "stake:usercell:<user>")
 */
export const stakeUserCell = async (accountName, asset_id, template_id) => {
  if (!accountName) throw new Error('Missing accountName');
  if (!asset_id) throw new Error('Missing asset_id');
  if (!template_id) throw new Error('Missing template_id');

  // ✅ on-notify staking memo
  const memo = 'stake:usercell';

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

  const result = await InitTransaction(dataTrx);
  if (!result?.transactionId) {
    throw new Error('User cell staking transaction failed.');
  }
  return result.transactionId;
};

/**
 * Unstake a User Energy Core (battery) using rmubat(user, ast_id).
 * Note: rmubat blocks unstake if energy would exceed remaining max capacity.
 */
export const unstakeUserCell = async (accountName, ast_id) => {
  if (!accountName) throw new Error('Missing accountName');
  if (!ast_id) throw new Error('Missing ast_id');

  const dataTrx = {
    actions: [
      {
        account: FARM_CONTRACT,
        name: 'rmubat',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          user: accountName,
          ast_id: String(ast_id),
        },
      },
    ],
  };

  const result = await InitTransaction(dataTrx);
  if (!result?.transactionId) {
    throw new Error('User cell unstake transaction failed.');
  }
  return result.transactionId;
};

