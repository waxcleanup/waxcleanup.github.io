// src/services/depositActions.js
import { InitTransaction } from '../hooks/useSession';

const ATOMIC_CONTRACT =
  process.env.REACT_APP_ATOMICASSETS_ACCOUNT || 'atomicassets';
const RHYTHM_CONTRACT =
  process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';

/**
 * Deposit Compost (contract-router version)
 *
 * NFT transfer -> rhythmfarmer
 * Memo expected by contract router:
 *   "deposit:compost"
 */
export async function depositCompost(wallet, assetId) {
  if (!wallet) throw new Error('Missing wallet account for depositCompost.');
  if (!assetId) throw new Error('Missing assetId for depositCompost.');

  const tx = {
    actions: [
      {
        account: ATOMIC_CONTRACT,
        name: 'transfer',
        authorization: [{ actor: wallet, permission: 'active' }],
        data: {
          from: wallet,
          to: RHYTHM_CONTRACT,
          asset_ids: [String(assetId)],
          memo: 'deposit:compost',
        },
      },
    ],
  };

  console.log('[DEBUG] depositCompost tx:', tx);
  const result = await InitTransaction(tx);
  console.log('[DEBUG] depositCompost result:', result);
  return result;
}

/**
 * Open Seed Pack (on-chain router)
 *
 * NFT transfer -> rhythmfarmer
 * Memo format expected by contract router:
 *   "open:seedpack"
 */
export async function depositPack(wallet, assetId) {
  if (!wallet) {
    throw new Error('Missing wallet account for depositPack.');
  }
  if (!assetId) {
    throw new Error('Missing assetId for depositPack.');
  }

  const tx = {
    actions: [
      {
        account: ATOMIC_CONTRACT,
        name: 'transfer',
        authorization: [
          {
            actor: wallet,
            permission: 'active',
          },
        ],
        data: {
          from: wallet,
          to: RHYTHM_CONTRACT,
          asset_ids: [String(assetId)],
          memo: 'open:seedpack',
        },
      },
    ],
  };

  console.log('[DEBUG] depositPack tx:', tx);
  const result = await InitTransaction(tx);
  console.log('[DEBUG] depositPack result:', result);
  return result;
}


/**
 * Stake Tool (contract-only)
 *
 * NFT transfer -> rhythmfarmer
 * Contract on_notify handles memo "stake:tool"
 */
export async function depositTool(wallet, assetId, templateId) {
  if (!wallet) {
    throw new Error('Missing wallet account for depositTool.');
  }
  if (!assetId) {
    throw new Error('Missing assetId for depositTool.');
  }

  const tx = {
    actions: [
      {
        account: ATOMIC_CONTRACT,
        name: 'transfer',
        authorization: [
          {
            actor: wallet,
            permission: 'active',
          },
        ],
        data: {
          from: wallet,
          to: RHYTHM_CONTRACT,
          asset_ids: [String(assetId)],
          memo: 'stake:tool', // ✅ NEW contract router
        },
      },
    ],
  };

  console.log('[DEBUG] depositTool tx:', tx, { templateId }); // templateId no longer needed
  const result = await InitTransaction(tx);
  console.log('[DEBUG] depositTool result:', result);
  return result;
}


