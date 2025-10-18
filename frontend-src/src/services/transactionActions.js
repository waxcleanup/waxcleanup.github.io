import axios from 'axios';
import { InitTransaction } from '../hooks/useSession';

/**
 * Stake an incinerator by transferring it to the contract.
 * @param {string} accountName - The account name of the user.
 * @param {Object} incinerator - The incinerator object to stake.
 * @returns {string} - The transaction ID.
 * @throws Will throw an error if the staking process fails.
 */
export const stakeIncinerator = async (accountName, incinerator) => {
  if (!incinerator) {
    throw new Error('No incinerator selected for staking.');
  }

  const asset_id = incinerator.asset_id || incinerator.id;

  if (!asset_id) {
    throw new Error('Selected incinerator is missing asset_id or id. Cannot proceed with staking.');
  }

  let template_id;
  try {
    // Fetch template_id dynamically using asset_id
    const response = await axios.get(`https://wax.api.atomicassets.io/atomicassets/v1/assets/${asset_id}`);
    if (response.data && response.data.data) {
      template_id = response.data.data.template.template_id;
      console.log('[DEBUG] Fetched template_id:', template_id);
    } else {
      throw new Error('Failed to fetch template_id from AtomicAssets API.');
    }
  } catch (error) {
    console.error('[ERROR] Error fetching template_id:', error.message || error);
    throw new Error('Could not fetch template_id for the selected incinerator.');
  }

  const memo = `Stake NFT:${asset_id}`;
  const dataTrx = {
    actions: [
      {
        account: 'atomicassets',
        name: 'transfer',
        authorization: [
          {
            actor: accountName,
            permission: 'active',
          },
        ],
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

    if (!result || !result.transactionId) {
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
      error.message || `Failed to stake incinerator (asset_id: ${asset_id}). Please try again.`
    );
  }
};

/**
 * Burn an NFT using an incinerator by transferring it to the contract.
 * @param {string} accountName - The account name of the user.
 * @param {Object} nft - The NFT object to burn.
 * @param {Object} incinerator - The incinerator object to use.
 * @returns {string} - The transaction ID.
 * @throws Will throw an error if the burn process fails.
 */
export const burnNFT = async (accountName, nft, incinerator) => {
  if (!nft || !incinerator) {
    throw new Error('Both an NFT and an incinerator must be selected for burning.');
  }

  if (!nft.asset_id) {
    console.error('[ERROR] Invalid NFT object:', nft);
    throw new Error('Selected NFT is invalid. Missing asset_id.');
  }

  const dataTrx = {
    actions: [
      {
        account: 'atomicassets',
        name: 'transfer',
        authorization: [
          {
            actor: accountName,
            permission: 'active',
          },
        ],
        data: {
          from: accountName,
          to: 'cleanupcentr',
          asset_ids: [String(nft.asset_id)],
          memo: `Incinerate NFT:${nft.asset_id}:${incinerator.asset_id || incinerator.id}`,
        },
      },
    ],
  };

  try {
    console.log('[DEBUG] Initiating burn transaction for NFT:', nft.asset_id);

    const result = await InitTransaction(dataTrx);
    console.log('[DEBUG] Burn transaction result:', result);

    if (!result || !result.transactionId) {
      throw new Error(
        `Burn transaction failed for NFT: ${nft.asset_id}. Missing transaction ID.`
      );
    }

    return result.transactionId;
  } catch (error) {
    console.error(
      `[ERROR] Error during burn transaction for NFT: ${nft.asset_id}`,
      error.message || error
    );
    throw new Error(
      error.message || `Failed to burn NFT (asset_id: ${nft.asset_id}). Please try again.`
    );
  }
};

/**
 * Load fuel into an incinerator.
 * @param {string} accountName - The user's WAX account name.
 * @param {string} incineratorId - The ID of the incinerator.
 * @param {number} amount - The amount of fuel to load.
 * @returns {string} - The transaction ID.
 * @throws Will throw an error if the load fuel process fails.
 */
export const loadFuel = async (accountName, incineratorId, amount) => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Fuel amount must be a positive integer.');
  }

  const dataTrx = {
    actions: [
      {
        account: 'cleanuptoken', // Token contract for TRASH
        name: 'transfer',
        authorization: [
          {
            actor: accountName,
            permission: 'active',
          },
        ],
        data: {
          from: accountName,
          to: 'cleanupcentr',
          quantity: `${Number(amount).toFixed(3)} TRASH`, // Fuel amount in TRASH tokens
          memo: `loadfuel:${incineratorId}`, // Using memo to specify action and target incinerator ID
        },
      },
    ],
  };

  try {
    console.log('[DEBUG] Initiating load fuel transaction:', dataTrx);

    const result = await InitTransaction(dataTrx);
    console.log('[DEBUG] Load fuel transaction result:', result);

    if (!result || !result.transactionId) {
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
 * @param {string} accountName - The user's WAX account name.
 * @param {string} incineratorId - The ID of the incinerator.
 * @returns {string} - The transaction ID.
 * @throws Will throw an error if the load energy process fails.
 */
export const loadEnergy = async (accountName, incineratorId) => {
  const dataTrx = {
    actions: [
      {
        account: 'cleanuptoken', // Token contract for CINDER
        name: 'transfer',
        authorization: [
          {
            actor: accountName,
            permission: 'active',
          },
        ],
        data: {
          from: accountName,
          to: 'cleanupcentr',
          quantity: `2.000000 CINDER`, // Assuming energy load costs 2 CINDER tokens with precision of 6
          memo: `loadenergy:${incineratorId}`, // Using memo to specify action and target incinerator ID
        },
      },
    ],
  };

  try {
    console.log('[DEBUG] Initiating load energy transaction:', dataTrx);

    const result = await InitTransaction(dataTrx);
    console.log('[DEBUG] Load energy transaction result:', result);

    if (!result || !result.transactionId) {
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
 * @param {string} accountName – The user's WAX account.
 * @param {string|number} incineratorId – The incinerator asset ID.
 * @param {number} points – Number of durability points to repair (1 CINDER = 1 point).
 */
export const repairIncinerator = async (accountName, incineratorId, points) => {
  if (!Number.isInteger(points) || points < 1) 
    throw new Error('Repair points must be a positive integer.');

  const quantity = `${points.toFixed(6)} CINDER`;
  const memo     = `repairincin:${incineratorId}`;
  const dataTrx  = {
    actions: [{
      account: 'cleanuptoken',
      name:    'transfer',
      authorization: [{ actor: accountName, permission: 'active' }],
      data: { from: accountName, to: 'cleanupcentr', quantity, memo }
    }]
  };

  try {
    console.log('[DEBUG] Initiating repair transaction:', dataTrx);
    const result = await InitTransaction(dataTrx);
    if (!result?.transactionId) 
      throw new Error(`Repair failed for incinerator ${incineratorId}.`);
    return result.transactionId;
  } catch (error) {
    console.error('[ERROR] Repair transaction error:', error);
    throw new Error(error.message || `Failed to repair incinerator ${incineratorId}.`);
  }
};


/**
 * Unstake an incinerator by calling the backend route.
 * @param {string} accountName - The user's WAX account name.
 * @param {Object} incinerator - The incinerator object to unstake.
 * @returns {string} - The transaction ID.
 */
export const unstakeIncinerator = async (accountName, incinerator) => {
  const asset_id = incinerator.asset_id || incinerator.id;
  if (!asset_id) throw new Error('Invalid incinerator object. Missing asset_id or id.');

  try {
    const response = await axios.post(
      'https://maestrobeatz.servegame.com:3003/incinerators/unstake',
      {
        owner: accountName,
        incinerator_id: asset_id,
      }
    );

    const result = response.data;
    if (!result.success) throw new Error(result.message || 'Unstake failed');

    return result.tx;
  } catch (error) {
    console.error('[UNSTAKE ERROR]', error.message || error);
    throw new Error(error.message || 'Unstake transaction failed');
  }
};

export const finalizeRepair = async (accountName, incineratorId) => {
  try {
    const response = await axios.post(
      'https://maestrobeatz.servegame.com:3003/finalize-repair',
      { user: accountName, incinerator_id: incineratorId }
    );
    const data = response.data;
    if (data.success) {
      // backend returns result.transaction_id or result.transactionId
      const txId = data.result?.transaction_id || data.result?.transactionId || data.result;
      return txId;
    } else {
      throw new Error(data.error || 'Failed to finalize repair');
    }
  } catch (error) {
    console.error('[ERROR] finalizeRepair error:', error.message || error);
    throw new Error(error.message || 'Failed to finalize repair');
  }
};
