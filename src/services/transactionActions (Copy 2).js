// src/services/transactionActions.js

import axios from 'axios';
import { InitTransaction } from '../hooks/useSession';
import {
  ATOMIC_ASSETS_BASE,
  ATOMIC_ASSETS_CONTRACT,
} from './atomicAssetsService';

// ✅ removed: memoEncryption (no more ENC memos)
// import { encryptBurnPayload } from './memoEncryption';

/**
 * Stake an incinerator by transferring it to the contract.
 * Contract expects memo: "stakeincin:<template_id>"
 */
export const stakeIncinerator = async (accountName, incinerator) => {
  if (!incinerator) throw new Error('No incinerator selected for staking.');

  const asset_id = incinerator.asset_id || incinerator.id;
  if (!asset_id) {
    throw new Error('Selected incinerator is missing asset_id or id.');
  }

  let template_id;
  try {
    // Fetch template_id dynamically using asset_id
    const response = await axios.get(`${ATOMIC_ASSETS_BASE}/assets/${asset_id}`);
    template_id = response?.data?.data?.template?.template_id;

    if (!template_id) {
      throw new Error('Failed to fetch template_id from AtomicAssets API.');
    }

    console.log('[DEBUG] Fetched template_id:', template_id);
  } catch (error) {
    console.error('[ERROR] Error fetching template_id:', error.message || error);
    throw new Error('Could not fetch template_id for the selected incinerator.');
  }

  // ✅ MUST MATCH contract memo router
  const memo = `stakeincin:${String(template_id)}`;

  const dataTrx = {
    actions: [
      {
        account: ATOMIC_ASSETS_CONTRACT,
        name: 'transfer',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          from: accountName,
          to: 'cleanupcentr',
          asset_ids: [String(asset_id)],
          memo,
        },
      },
    ],
  };

  try {
    console.log('[DEBUG] Initiating stake transaction:', dataTrx);

    const result = await InitTransaction(dataTrx);
    console.log('[DEBUG] Stake transaction result:', result);

    if (!result?.transactionId) {
      throw new Error(
        `Staking transaction failed for asset_id: ${asset_id}. Missing transaction ID.`
      );
    }

    return result.transactionId;
  } catch (error) {
    console.error(
      `[ERROR] Error during staking transaction for asset_id: ${asset_id}`,
      error.message || error
    );
    throw new Error(
      error.message ||
        `Failed to stake incinerator (asset_id: ${asset_id}). Please try again.`
    );
  }
};

/**
 * Burn an NFT using an incinerator by transferring it to the contract.
 * Contract expects memo: "burn:<incinerator_id>"
 */
export const burnNFT = async (accountName, nft, incinerator) => {
  if (!nft || !incinerator) {
    throw new Error('Both an NFT and an incinerator must be selected for burning.');
  }

  const nftAssetId = String(nft.asset_id || '');
  if (!nftAssetId) {
    console.error('[ERROR] Invalid NFT object:', nft);
    throw new Error('Selected NFT is invalid. Missing asset_id.');
  }

  const incId = String(incinerator.asset_id || incinerator.id || '');
  if (!incId || incId === '0') {
    console.error('[ERROR] Invalid incinerator object:', incinerator);
    throw new Error('Selected incinerator is invalid. Missing asset_id or id.');
  }

  // ✅ MUST MATCH contract memo router (NO encryption)
  const memo = `burn:${incId}`;

  const dataTrx = {
    actions: [
      {
        account: ATOMIC_ASSETS_CONTRACT, // usually "atomicassets"
        name: 'transfer',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          from: accountName,
          to: 'cleanupcentr',
          asset_ids: [nftAssetId],
          memo,
        },
      },
    ],
  };

  try {
    console.log('[DEBUG] Initiating burn transaction for NFT:', nftAssetId, 'memo:', memo);

    const result = await InitTransaction(dataTrx);
    console.log('[DEBUG] Burn transaction result:', result);

    if (!result?.transactionId) {
      throw new Error(
        `Burn transaction failed for NFT: ${nftAssetId}. Missing transaction ID.`
      );
    }

    return result.transactionId;
  } catch (error) {
    console.error(
      `[ERROR] Error during burn transaction for NFT: ${nftAssetId}`,
      error.message || error
    );
    throw new Error(
      error.message || `Failed to burn NFT (asset_id: ${nftAssetId}). Please try again.`
    );
  }
};

/**
 * Load fuel into an incinerator.
 * Memo: "loadfuel:<incinerator_id>"
 */
export const loadFuel = async (accountName, incineratorId, amount) => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Fuel amount must be a positive integer.');
  }

  const dataTrx = {
    actions: [
      {
        account: 'cleanuptoken',
        name: 'transfer',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          from: accountName,
          to: 'cleanupcentr',
          quantity: `${Number(amount).toFixed(3)} TRASH`,
          memo: `loadfuel:${String(incineratorId)}`,
        },
      },
    ],
  };

  try {
    console.log('[DEBUG] Initiating load fuel transaction:', dataTrx);

    const result = await InitTransaction(dataTrx);
    console.log('[DEBUG] Load fuel transaction result:', result);

    if (!result?.transactionId) {
      throw new Error(
        `Load fuel transaction failed for incinerator_id: ${incineratorId}. Missing transaction ID.`
      );
    }

    return result.transactionId;
  } catch (error) {
    console.error(
      `[ERROR] Error during load fuel transaction for incinerator_id: ${incineratorId}`,
      error.message || error
    );
    throw new Error(
      error.message || `Failed to load fuel into incinerator ${incineratorId}. Please try again.`
    );
  }
};

/**
 * Load energy into an incinerator.
 * Memo: "loadenergy:<incinerator_id>"
 */
export const loadEnergy = async (accountName, incineratorId) => {
  const dataTrx = {
    actions: [
      {
        account: 'cleanuptoken',
        name: 'transfer',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          from: accountName,
          to: 'cleanupcentr',
          quantity: `2.000000 CINDER`,
          memo: `loadenergy:${String(incineratorId)}`,
        },
      },
    ],
  };

  try {
    console.log('[DEBUG] Initiating load energy transaction:', dataTrx);

    const result = await InitTransaction(dataTrx);
    console.log('[DEBUG] Load energy transaction result:', result);

    if (!result?.transactionId) {
      throw new Error(
        `Load energy transaction failed for incinerator_id: ${incineratorId}. Missing transaction ID.`
      );
    }

    return result.transactionId;
  } catch (error) {
    console.error(
      `[ERROR] Error during load energy transaction for incinerator_id: ${incineratorId}`,
      error.message || error
    );
    throw new Error(
      error.message || `Failed to load energy into incinerator ${incineratorId}. Please try again.`
    );
  }
};

/**
 * Repair an incinerator by sending CINDER to the contract.
 * Memo: "repairincin:<incinerator_id>"
 */
export const repairIncinerator = async (accountName, incineratorId, points) => {
  if (!Number.isInteger(points) || points < 1) {
    throw new Error('Repair points must be a positive integer.');
  }

  const quantity = `${points.toFixed(6)} CINDER`;
  const memo = `repairincin:${String(incineratorId)}`;

  const dataTrx = {
    actions: [
      {
        account: 'cleanuptoken',
        name: 'transfer',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: { from: accountName, to: 'cleanupcentr', quantity, memo },
      },
    ],
  };

  try {
    console.log('[DEBUG] Initiating repair transaction:', dataTrx);
    const result = await InitTransaction(dataTrx);

    if (!result?.transactionId) {
      throw new Error(`Repair failed for incinerator ${incineratorId}.`);
    }

    return result.transactionId;
  } catch (error) {
    console.error('[ERROR] Repair transaction error:', error.message || error);
    throw new Error(error.message || `Failed to repair incinerator ${incineratorId}.`);
  }
};

/**
 * Unstake an incinerator by calling the backend route.
 */
export const unstakeIncinerator = async (accountName, incinerator) => {
  const asset_id = incinerator.asset_id || incinerator.id;
  if (!asset_id) {
    throw new Error('Invalid incinerator object. Missing asset_id or id.');
  }

  try {
    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/incinerators/unstake`,
      { owner: accountName, incinerator_id: asset_id }
    );

    const result = response.data;
    if (!result.success) throw new Error(result.message || 'Unstake failed');

    return result.tx;
  } catch (error) {
    console.error('[UNSTAKE ERROR]', error.message || error);
    throw new Error(error.message || 'Unstake transaction failed');
  }
};

/**
 * Finalize a repair by calling the backend route.
 */
export const finalizeRepair = async (accountName, incineratorId) => {
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/finalize-repair`,
      { user: accountName, incinerator_id: incineratorId }
    );

    const data = response.data;
    if (data.success) {
      return data.result?.transaction_id || data.result?.transactionId || data.result;
    }

    throw new Error(data.error || 'Failed to finalize repair');
  } catch (error) {
    console.error('[ERROR] finalizeRepair error:', error.message || error);
    throw new Error(error.message || 'Failed to finalize repair');
  }
};

// ======================================================
// ✅ Incinerator Slotting (contract-managed)
// actions:
//   setincslot(user, slot, incinerator_id)
//   clearincslot(user, slot)
// ======================================================

export const setIncineratorSlot = async (accountName, slotIndex, incineratorId) => {
  const slot = Number(slotIndex);
  const id = String(incineratorId);

  if (!accountName) throw new Error('Missing accountName.');
  if (!Number.isInteger(slot) || slot < 0) throw new Error('Invalid slot index.');
  if (!id || id === '0') throw new Error('Invalid incinerator id.');

  const dataTrx = {
    actions: [
      {
        account: 'cleanupcentr',
        name: 'setincslot',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          user: accountName,
          slot,
          incinerator_id: id,
        },
      },
    ],
  };

  try {
    console.log('[DEBUG] Initiating setIncineratorSlot:', dataTrx);
    const result = await InitTransaction(dataTrx);

    if (!result?.transactionId) {
      throw new Error(`Failed to equip incinerator ${id} into slot ${slot}.`);
    }
    return result.transactionId;
  } catch (error) {
    console.error('[ERROR] setIncineratorSlot error:', error.message || error);
    throw new Error(error.message || 'Failed to equip incinerator. Please try again.');
  }
};

export const clearIncineratorSlot = async (accountName, slotIndex) => {
  const slot = Number(slotIndex);

  if (!accountName) throw new Error('Missing accountName.');
  if (!Number.isInteger(slot) || slot < 0) throw new Error('Invalid slot index.');

  const dataTrx = {
    actions: [
      {
        account: 'cleanupcentr',
        name: 'clearincslot',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          user: accountName,
          slot,
        },
      },
    ],
  };

  try {
    console.log('[DEBUG] Initiating clearIncineratorSlot:', dataTrx);
    const result = await InitTransaction(dataTrx);

    if (!result?.transactionId) {
      throw new Error(`Failed to clear incinerator slot ${slot}.`);
    }
    return result.transactionId;
  } catch (error) {
    console.error('[ERROR] clearIncineratorSlot error:', error.message || error);
    throw new Error(error.message || 'Failed to unequip incinerator. Please try again.');
  }
};

