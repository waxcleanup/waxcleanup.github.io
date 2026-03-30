// src/services/depositActions.js
import { InitTransaction } from '../hooks/useSession';

const ATOMIC_CONTRACT =
  process.env.REACT_APP_ATOMICASSETS_ACCOUNT || 'atomicassets';
const RHYTHM_CONTRACT =
  process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';

/**
 * Shared helper:
 * transfer one NFT to rhythmfarmer with a specific memo
 */
async function transferNftWithMemo(wallet, assetId, memo, debugLabel = 'transferNftWithMemo') {
  if (!wallet) {
    throw new Error(`Missing wallet account for ${debugLabel}.`);
  }

  if (!assetId) {
    throw new Error(`Missing assetId for ${debugLabel}.`);
  }

  if (!memo) {
    throw new Error(`Missing memo for ${debugLabel}.`);
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
          memo: String(memo),
        },
      },
    ],
  };

  console.log(`[DEBUG] ${debugLabel} tx:`, tx);
  const result = await InitTransaction(tx);
  console.log(`[DEBUG] ${debugLabel} result:`, result);
  return result;
}

/**
 * Deposit Compost
 *
 * NFT transfer -> rhythmfarmer
 * Memo expected by contract router:
 *   "deposit:compost"
 */
export async function depositCompost(wallet, assetId) {
  return transferNftWithMemo(wallet, assetId, 'deposit:compost', 'depositCompost');
}

/**
 * Open Seed Pack
 *
 * NFT transfer -> rhythmfarmer
 * Memo expected by contract router:
 *   "open:seedpack"
 */
export async function depositPack(wallet, assetId) {
  return transferNftWithMemo(wallet, assetId, 'open:seedpack', 'depositPack');
}

/**
 * Open Crate / Pack Schema item
 *
 * Uses bag metadata returned by backend:
 * - open_memo
 * - recipe_id
 * - can_open
 *
 * Example:
 * {
 *   asset_id: "1099983319081",
 *   recipe_id: 1,
 *   open_method: "blend",
 *   open_memo: "BLEND:1",
 *   can_open: true
 * }
 */
export async function openCratePack(wallet, asset, overrideMemo = null) {
  if (!wallet) {
    throw new Error('Missing wallet account for openCratePack.');
  }

  const assetId = asset?.asset_id || asset?.assetId || asset;
  if (!assetId) {
    throw new Error('Missing assetId for openCratePack.');
  }

  if (asset?.can_open === false) {
    throw new Error('This crate cannot be opened yet.');
  }

  const memo =
    overrideMemo ||
    asset?.open_memo ||
    (asset?.recipe_id ? `BLEND:${asset.recipe_id}` : null);

  if (!memo) {
    throw new Error('Missing crate open_memo or recipe_id.');
  }

  return transferNftWithMemo(wallet, assetId, memo, 'openCratePack');
}

/**
 * Stake Tool
 *
 * NFT transfer -> rhythmfarmer
 * Contract on_notify handles memo:
 *   "stake:tool"
 */
export async function depositTool(wallet, assetId, templateId) {
  const result = await transferNftWithMemo(wallet, assetId, 'stake:tool', 'depositTool');
  console.log('[DEBUG] depositTool templateId (unused):', templateId);
  return result;
}