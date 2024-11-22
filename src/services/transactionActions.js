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

  const { asset_id, template_id } = incinerator;

  if (!template_id) {
    throw new Error('Selected incinerator is missing template_id. Cannot proceed with staking.');
  }

  const memo = `Stake NFT:${asset_id}`;
  const dataTrx = {
    actions: [
      {
        account: 'atomicassets',
        name: 'transfer',
        authorization: [],
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
    console.log('Initiating stake transaction with memo:', memo);
    const result = await InitTransaction(dataTrx);
    if (!result || !result.transactionId) {
      throw new Error('Staking transaction failed.');
    }
    return result.transactionId;
  } catch (error) {
    console.error('Error during staking transaction:', error);
    throw error;
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

  const dataTrx = {
    actions: [
      {
        account: 'atomicassets',
        name: 'transfer',
        authorization: [],
        data: {
          from: accountName,
          to: 'cleanupcentr',
          asset_ids: [String(nft.asset_id)],
          memo: `Incinerate NFT:${incinerator.id}`,
        },
      },
    ],
  };

  try {
    console.log('Initiating burn transaction with NFT:', nft.asset_id);
    const result = await InitTransaction(dataTrx);
    if (!result || !result.transactionId) {
      throw new Error('Burn transaction failed.');
    }
    return result.transactionId;
  } catch (error) {
    console.error('Error during burn transaction:', error);
    throw error;
  }
};

