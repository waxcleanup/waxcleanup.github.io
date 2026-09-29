const MINTER = process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';
const ATOMIC = process.env.REACT_APP_ATOMICASSETS_ACCOUNT || 'atomicassets';

function fields(entries) {
  if (!Array.isArray(entries)) return entries || {};
  return Object.fromEntries(entries.map(entry => [entry.key, Array.isArray(entry.value) ? entry.value[1] : entry.value]));
}

export function extractMintedRewards(traces, wallet) {
  const rewards = new Map();
  function visit(trace) {
    const act = trace?.act || trace?.action_trace?.act;
    const data = act?.data;
    if (String(act?.account) === ATOMIC && String(act?.name) === 'logmint' &&
        String(data?.new_asset_owner) === wallet && String(data?.authorized_minter) === MINTER) {
      const id = String(data.asset_id || data.new_asset_id || '');
      if (/^\d+$/.test(id)) {
        const meta = {...fields(data.immutable_template_data), ...fields(data.immutable_data)};
        rewards.set(id, {asset_id:id, template_id:String(data.template_id), name:meta.name || `NFT #${id}`, image:meta.img || meta.image || ''});
      }
    }
    (trace?.inline_traces || trace?.action_trace?.inline_traces || []).forEach(visit);
  }
  (traces || []).forEach(visit);
  return [...rewards.values()];
}

export async function fetchTransactionRewards(transactionId, wallet, signal) {
  if (!/^[a-f0-9]{64}$/i.test(transactionId || '')) return [];
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, {once:true});
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(cancel, 12000);
  try {
    const base = 'https://wax.eosusa.io/v2/history/';
    const read = async (path) => {
      const response = await fetch(base + path, {signal:controller.signal});
      if (!response.ok) throw new Error('Transaction history unavailable');
      return response.json();
    };
    const data = await read(`get_transaction?id=${encodeURIComponent(transactionId)}`);
    if (data.trx_id !== transactionId || data.executed !== true) return [];
    const actions = (data.actions || []).filter(action => !action.trx_id || action.trx_id === transactionId);
    const openingTransfer = actions.find(action => action.act?.name === 'transfer' && action.act?.data?.to === MINTER && /^(BLEND:\d+(?::.*)?|open:seedpack)$/i.test(String(action.act.data.memo || '')));
    const owner = openingTransfer?.act.data.from;
    if (owner && owner !== wallet) {
      const error = new Error(`This opening belongs to ${owner}.`);
      error.code = 'REVEAL_OWNER_MISMATCH';
      error.owner = owner;
      throw error;
    }
    const direct = extractMintedRewards(actions, wallet);
    if (direct.length) return direct;
    const requests = actions.filter(action => action.act?.account === 'orng.wax' && action.act?.name === 'requestrand' && action.act?.data?.caller === MINTER);
    const transferred = actions.filter(action => action.act?.account === ATOMIC && action.act?.name === 'transfer' && action.act?.data?.from === wallet && action.act?.data?.to === MINTER).flatMap(action => action.act.data.asset_ids || []).map(String);
    // Randomized packs mint in an ORNG callback, not in the opening transaction.
    // Bind the callback to both its request association and the consumed input NFTs.
    if (!requests.length || !transferred.length) return [];
    const time = actions.find(action => action.timestamp || action['@timestamp']);
    const after = String(time?.timestamp || time?.['@timestamp'] || '').slice(0,19);
    if (!/^\d{4}-\d{2}-\d{2}T/.test(after)) return [];
    for (let page = 0; page < 3; page += 1) {
      const params = new URLSearchParams({filter:'orng.wax:randnotify', after, sort:'asc', limit:'100', skip:String(page * 100)});
      const listing = await read(`get_actions?${params}`);
      const callbacks = listing.actions || [];
      for (const callback of callbacks) {
        if (callback.act?.account !== 'orng.wax' || callback.act?.name !== 'randnotify' || callback.act?.data?.dapp !== MINTER || !requests.some(request => String(request.act.data.assoc_id) === String(callback.act.data.assoc_id))) continue;
        const completion = await read(`get_transaction?id=${encodeURIComponent(callback.trx_id)}`);
        if (completion.trx_id !== callback.trx_id || completion.executed !== true) continue;
        const completedActions = (completion.actions || []).filter(action => !action.trx_id || action.trx_id === callback.trx_id);
        const burned = new Set(completedActions.filter(action => action.act?.account === ATOMIC && ['burnasset','logburnasset'].includes(action.act?.name)).map(action => String(action.act.data.asset_id)));
        if (!transferred.every(id => burned.has(id))) continue;
        const rewards = extractMintedRewards(completedActions, wallet);
        if (rewards.length) return rewards;
      }
      if (callbacks.length < 100) break;
    }
    return [];
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', cancel); }
}

const revealKey = wallet => `cleanupcentr-mainnet:reveals:${wallet}`;
export function readSavedReveals(wallet) {
  try { const saved = JSON.parse(localStorage.getItem(revealKey(wallet)) || '[]'); return Array.isArray(saved) ? saved.filter(item=>/^[a-f0-9]{64}$/i.test(item.transactionId)).slice(0,10) : []; } catch { return []; }
}
export function saveReveal(wallet, entry) {
  if (!wallet || !/^[a-f0-9]{64}$/i.test(entry.transactionId || '')) return;
  try {
    const saved = readSavedReveals(wallet);
    const previous = saved.find(item=>item.transactionId === entry.transactionId);
    localStorage.setItem(revealKey(wallet), JSON.stringify([{savedAt:Date.now(), ...previous, ...entry}, ...saved.filter(item=>item.transactionId !== entry.transactionId)].slice(0,10)));
    window.dispatchEvent(new Event('cleanupcentr:reveals-updated'));
  } catch { /* History remains available through the transaction link. */ }
}

export function removeSavedReveal(wallet, transactionId) {
  try {
    localStorage.setItem(revealKey(wallet), JSON.stringify(readSavedReveals(wallet).filter(item=>item.transactionId !== transactionId)));
    window.dispatchEvent(new Event('cleanupcentr:reveals-updated'));
  } catch { /* Storage is optional. */ }
}

export function recentOpeningTransactions(actions, wallet) {
  const found = new Map();
  for (const action of actions || []) {
    const data = action.act?.data;
    const memo = String(data?.memo || '');
    if (action.act?.name !== 'transfer' || data?.from !== wallet || data?.to !== MINTER || !/^(BLEND:\d+(?::.*)?|open:seedpack)$/i.test(memo) || !/^[a-f0-9]{64}$/i.test(action.trx_id || '')) continue;
    const recipeId = /^BLEND:(\d+)/i.exec(memo)?.[1];
    const rawTime = action.timestamp || action['@timestamp'];
    const date = rawTime ? Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(rawTime) ? rawTime : `${rawTime}Z`) : 0;
    found.set(action.trx_id, {transactionId:action.trx_id, recipeId, title:recipeId ? `Blend #${recipeId}` : 'Seed pack', timestamp:Number.isFinite(date) ? date : 0});
  }
  return [...found.values()].sort((a,b)=>b.timestamp-a.timestamp);
}

export async function fetchRecentOpenings(wallet, signal) {
  if (!/^[a-z1-5.]{1,12}$/.test(wallet)) return [];
  const controller = new AbortController();
  const cancel = ()=>controller.abort();
  signal?.addEventListener('abort',cancel,{once:true});
  if (signal?.aborted) cancel();
  const timeout = setTimeout(cancel,10000);
  const actions = [];
  try {
    for (let page=0;page<3;page+=1) {
      const params = new URLSearchParams({account:wallet,filter:'*:transfer',sort:'desc',limit:'100',skip:String(page*100)});
      const response = await fetch(`https://wax.eosusa.io/v2/history/get_actions?${params}`,{signal:controller.signal});
      if (!response.ok) throw new Error('History unavailable');
      const data = await response.json();
      if (!Array.isArray(data.actions)) throw new Error('Invalid history response');
      actions.push(...data.actions);
      if (recentOpeningTransactions(actions,wallet).length>=10 || data.actions.length<100) break;
    }
    return recentOpeningTransactions(actions,wallet).slice(0,10);
  } finally {clearTimeout(timeout);signal?.removeEventListener('abort',cancel);}
}
