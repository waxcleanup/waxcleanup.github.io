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
      console.log('Fetched template_id:', template_id);
    } else {
      throw new Error('Failed to fetch template_id from AtomicAssets API.');
    }
  } catch (error) {
    console.error('Error fetching template_id:', error.message || error);
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
    console.log('Initiating stake transaction:', dataTrx);

    if (process.env.REACT_APP_DEBUG_TRANSACTIONS === 'true') {
      console.log('[DEBUG] Simulating stake transaction for development:', dataTrx);
      return { transactionId: 'fake-transaction-id' };
    }

    const result = await InitTransaction(dataTrx);
    console.log('Stake transaction result:', result);

    if (!result || !result.transactionId) {
      throw new Error(
        `Staking transaction failed for asset_id: ${asset_id}. Missing transaction ID.`
      );
    }

    return result.transactionId;
  } catch (error) {
    console.error(
      `Error during staking transaction for asset_id: ${asset_id}`,
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
    console.error('Invalid NFT object:', nft);
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
          memo: `Incinerate NFT:${incinerator.asset_id}`,
        },
      },
    ],
  };

  try {
    console.log('Initiating burn transaction for NFT:', nft.asset_id);

    if (process.env.REACT_APP_DEBUG_TRANSACTIONS === 'true') {
      console.log('[DEBUG] Simulating burn transaction for development:', dataTrx);
      return { transactionId: 'fake-transaction-id' };
    }

    const result = await InitTransaction(dataTrx);
    console.log('Burn transaction result:', result);

    if (!result || !result.transactionId) {
      throw new Error(
        `Burn transaction failed for NFT: ${nft.asset_id}. Missing transaction ID.`
      );
    }

    return result.transactionId;
  } catch (error) {
    console.error(
      `Error during burn transaction for NFT: ${nft.asset_id}`,
      error.message || error
    );
    throw new Error(
      error.message ||
        `Failed to burn NFT (asset_id: ${nft.asset_id}). Please try again.`
    );
  }
};
