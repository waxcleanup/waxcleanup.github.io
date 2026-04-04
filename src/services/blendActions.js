import { InitTransaction } from '../hooks/useSession';

const ATOMIC_CONTRACT =
  process.env.REACT_APP_ATOMICASSETS_ACCOUNT || 'atomicassets';
const RHYTHM_CONTRACT =
  process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';

function actorFromSession(session) {
  return String(
    session?.actor ||
      session?.permissionLevel?.actor ||
      session?.permissionLevel?.actor?.toString?.() ||
      ''
  );
}

function selectAssetIds(recipe, bagAssets) {
  const selected = [];

  for (const input of recipe?.nft_inputs || []) {
    const templateId = String(input.template_id);
    const need = Number(input.qty || 0);
    const matches = bagAssets.filter(
      (asset) => String(asset.template_id) === templateId
    );

    if (matches.length < need) {
      throw new Error(`Missing required NFT input for template ${templateId}.`);
    }

    for (let i = 0; i < need; i += 1) {
      selected.push(String(matches[i].asset_id));
    }
  }

  return selected;
}

function buildTokenActions(session, recipe) {
  const actor = actorFromSession(session);

  return (recipe?.token_inputs || []).map((input) => {
    if (!input?.token_found) {
      throw new Error(`Missing token config for token_id ${input.token_id}.`);
    }

    const precision = Number(input.precision || 0);
    const symbol = String(input.symbol || '').trim();
    const quantity = `${Number(input.display_amount || 0).toFixed(precision)} ${symbol}`;

    return {
      account: input.token_contract,
      name: 'transfer',
      data: {
        from: actor,
        to: RHYTHM_CONTRACT,
        quantity,
        memo: `BLEND:${recipe.recipe_id}`,
      },
    };
  });
}

export async function executeRecipe({ session, recipe, bagAssets }) {
  const actor = actorFromSession(session);

  if (!actor) throw new Error('Wallet session not found.');
  if (!recipe?.recipe_id) throw new Error('Recipe not found.');

  const actions = [];

  actions.push(...buildTokenActions(session, recipe));

  const assetIds = selectAssetIds(recipe, bagAssets);
  if (assetIds.length > 0) {
    actions.push({
      account: ATOMIC_CONTRACT,
      name: 'transfer',
      data: {
        from: actor,
        to: RHYTHM_CONTRACT,
        asset_ids: assetIds,
        memo: `BLEND:${recipe.recipe_id}`,
      },
    });
  }

  if (actions.length === 0) {
    throw new Error('Recipe has no transferable inputs.');
  }

  return InitTransaction({ actions });
}