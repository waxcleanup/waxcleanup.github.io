// src/components/machines/RecipeControlPanel.js
import React from 'react';
import './MachineRecipeCard.css';

import { formatSeconds, toPlain, formatNumber } from './machineUtils';

export default function RecipeControlPanel({
  selectedRecipe,
  recipeOptions,
  selectedRecipeInputs,
  selectedRecipeLoot,
  tokenSufficiency,
  hasEnoughEnergy,
  onSelectRecipe,
}) {
  return (
    <section className="machine-recipe-shell">
      <section className="machine-recipe-card">
        {!selectedRecipe ? (
          <p className="machines-muted">No active recipes found.</p>
        ) : (
          <>
            <div className="machine-recipe-header">
              <h3 className="machine-recipe-title">
                {toPlain(selectedRecipe?.recipe_name)}
              </h3>
              <span className="machine-recipe-sub">Recipe Control</span>
            </div>

            <select
              className="machine-recipe-select"
              value={Number(toPlain(selectedRecipe?.recipe_id) || 0)}
              onChange={(e) => onSelectRecipe(Number(e.target.value))}
            >
              {recipeOptions.map((recipe) => {
                const recipeId = Number(toPlain(recipe?.recipe_id) || 0);

                return (
                  <option key={recipeId} value={recipeId}>
                    {toPlain(recipe?.recipe_name)}
                  </option>
                );
              })}
            </select>

            <div className="machine-recipe-stats">
              <div className="machine-recipe-stat">
                <span>Energy</span>
                {toPlain(selectedRecipe?.energy_per_batch)}
              </div>

              <div className="machine-recipe-stat">
                <span>Cooldown</span>
                {formatSeconds(selectedRecipe?.cooldown_sec)}
              </div>

              <div className="machine-recipe-stat">
                <span>Batch</span>
                {toPlain(selectedRecipe?.min_batch)}-{toPlain(selectedRecipe?.max_batch)}
              </div>

              <div className="machine-recipe-stat">
                <span>RNG</span>
                {Number(toPlain(selectedRecipe?.use_rng) || 0) ? 'Yes' : 'No'}
              </div>
            </div>

            <div className="machine-recipe-section">
              <h4>Inputs</h4>

              {selectedRecipeInputs.length === 0 ? (
                <p className="machines-muted small">No inputs configured.</p>
              ) : (
                selectedRecipeInputs.map((input) => {
                  const rawQty = toPlain(input?.token_qty);
                  const [, symbol = ''] = rawQty.trim().split(' ');
                  const upper = symbol.toUpperCase();
                  const status = tokenSufficiency[upper] || null;

                  return (
                    <div
                      className="machine-recipe-row"
                      key={
                        toPlain(input?.input_id) ||
                        `${toPlain(input?.token_id)}-${toPlain(input?.recipe_id)}`
                      }
                    >
                      <span>{rawQty}</span>
                      <span className={status?.enough ? 'ok-text' : 'bad-text'}>
                        {formatNumber(status?.balance || 0, 2)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="machine-recipe-section">
              <h4>Output</h4>

              {selectedRecipeLoot.length === 0 ? (
                <p className="machines-muted small">No loot configured.</p>
              ) : (
                selectedRecipeLoot.map((loot) => (
                  <div
                    className="machine-loot-row"
                    key={
                      toPlain(loot?.loot_id) ||
                      `${toPlain(loot?.template_id)}-${toPlain(loot?.slot)}`
                    }
                  >
                    <span>
                      {toPlain(loot?.template_id)} × {toPlain(loot?.qty_min)}
                      {toPlain(loot?.qty_max) !== toPlain(loot?.qty_min)
                        ? `-${toPlain(loot?.qty_max)}`
                        : ''}
                    </span>
                    <span>{toPlain(loot?.weight)}%</span>
                  </div>
                ))
              )}
            </div>

            <div className="machine-recipe-section">
              <h4>Status</h4>

              <div className="machine-recipe-stats">
                <div className={hasEnoughEnergy ? 'check-pill ok' : 'check-pill bad'}>
                  Energy
                </div>

                {Object.entries(tokenSufficiency).map(([symbol, status]) => (
                  <div
                    key={symbol}
                    className={status.enough ? 'check-pill ok' : 'check-pill bad'}
                  >
                    {symbol}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </section>
  );
}