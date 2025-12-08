// src/services/toolEquipActions.js
import { InitTransaction } from '../hooks/useSession';

const RHYTHM_CONTRACT =
  process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';

/**
 * rhythmfarmer::equiptool
 *
 * Contract (tools.hpp):
 *   void equiptool(name owner,
 *                  uint64_t asset_id);
 *
 * The contract auto-detects "watering"/"harvesting" from toolmeta,
 * so we only send owner + asset_id.
 */
export async function equipTool({ actor, toolAssetId }) {
  if (!actor) {
    throw new Error('Missing actor (wallet account) for equipTool.');
  }
  if (!toolAssetId) {
    throw new Error('Missing toolAssetId for equipTool.');
  }

  const dataTrx = {
    actions: [
      {
        account: RHYTHM_CONTRACT,
        name: 'equiptool', // matches tools.hpp
        authorization: [
          {
            actor,
            permission: 'active',
          },
        ],
        data: {
          owner: actor,
          asset_id: Number(toolAssetId), // uint64_t
        },
      },
    ],
  };

  console.log('[DEBUG] equipTool dataTrx:', dataTrx);

  const result = await InitTransaction(dataTrx);
  console.log('[DEBUG] equipTool result:', result);

  return result;
}

/**
 * rhythmfarmer::unequiptool
 *
 * Contract (tools.hpp):
 *   void unequiptool(name owner,
 *                    std::string slot); // "watering" | "harvesting"
 */
export async function unequipTool({ actor, slot }) {
  if (!actor) {
    throw new Error('Missing actor (wallet account) for unequipTool.');
  }
  if (!slot) {
    throw new Error('Missing slot for unequipTool.');
  }

  const dataTrx = {
    actions: [
      {
        account: RHYTHM_CONTRACT,
        name: 'unequiptool', // matches tools.hpp
        authorization: [
          {
            actor,
            permission: 'active',
          },
        ],
        data: {
          owner: actor,
          slot: String(slot), // must be "watering" or "harvesting"
        },
      },
    ],
  };

  console.log('[DEBUG] unequipTool dataTrx:', dataTrx);

  const result = await InitTransaction(dataTrx);
  console.log('[DEBUG] unequipTool result:', result);

  return result;
}

