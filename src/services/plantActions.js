// src/services/plantActions.js
import { InitTransaction } from '../hooks/useSession';

const RHYTHM_CONTRACT =
  process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';

/**
 * Call rhythmfarmer::plant
 *
 * @param {Object} params
 * @param {string} params.actor         - wallet name (owner)
 * @param {number|string} params.plotAssetId
 * @param {number|string} params.slotIndex
 * @param {number|string} params.seedTemplateId
 * @param {number|string} params.seedBatchId
 *
 * Contract:
 *   void plant(name owner,
 *              uint64_t plot_asset_id,
 *              uint64_t slot_index,
 *              uint32_t seed_tpl_id,
 *              uint64_t seed_batch_id);
 */
export async function plantSlot({
  actor,
  plotAssetId,
  slotIndex,
  seedTemplateId,
  seedBatchId,
}) {
  if (!actor) {
    throw new Error('Missing actor (wallet account) for plant action.');
  }

  const tx = {
    actions: [
      {
        account: RHYTHM_CONTRACT,
        name: 'plant',
        authorization: [
          {
            actor,
            permission: 'active',
          },
        ],
        data: {
          owner: actor,
          plot_asset_id: Number(plotAssetId),
          slot_index: Number(slotIndex),
          seed_tpl_id: Number(seedTemplateId),
          seed_batch_id: Number(seedBatchId),
        },
      },
    ],
  };

  try {
    const result = await InitTransaction(tx);
    if (!result?.transactionId) {
      throw new Error('Plant transaction failed or was cancelled.');
    }
    return result.transactionId;
  } catch (err) {
    console.error('[ERROR] plantSlot failed:', err);
    throw new Error(err.message || 'Failed to plant seed.');
  }
}
