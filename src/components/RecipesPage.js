import TokenLogo from './TokenLogo';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from '../hooks/SessionContext';
import { executeRecipe } from '../services/blendActions';
import { fetchBlendOverview, getRecipeActionText, toIpfsUrl } from '../services/blendsApi';
import { formatNfts, nftRange, recipeOutputs } from '../services/blendPresentation';
import { fetchBlendBalances, blendTokenStatus, formatTokenUnits } from '../services/blendBalances';
import './RecipesPage.css';
import LootReveal from './LootReveal';
import RecentReveals from './RecentReveals';

const titleOf = recipe => recipe.title || recipe.label || `Recipe ${recipe.recipe_id}`;
const imageOf = recipe => recipe.icon || recipe.nft_outputs?.[0]?.image || recipe.nft_inputs?.[0]?.image;

function NftRow({ item, input = false }) {
  const image = toIpfsUrl(item.image);
  return <div className={`blend-nft-row ${input && !item.complete ? 'missing' : ''}`}>
    {image ? <img src={image} alt="" loading="lazy" /> : <span className="blend-nft-placeholder">{Number(item.template_id) === 0 ? '—' : 'NFT'}</span>}
    <div><strong>{item.name || (Number(item.template_id) === 0 ? 'No NFT drop' : `Template #${item.template_id}`)}</strong>
      <small>{input ? `${item.owned || 0} / ${item.qty} owned` : formatNfts(nftRange(item))}{item.chance != null && ` · ${Number(item.chance.toFixed(2))}% chance`}</small>
    </div>
  </div>;
}

function RecipeDialog({ recipe, balances, onClose, onExecute, disabled, busy }) {
  const dialog = useRef();
  useEffect(() => { dialog.current?.showModal(); }, []);
  const { slots, total } = recipeOutputs(recipe);
  const fixedSlots = slots.filter(slot => slot.rows.length === 1);
  const randomSlots = slots.filter(slot => slot.rows.length > 1);
  const action = getRecipeActionText(recipe);
  const tokens = blendTokenStatus(recipe, balances);
  return <dialog ref={dialog} className="blend-dialog" aria-label="Blend details" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><span>BLEND DETAILS</span><button type="button" aria-label="Close blend details" onClick={onClose}>×</button></header>
    <div className="blend-dialog-scroll">
      <div className="blend-detail-title">{imageOf(recipe) && <img src={toIpfsUrl(imageOf(recipe))} alt="" />}<div><small>Recipe #{recipe.recipe_id}</small><h2>{titleOf(recipe)}</h2></div></div>
      {recipe.description && <details className="blend-description"><summary>About this blend</summary><p>{recipe.description}</p></details>}
      <div className="blend-total"><span>Total per blend</span><strong>{formatNfts(total)}</strong></div>
      <section><h3>What you need</h3>
        {!!recipe.nft_inputs?.length && <><p className="blend-note">{Number(recipe.burn_inputs) ? 'These input NFTs are consumed when the blend completes.' : 'These input NFTs are transferred to the blend contract.'}</p><div className="blend-drop-grid">{recipe.nft_inputs.map((item, i) => <NftRow key={i} item={item} input />)}</div></>}
        {tokens.inputs.map((input, i) => <div className="blend-token-balance" key={i}>
          <div><strong><TokenLogo token={{symbol: input.symbol, contract: input.token_contract, precision: input.precision}} size={18} />{input.symbol || 'Unknown token'}</strong><span>{!input.known ? 'Balance unavailable / checking' : input.missing === '0' ? 'Enough tokens' : `Missing ${formatTokenUnits(input.missing, input.precision)} ${input.symbol}`}</span></div>
          <dl><div><dt>Needed</dt><dd>{formatTokenUnits(input.amount, input.precision)}</dd></div><div><dt>You have</dt><dd>{input.known ? formatTokenUnits(input.owned, input.precision) : '—'}</dd></div></dl>
        </div>)}
        {!!recipe.hold_inputs?.length && <p className="blend-note">Additional holding requirements: {recipe.hold_inputs.map(input => `${input.qty} × template #${input.template_id}`).join(', ')}.</p>}
      </section>
      {!!recipe.nft_outputs?.length && <section><h3>Guaranteed drops</h3><div className="blend-drop-grid">{recipe.nft_outputs.map((item, i) => <NftRow key={i} item={item} />)}</div></section>}
      {!!fixedSlots.length && <section><h3>Guaranteed slots</h3><div className="blend-fixed-grid">
        {fixedSlots.map(slot => <section className="blend-fixed-slot" key={slot.slot} aria-label={`Slot ${slot.slot + 1}`}>
          <div className="blend-slot-heading"><h4>Slot {slot.slot + 1}</h4><span>Drops {formatNfts(slot)}</span></div>
          <NftRow item={{...slot.rows[0], chance: null}} />
        </section>)}
      </div></section>}
      {!!randomSlots.length && <section><h3>Randomized slots</h3><p className="blend-note">One outcome per slot. Zero NFTs means no drop.</p>
        {randomSlots.map(slot => <section className="blend-slot" key={slot.slot} aria-label={`Slot ${slot.slot + 1}`}>
          <div className="blend-slot-heading"><h4>Slot {slot.slot + 1}</h4><span>Drops {formatNfts(slot)} · 1 outcome</span></div>
          <div className="blend-drop-grid">{slot.rows.map((item, i) => <NftRow key={i} item={item} />)}</div>
        </section>)}
      </section>}
    </div>
    <footer><span>{!recipe.can_blend ? 'Missing required NFTs' : tokens.ready ? 'NFTs and tokens ready' : 'Check required tokens'}</span><button className="recipe-action" disabled={disabled || !recipe.can_blend || !tokens.ready} onClick={() => onExecute(recipe)}>{busy ? 'Checking / submitting…' : `${action} now`}</button></footer>
  </dialog>;
}

export default function RecipesPage({ embedded = false }) {
  const { session } = useSession();
  const wallet = String(session?.actor || session?.permissionLevel?.actor || '');
  const [recipes, setRecipes] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [filter, setFilter] = useState('All');
  const requestId = useRef(0);
  const currentWallet = useRef(wallet);
  currentWallet.current = wallet;

  const loadData = useCallback(async (refresh = false) => {
    const request = ++requestId.current;
    if (!wallet) { setLoading(false); return; }
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    setBalances({});
    try {
      const overview = await fetchBlendOverview(wallet);
      if (request === requestId.current) setRecipes(Array.isArray(overview?.recipes) ? overview.recipes : []);
      if (request === requestId.current) setLoading(false);
      const tokenBalances = await fetchBlendBalances(wallet, overview?.recipes || []);
      if (request === requestId.current) setBalances(tokenBalances);
    } catch (err) {
      if (request === requestId.current) setError('Could not load blends. Please try Refresh.');
    } finally {
      if (request === requestId.current) { setLoading(false); setRefreshing(false); }
    }
  }, [wallet]);

  useEffect(() => {
    setRecipes([]); setSelectedId(null); setReveal(null); setStatus(''); setBusyId(null);
    loadData();
    return () => { requestId.current += 1; };
  }, [loadData]);

  const sorted = useMemo(() => [...recipes].sort((a, b) => Number(a.recipe_id) - Number(b.recipe_id)), [recipes]);
  const visible = sorted.filter(recipe => filter === 'All' || (filter === 'NFTs ready' ? recipe.can_blend : getRecipeActionText(recipe) === filter));
  const selected = recipes.find(recipe => recipe.recipe_id === selectedId);

  async function handleExecute(recipe) {
    if (busyId != null) return;
    setBusyId(recipe.recipe_id); setError(''); setStatus('');
    try {
      // Recheck ownership and asset IDs immediately before requesting a transaction.
      const fresh = await fetchBlendOverview(wallet);
      if (currentWallet.current !== wallet) return;
      const current = fresh.recipes?.find(item => String(item.recipe_id) === String(recipe.recipe_id));
      if (!current?.can_blend) throw new Error('Required NFTs changed. Refresh and check your inputs.');
      if (!Array.isArray(fresh.assets)) throw new Error('Could not verify your NFT inputs. Please refresh.');
      const freshBalances = await fetchBlendBalances(wallet, [current]);
      if (currentWallet.current !== wallet) return;
      setBalances(previous => ({...previous, ...freshBalances}));
      if (!blendTokenStatus(current, freshBalances).ready) throw new Error('Not enough tokens, or the balance could not be verified. Refresh and check the token requirements.');
      const result = await executeRecipe({ session, recipe: current, bagAssets: fresh.assets });
      if (currentWallet.current !== wallet) return;
      setSelectedId(null);
      setReveal({result, title:titleOf(current)});
      setStatus(result?.transactionId ? `Success — transaction ${result.transactionId}` : 'Blend submitted successfully.');
      await loadData(true);
    } catch (err) {
      if (currentWallet.current === wallet) { setSelectedId(null); setError(err?.message || 'Blend failed.'); }
    } finally { if (currentWallet.current === wallet) setBusyId(null); }
  }

  if (!wallet) return <div className="recipes-page"><h2>Blends</h2><p className="recipes-muted">Connect your wallet to check your ingredients and explore blend recipes.</p></div>;
  return <div className="recipes-page"><div className="recipes-shell">
    <div className="recipes-header"><div>{!embedded && <><h1>Blends</h1><p className="recipes-muted">Open crates. Combine resources. Discover what comes next.</p></>}</div><button className="recipes-refresh" onClick={() => loadData(true)} disabled={refreshing || loading || busyId != null}>{refreshing ? 'Refreshing…' : 'Refresh'}</button></div>
    <div className="blend-filters" aria-label="Filter blends">{['All', 'Open', 'Process', 'NFTs ready'].map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}<span>{recipes.length} recipes</span></div>
    {status && <div className="recipes-status" role="status">{status}</div>}{error && <div className="recipes-error" role="alert">{error}</div>}
    {loading ? <div className="recipes-grid" role="status" aria-label="Loading blends">{[1, 2, 3, 4].map(i => <div className="blend-skeleton" key={i}><span />Loading recipe…</div>)}</div> : !visible.length ? <div className="recipes-empty">{recipes.length ? 'No recipes match this filter.' : 'No recipes available.'}</div> :
      <div className="recipes-grid">{visible.map(recipe => <article className="recipe-card" key={recipe.recipe_id}>
        <button className="blend-card-preview" onClick={() => setSelectedId(recipe.recipe_id)} aria-label={`View ${titleOf(recipe)}`}>
          {imageOf(recipe) ? <img src={toIpfsUrl(imageOf(recipe))} alt="" loading="lazy" /> : <span className="blend-nft-placeholder">NFT</span>}
          <span className="blend-card-kind">{getRecipeActionText(recipe) === 'Open' ? 'Crate opening' : 'Resource blend'}</span><h3>{titleOf(recipe)}</h3><strong className="blend-card-output">{formatNfts(recipeOutputs(recipe).total)} per blend</strong>
        </button>
        <div className="blend-card-bottom"><span className={`recipe-ready ${recipe.can_blend ? 'yes' : 'no'}`}>{recipe.can_blend ? 'NFTs ready' : 'Needs ingredients'}</span><button onClick={() => setSelectedId(recipe.recipe_id)}>View blend →</button></div>
      </article>)}</div>}
    {selected && <RecipeDialog recipe={selected} balances={balances} onClose={() => setSelectedId(null)} onExecute={handleExecute} disabled={busyId != null || refreshing || loading || Boolean(error)} busy={busyId === selected.recipe_id} />}
    <RecentReveals wallet={wallet} recipes={recipes} />
    {reveal && <LootReveal result={reveal.result} title={reveal.title} wallet={wallet} onClose={()=>setReveal(null)} />}
  </div></div>;
}
