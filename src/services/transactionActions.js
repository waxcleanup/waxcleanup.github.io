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

  const { asset_id } = incinerator;

  if (!asset_id) {
    throw new Error('Selected incinerator is missing asset_id. Cannot proceed with staking.');
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
        account: process.env.REACT_APP_CONTRACT_NAME,
        name: 'loadfuel',
        authorization: [
          {
            actor: accountName,
            permission: 'active',
          },
        ],
        data: {
          user: accountName,
          incinerator_id: incineratorId,
          amount,
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
        account: process.env.REACT_APP_CONTRACT_NAME,
        name: 'loadenergy',
        authorization: [
          {
            actor: accountName,
            permission: 'active',
          },
        ],
        data: {
          user: accountName,
          incinerator_id: incineratorId,
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
