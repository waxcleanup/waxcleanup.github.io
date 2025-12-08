// src/services/plotActions.js
import { InitTransaction } from '../hooks/useSession';

// You can move this to a config later if you want
const RHYTHM_FARMER_ACCOUNT =
  process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';

/**
 * Call rhythmfarmer::water
 *
 * C++ signature:
 *   [[eosio::action]]
 *   void water(name owner, uint64_t plot_asset_id, uint8_t slot_index);
 */
export async function waterPlot(owner, plotAssetId, slotIndex) {
  if (!owner) {
    throw new Error('Missing owner for waterPlot');
  }
  if (!plotAssetId && plotAssetId !== 0) {
    throw new Error('Missing plotAssetId for waterPlot');
  }
  if (slotIndex === undefined || slotIndex === null) {
    throw new Error('Missing slotIndex for waterPlot');
  }

  const actions = [
    {
      account: RHYTHM_FARMER_ACCOUNT,
      name: 'water',
      data: {
        owner,
        plot_asset_id: Number(plotAssetId),
        slot_index: Number(slotIndex),
      },
    },
  ];

  return InitTransaction({ actions });
}

/**
 * Call rhythmfarmer::harvest
 *
 * C++ signature:
 *   [[eosio::action]]
 *   void harvest(name owner, uint64_t plot_asset_id, uint8_t slot_index);
 */
export async function harvestPlot(owner, plotAssetId, slotIndex) {
  if (!owner) {
    throw new Error('Missing owner for harvestPlot');
  }
  if (!plotAssetId && plotAssetId !== 0) {
    throw new Error('Missing plotAssetId for harvestPlot');
  }
  if (slotIndex === undefined || slotIndex === null) {
    throw new Error('Missing slotIndex for harvestPlot');
  }

  const actions = [
    {
      account: RHYTHM_FARMER_ACCOUNT,
      name: 'harvest',
      data: {
        owner,
        plot_asset_id: Number(plotAssetId),
        slot_index: Number(slotIndex),
      },
    },
  ];

  return InitTransaction({ actions });
}
