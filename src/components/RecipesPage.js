import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '../hooks/SessionContext';
import { executeRecipe } from '../services/blendActions';
import {
  fetchBagAssets,
  fetchBlendOverview,
  getRecipeActionText,
  toIpfsUrl,
} from '../services/blendsApi';
import './RecipesPage.css';

function actorFromSession(session) {
  return String(
    session?.actor ||
      session?.permissionLevel?.actor ||
      session?.permissionLevel?.actor?.toString?.() ||
      ''
  );
}

function RequirementRow({ input }) {
  const complete = Boolean(input.complete);
  const image = toIpfsUrl(input.image);

  return (
    <div className={`recipe-row ${complete ? 'ok' : 'missing'}`}>
      <div className="recipe-row-left">
        {image ? (
          <img
            src={image}
            alt={input.name || `Template ${input.template_id}`}
            className="recipe-thumb"
          />
        ) : null}
        <div>
          <div className="recipe-row-title">
            {input.name || `Template ${input.template_id}`}
          </div>
          <div className="recipe-row-sub">Need {input.qty}</div>
        </div>
      </div>
      <div className="recipe-row-right">
        {input.owned} / {input.qty}
      </div>
    </div>
  );
}

function TokenRow({ input }) {
  return (
    <div className="recipe-row token">
      <div className="recipe-row-left">
        <div>
          <div className="recipe-row-title">
            {input.token_description || input.symbol}
          </div>
          <div className="recipe-row-sub">Token input</div>
        </div>
      </div>
      <div className="recipe-row-right">
        {Number(input.display_amount || 0).toLocaleString(undefined, {
          minimumFractionDigits: Number(input.precision || 0),
          maximumFractionDigits: Number(input.precision || 0),
        })}{' '}
        {input.symbol}
      </div>
    </div>
  );
}

function OutputRow({ output }) {
  const image = toIpfsUrl(output.image);

  return (
    <div className="recipe-row output">
      <div className="recipe-row-left">
        {image ? (
          <img
            src={image}
            alt={output.name || `Template ${output.template_id}`}
            className="recipe-thumb"
          />
        ) : null}
        <div>
          <div className="recipe-row-title">
            {output.name || `Template ${output.template_id}`}
          </div>
          <div className="recipe-row-sub">Output</div>
        </div>
      </div>
      <div className="recipe-row-right">x{output.qty}</div>
    </div>
  );
}

function LootRow({ output }) {
  const image = toIpfsUrl(output.image);

  return (
    <div className="recipe-row output">
      <div className="recipe-row-left">
        {image ? (
          <img
            src={image}
            alt={output.name || `Template ${output.template_id}`}
            className="recipe-thumb"
          />
        ) : null}

        <div>
          <div className="recipe-row-title">
            {output.name ||
              (Number(output.template_id) === 0
                ? 'No Reward'
                : `Template ${output.template_id}`)}
          </div>

          <div className="recipe-row-sub">
            Slot {output.slot} • Weight {output.weight}
          </div>
        </div>
      </div>

      <div className="recipe-row-right">
        {Number(output.qty_min) === 0
          ? '—'
          : `x${output.qty_min}${
              Number(output.qty_max) !== Number(output.qty_min)
                ? `-${output.qty_max}`
                : ''
            }`}
      </div>
    </div>
  );
}

export default function RecipesPage() {
  const { session } = useSession();
  const wallet = actorFromSession(session);

  const [recipes, setRecipes] = useState([]);
  const [bagAssets, setBagAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const loadData = useCallback(
    async (useRefreshState = false) => {
      if (!wallet) return;

      if (useRefreshState) setRefreshing(true);
      else setLoading(true);

      setError('');
      try {
        const [overview, bag] = await Promise.all([
          fetchBlendOverview(wallet),
          fetchBagAssets(wallet),
        ]);

        setRecipes(Array.isArray(overview?.recipes) ? overview.recipes : []);
        setBagAssets(Array.isArray(bag) ? bag : []);
      } catch (err) {
        console.error('[RecipesPage] loadData failed:', err);
        setError(err?.message || 'Failed to load recipes.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [wallet]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sortedRecipes = useMemo(() => {
    return [...recipes].sort(
      (a, b) => Number(a.recipe_id) - Number(b.recipe_id)
    );
  }, [recipes]);

  async function handleExecute(recipe) {
    try {
      setBusyId(recipe.recipe_id);
      setStatus('');
      setError('');

      const result = await executeRecipe({ session, recipe, bagAssets });

      setStatus(
        result?.transactionId
          ? `Success — transaction ${result.transactionId}`
          : 'Recipe submitted successfully.'
      );

      await loadData(true);
    } catch (err) {
      console.error('[RecipesPage] execute failed:', err);
      setError(err?.message || 'Recipe execution failed.');
    } finally {
      setBusyId(null);
    }
  }

  if (!wallet) {
    return (
      <div className="recipes-page">
        <div className="recipes-shell">
          <h1>Recipes</h1>
          <p className="recipes-muted">
            Connect your wallet to view available recipes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="recipes-page">
      <div className="recipes-shell">
        <div className="recipes-header">
          <div>
            <h1>Blends</h1>
            <p className="recipes-muted">
              Open crates and process resources to create new assets.
            </p>
          </div>

          <button
            className="recipes-refresh"
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="recipes-topbar">
          <div className="recipes-pill">Wallet: {wallet}</div>
          <div className="recipes-pill">Recipes: {sortedRecipes.length}</div>
          <div className="recipes-pill">Bag Assets: {bagAssets.length}</div>
        </div>

        {status ? <div className="recipes-status">{status}</div> : null}
        {error ? <div className="recipes-error">{error}</div> : null}

        {loading ? (
          <div className="recipes-empty">Loading recipes...</div>
        ) : sortedRecipes.length === 0 ? (
          <div className="recipes-empty">No recipes found.</div>
        ) : (
          <div className="recipes-grid">
            {sortedRecipes.map((recipe) => {
              const actionText = getRecipeActionText(recipe);

              return (
                <div className="recipe-card" key={recipe.recipe_id}>
                  <div className="recipe-card-head">
                    <div>
                      <div className="recipe-kicker">
                        Recipe #{recipe.recipe_id}
                      </div>
                      <h2>
                        {recipe.title || recipe.label || `Recipe ${recipe.recipe_id}`}
                      </h2>
                      {recipe.description ? (
                        <p className="recipe-description">
                          {recipe.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="recipe-section">
                    <div className="recipe-section-title">NFT Inputs</div>
                    {recipe.nft_inputs?.length ? (
                      recipe.nft_inputs.map((input) => (
                        <RequirementRow
                          key={`${recipe.recipe_id}-nft-${input.template_id}`}
                          input={input}
                        />
                      ))
                    ) : (
                      <div className="recipe-row empty">No NFT inputs</div>
                    )}
                  </div>

                  <div className="recipe-section">
                    <div className="recipe-section-title">Token Inputs</div>
                    {recipe.token_inputs?.length ? (
                      recipe.token_inputs.map((input, idx) => (
                        <TokenRow
                          key={`${recipe.recipe_id}-tok-${idx}`}
                          input={input}
                        />
                      ))
                    ) : (
                      <div className="recipe-row empty">No token inputs</div>
                    )}
                  </div>

                  <div className="recipe-section">
                    <div className="recipe-section-title">Outputs</div>

                    {recipe.nft_outputs?.length ? (
                      recipe.nft_outputs.map((output, idx) => (
                        <OutputRow
                          key={`${recipe.recipe_id}-out-${idx}`}
                          output={output}
                        />
                      ))
                    ) : recipe.has_loot ? (
                      [...(recipe.loot_outputs || [])]
                        .sort((a, b) => Number(a.slot || 0) - Number(b.slot || 0))
                        .map((output, idx) => (
                          <LootRow
                            key={`${recipe.recipe_id}-loot-${idx}`}
                            output={output}
                          />
                        ))
                    ) : (
                      <div className="recipe-row output">No outputs</div>
                    )}
                  </div>

                  <div className="recipe-footer">
                    <div className={`recipe-ready ${recipe.can_blend ? 'yes' : 'no'}`}>
                      {recipe.can_blend
                        ? 'Required NFTs ready'
                        : 'Missing required NFTs'}
                    </div>

                    <button
                      className="recipe-action"
                      onClick={() => handleExecute(recipe)}
                      disabled={!recipe.can_blend || busyId === recipe.recipe_id}
                    >
                      {busyId === recipe.recipe_id ? `${actionText}...` : actionText}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}