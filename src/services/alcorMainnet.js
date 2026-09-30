import {farmReward,assertFarmReview} from './farmRewards';
import {candidateRoutes, assembleRoute, assertRouteReview, routeAction} from './exchangeRoutes';
/* global BigInt */
import { getHealthyWaxMainnetEndpoint, invalidateWaxMainnetEndpoint, WAX_MAINNET_ENDPOINTS } from './waxMainnetEndpoints';
import { buildContractAction } from './contractKit';
import { InitTransaction } from '../hooks/useSession';
import { TOKENS, formatRaw, SWAP_CONTRACT, identity, requireToken, rawAmount, assertPool, parseChainJson, paginateRows, assertReview, reviewActions } from './exchangeMath';
import { sdkPool, quoteTrade, describePosition, quotePosition } from './exchangeQuotes';
import { normalizePortfolio } from './alcorPortfolio';
import { readSwapHistory } from './exchangeHistory';

const API = 'https://wax.alcor.exchange/api/v2';
let poolIndexPromise;
let poolIndexExpires = 0;
function readPoolIndex() {
  if (!poolIndexPromise || Date.now() >= poolIndexExpires) {
    poolIndexExpires = Date.now() + 15000;
    poolIndexPromise = readJson(`${API}/swap/pools`).catch(error => { poolIndexExpires = 0; throw error; });
  }
  return poolIndexPromise;
}
export async function fetchAllPositions(actor) {
  if (!/^[a-z1-5.]{1,13}$/.test(actor)) throw new Error('Connect a WAX account to see its positions.');
  // This account endpoint returns all positions; unlike history it is not paginated.
  const [positions, pools] = await Promise.all([
    readJson(`${API}/account/${encodeURIComponent(actor)}/positions`),
    readPoolIndex().catch(() => null),
  ]);
  return { groups: normalizePortfolio(actor, positions, pools || []), metadataUnavailable: pools === null, updatedAt: Date.now() };
}
async function readJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`Exchange data request failed (${response.status}).`);
    return parseChainJson(await response.text());
  } finally { clearTimeout(timeout); }
}
async function rpc(method, body) {
  const attempted=[]; let last;
  for (let attempt=0; attempt<(WAX_MAINNET_ENDPOINTS?.length || 3); attempt++) {
    let endpoint;
    try { endpoint=await getHealthyWaxMainnetEndpoint({exclude:[...attempted]}); }
    catch(error) { last=last||error; break; }
    if(attempted.includes(endpoint))break;
    attempted.push(endpoint);
    try { return await readJson(`${endpoint}/v1/chain/${method}`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); }
    catch(error) { last=error; invalidateWaxMainnetEndpoint(endpoint); }
  }
  const detail=last?.name==='AbortError'?'The node timed out.':last?.message;
  throw new Error(`Unable to load verified WAX data after trying ${attempted.length} node${attempted.length===1?'':'s'}. Please retry.${detail && detail!=='Failed to fetch'?' '+detail:''}`);
}
const table = options => rpc('get_table_rows', { json: true, code: SWAP_CONTRACT, ...options });
const allRows = (scope, name) => paginateRows(table, { scope: String(scope), table: name });
export async function fetchPools() {
  // The public index discovers IDs only; each selected pool is verified on-chain.
  try {
    const rows = await readPoolIndex();
    if (!Array.isArray(rows)) throw new Error('Invalid pool index.');
    return rows.flatMap(row => {
      try {
        const tokenA = requireToken({ ...row.tokenA, precision: row.tokenA.decimals });
        const tokenB = requireToken({ ...row.tokenB, precision: row.tokenB.decimals });
        if (!row.active || identity(tokenA) === identity(tokenB) || !Number.isSafeInteger(row.id) || !Number.isInteger(row.fee)) return [];
        return [{ id: String(row.id), tokenA, tokenB, fee: row.fee, funded: BigInt(row.liquidity) > 0n }];
      } catch { return []; }
    });
  } catch {
    const rows = await allRows(SWAP_CONTRACT, 'pools');
    return rows.flatMap(row => {
      try { const [tokenA, tokenB] = assertPool(row, row.id); return [{ id: String(row.id), tokenA, tokenB, fee: row.fee, funded: BigInt(row.liquidity) > 0n }]; }
      catch { return []; }
    });
  }
}
export async function fetchPool(id, allowedTokens=TOKENS) {
  if (!/^\d+$/.test(String(id))) throw new Error('Invalid pool.');
  const result = await table({ scope: SWAP_CONTRACT, table: 'pools', lower_bound: String(id), upper_bound: String(id), limit: 1 });
  const row = result.rows?.[0]; assertPool(row, id, allowedTokens); return row;
}
async function snapshot(id, allowedTokens=TOKENS) {
  const [row, ticks] = await Promise.all([fetchPool(id,allowedTokens), allRows(id, 'ticks')]);
  return { row, ticks };
}
export async function fetchBalances(actor) {
  const values = await Promise.allSettled(TOKENS.map(async token => {
    const rows = await rpc('get_currency_balance', { code: token.contract, account: actor, symbol: token.symbol });
    if (!Array.isArray(rows)) throw new Error('Invalid balance response.');
    const balance = rows[0] || `${'0.' + '0'.repeat(token.precision)} ${token.symbol}`;
    const [amount, symbol] = balance.split(' ');
    if (symbol !== token.symbol) throw new Error('Unexpected balance symbol.');
    return rawAmount(amount, token, true).toString();
  }));
  return Object.fromEntries(TOKENS.map((token, i) => [token.key, values[i].status === 'fulfilled' ? values[i].value : null]));
}
export async function fetchQuote(params) { return quoteTrade({ ...await snapshot(params.poolId), ...params }); }
export async function fetchPositions(poolId, actor) {
  const [{ row, ticks }, positions] = await Promise.all([snapshot(poolId), allRows(poolId, 'positions')]);
  const pool = sdkPool(row, ticks);
  const owned = positions.filter(p => p.owner === actor);
  return Promise.all(owned.map(p => describePosition(p, pool)));
}
async function fetchPositionRow(poolId, id, actor) {
  const result = await table({ scope: String(poolId), table: 'positions', lower_bound: String(id), upper_bound: String(id), limit: 1 });
  const row = result.rows?.[0];
  if (!row || String(row.id) !== String(id) || row.owner !== actor) throw new Error('Position no longer exists for this wallet.');
  return row;
}
export async function fetchPositionQuote(params) {
  const [state, positionRow] = await Promise.all([snapshot(params.poolId), fetchPositionRow(params.poolId, params.positionId, params.actor)]);
  return quotePosition({ ...state, positionRow, ...params });
}
export async function executeReview(quote, context) {
  assertReview(quote, context);
  const current = await fetchPool(quote.poolId);
  const [a, b] = assertPool(current, quote.poolId);
  if (identity(a) !== identity(quote.tokenA) || identity(b) !== identity(quote.tokenB) || (quote.fee !== undefined && current.fee !== quote.fee)) throw new Error('Pool changed. Request a fresh quote.');
  if (quote.positionId) {
    const position = await fetchPositionRow(quote.poolId, quote.positionId, quote.actor);
    if (position.tickLower !== quote.tickLower || position.tickUpper !== quote.tickUpper || (quote.kind === 'remove' && BigInt(position.liquidity) < BigInt(quote.selectedLiquidity))) throw new Error('Position changed. Review again.');
  }
  const actions = await Promise.all(reviewActions(quote).map(a => buildContractAction(a.account, a.name, a.data)));
  assertReview(quote, context);
  return InitTransaction({ actions, expectedActor: quote.actor, validUntil: quote.expiresAt });
}
export async function fetchHistory(poolId, range) {
  return readSwapHistory(path=>readJson(API+path),poolId,range);
}

export async function fetchSwapActivity(actor) {
  if (!/^[a-z1-5.]{1,12}$/.test(actor)) return [];
  const [rows,pools] = await Promise.all([readJson(`${API}/account/${actor}/swap-history?limit=25`),readPoolIndex()]);
  if (!Array.isArray(rows)) throw new Error('Activity unavailable.');
  return rows.flatMap(row=>{
    const pool=pools.find(p=>String(p.id)===String(row.pool));
    if (!pool || !/^[a-f0-9]{64}$/i.test(row.trx_id || '')) return [];
    return [{...row,symbolA:pool.tokenA.symbol,symbolB:pool.tokenB.symbol}];
  });
}

// Portfolio liquidity supports any pool whose exact assets are verified on WAX mainnet.
// This scope is passed explicitly; the swap token allowlist is not changed.
export async function loadPortfolioLiquidity({ poolId, positionId, actor }) {
  if (!/^\d+$/.test(String(poolId)) || !/^\d+$/.test(String(positionId)) || !/^[a-z1-5.]{1,12}$/.test(actor)) throw new Error('Invalid pool, position or wallet.');
  const [result, positionRow, ticks] = await Promise.all([
    table({ scope: SWAP_CONTRACT, table: 'pools', lower_bound: String(poolId), upper_bound: String(poolId), limit: 1 }),
    fetchPositionRow(poolId, positionId, actor), allRows(poolId, 'ticks'),
  ]);
  const row = result.rows?.[0];
  if (String(row?.id) !== String(poolId)) throw new Error('Pool not found on mainnet.');
  const allowedTokens = ['tokenA', 'tokenB'].map(key => {
    const value = row[key]; const match = String(value?.quantity).match(/^\d+(?:\.(\d+))? ([A-Z]{1,7})$/);
    if (!match || !/^[a-z1-5.]{1,13}$/.test(value.contract) || (match[1] || '').length > 18) throw new Error('Invalid on-chain token.');
    return { symbol: match[2], precision: (match[1] || '').length, contract: value.contract };
  });
  assertPool(row, poolId, allowedTokens);
  const balances = await Promise.all(allowedTokens.map(async token => {
    const [stats, amounts] = await Promise.all([
      rpc('get_currency_stats', { code: token.contract, symbol: token.symbol }),
      rpc('get_currency_balance', { code: token.contract, symbol: token.symbol, account: actor }),
    ]);
    const supply = String(stats[token.symbol]?.supply || '').split(' ');
    if (supply[1] !== token.symbol || (supply[0].split('.')[1] || '').length !== token.precision) throw new Error('Token precision does not match its mainnet contract.');
    if (!Array.isArray(amounts)) throw new Error('Unable to verify your token balance.');
    if (!amounts.length) return '0';
    const [amount, symbol] = amounts[0].split(' ');
    if (symbol !== token.symbol) throw new Error('Unexpected balance token.');
    return rawAmount(amount, token, true, allowedTokens).toString();
  }));
  return { row, positionRow, ticks, allowedTokens, balances };
}
export async function quotePortfolioLiquidity(params) {
  const state = await loadPortfolioLiquidity(params);
  const { row, ticks, positionRow, allowedTokens, balances } = state;
  if (params.kind === 'add') {
    const inputToken = allowedTokens[params.inputSide === 'b' ? 1 : 0];
    const q = quoteTrade({ ...params, row, ticks, allowedTokens, inputToken, positionRange: { tickLower: positionRow.tickLower, tickUpper: positionRow.tickUpper } });
    const missing = [q.rawA,q.rawB].map((raw,i) => BigInt(raw)>BigInt(balances[i]) ? `${formatRaw(BigInt(raw)-BigInt(balances[i]),allowedTokens[i])} ${allowedTokens[i].symbol}` : null).filter(Boolean);
    if (missing.length) throw new Error(`Insufficient wallet balance. Missing ${missing.join(' and ')} for this deposit.`);
    return { ...q, positionId: String(positionRow.id) };
  }
  if (!['remove', 'collect'].includes(params.kind)) throw new Error('Unsupported liquidity operation.');
  return quotePosition({ ...params, row, ticks, positionRow, allowedTokens });
}
export async function executePortfolioLiquidity(quote, context) {
  if (!['add', 'remove', 'collect'].includes(quote?.kind)) throw new Error('Unsupported liquidity operation.');
  const state = await loadPortfolioLiquidity({ poolId: context.poolId, positionId: context.positionId, actor: context.actor });
  const { allowedTokens, positionRow, balances } = state;
  const reviewContext = quote.kind === 'add' ? { ...context, inputToken: allowedTokens[context.inputSide === 'b' ? 1 : 0] } : context;
  assertReview(quote, reviewContext, Date.now(), allowedTokens);
  if (quote.kind === 'remove' && quote.percent !== context.percent) throw new Error('Withdrawal percentage changed. Review again.');
  if (String(quote.positionId) !== String(context.positionId) || quote.tickLower !== positionRow.tickLower || quote.tickUpper !== positionRow.tickUpper ||
      identity(quote.tokenA) !== identity(allowedTokens[0]) || identity(quote.tokenB) !== identity(allowedTokens[1])) throw new Error('Position changed. Review again.');
  if (quote.kind === 'remove' && BigInt(quote.selectedLiquidity) > BigInt(positionRow.liquidity)) throw new Error('Position liquidity changed. Review again.');
  if (quote.kind === 'add' && (BigInt(quote.rawA) > BigInt(balances[0]) || BigInt(quote.rawB) > BigInt(balances[1]))) throw new Error('Insufficient wallet balance.');
  const actions = await Promise.all(reviewActions(quote, Date.now(), allowedTokens).map(a => buildContractAction(a.account, a.name, a.data)));
  assertReview(quote, reviewContext, Date.now(), allowedTokens);
  return InitTransaction({ actions, expectedActor: context.actor, validUntil: quote.expiresAt });
}

// Quote all supported paths through up to three pools with the same local SDK used for direct swaps.
// Pool snapshots are shared across candidates; no API-supplied transaction memo is executed.
export async function fetchRouteQuote(params) {
  const paths = candidateRoutes(await fetchPools(), params.inputToken, params.outputToken);
  if (!paths.length) throw new Error('No route through up to three pools found for these tokens.');
  const snapshots = new Map();
  const getSnapshot = id => {
    if (!snapshots.has(id)) snapshots.set(id, snapshot(id));
    return snapshots.get(id);
  };
  const results = [];
  let cursor = 0;
  await Promise.all(Array.from({length: Math.min(4, paths.length)}, async () => {
    while(cursor < paths.length) {
      const path = paths[cursor++];
      try {
        let inputToken=params.inputToken, amount=params.amount;
        const hops=[];
        for(const poolId of path) {
          const hop=quoteTrade({...await getSnapshot(poolId),...params,inputToken,amount,kind:'swap'});
          hops.push(hop); inputToken=hop.outputToken; amount=formatRaw(hop.outputRaw,inputToken);
        }
        if(identity(inputToken)===identity(params.outputToken)) results.push(assembleRoute(hops,params));
      } catch { /* Incomplete/paused/unsupported paths cannot be offered for signing. */ }
    }
  }));
  const fresh=results.filter(q=>q.expiresAt>Date.now()+3000);
  if(!fresh.length) throw new Error('No fresh route could be quoted. Refresh or try a smaller amount.');
  fresh.sort((a,b)=>BigInt(a.outputRaw)>BigInt(b.outputRaw)?-1:BigInt(a.outputRaw)<BigInt(b.outputRaw)?1:a.route.length-b.route.length);
  return {...fresh[0],coverage:{quoted:fresh.length,total:paths.length}};
}

export async function executeRouteReview(quote, context) {
  assertRouteReview(quote,context);
  const current=await Promise.all(quote.route.map(id=>fetchPool(id)));
  current.forEach((row,i)=>{
    const [a,b]=assertPool(row,quote.route[i]); const hop=quote.hops[i];
    if(identity(a)!==identity(hop.tokenA) || identity(b)!==identity(hop.tokenB) || row.fee!==hop.fee) throw new Error('A route pool changed. Review again.');
  });
  const balances=await fetchBalances(context.actor);
  if(balances[quote.inputToken.key]==null || BigInt(balances[quote.inputToken.key])<BigInt(quote.inputRaw)) throw new Error('Insufficient or unavailable input balance. Refresh balances.');
  const spec=routeAction(quote,context);
  const action=await buildContractAction(spec.account,spec.name,spec.data);
  assertRouteReview(quote,context);
  return InitTransaction({actions:[action],expectedActor:quote.actor,validUntil:quote.expiresAt});
}
// Alcor farms: stakingpos discovers memberships; stakes and incentives are read on-chain.
async function farmMap(items, worker, concurrency=4) {
  const output=new Array(items.length); let next=0;
  await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{while(next<items.length){const i=next++;output[i]=await worker(items[i]);}}));
  return output;
}
async function farmRow(scope,name,id,field='id') {
  if(!/^\d+$/.test(String(id)))throw new Error('Invalid farm ID.');
  const result=await table({scope:String(scope),table:name,lower_bound:String(id),upper_bound:String(id),limit:1});
  const row=result.rows?.[0];
  return row && String(row[field])===String(id)?row:null;
}
export async function fetchFarmPortfolio(actor) {
  const {groups}=await fetchAllPositions(actor);
  const positions=groups.flatMap(group=>group.positions.map(position=>({...position,group})));
  const memberships=await farmMap(positions,async position=>({position,row:await farmRow(SWAP_CONTRACT,'stakingpos',position.id,'posId')}));
  const incentives=[...new Set(memberships.flatMap(({row})=>row?.incentiveIds?.map(String)||[]))];
  const rows=(await farmMap(incentives,async incentiveId=>{
    const matching=memberships.filter(({row})=>row?.incentiveIds?.map(String).includes(incentiveId)).map(m=>m.position);
    const ids=matching.map(p=>BigInt(p.id)).sort((a,b)=>a<b?-1:a>b?1:0);
    const [incentive,stakes]=await Promise.all([farmRow(SWAP_CONTRACT,'incentives',incentiveId),paginateRows(table,{scope:incentiveId,table:'stakes',lower_bound:String(ids[0]),upper_bound:String(ids[ids.length-1])})]);
    if(!incentive)throw new Error('A farm changed while loading. Refresh to retry.');
    return matching.flatMap(position=>{
      const stake=stakes.find(s=>String(s.posId)===position.id);
      if(!stake)return [];
      if(String(incentive.poolId)!==position.poolId)throw new Error('Farm pool mismatch. Refresh to retry.');
      return [{poolId:position.poolId,posId:position.id,incentiveId,group:position.group,inRange:position.inRange,incentive,stake,...farmReward(incentive,stake)}];
    });
  })).flat();
  return {rows,updatedAt:Date.now()};
}
async function verifiedFarm(actor,entry) {
  await fetchPositionRow(entry.poolId,entry.posId,actor);
  const [incentive,stake]=await Promise.all([farmRow(SWAP_CONTRACT,'incentives',entry.incentiveId),farmRow(entry.incentiveId,'stakes',entry.posId,'posId')]);
  if(!incentive||!stake||String(incentive.poolId)!==String(entry.poolId))throw new Error('This farm stake is no longer available for your position.');
  return {...farmReward(incentive,stake)};
}
export async function reviewFarmClaim(actor,entry) {
  const draft={actor,poolId:String(entry.poolId),posId:String(entry.posId),incentiveId:String(entry.incentiveId),expiresAt:Date.now()+30000};
  assertFarmReview(draft,actor);
  const reward=await verifiedFarm(actor,draft);
  if(BigInt(reward.raw)<=0n)throw new Error('No rewards are available to claim yet.');
  return {...draft,...reward,expiresAt:Date.now()+30000};
}
export async function executeFarmClaim(review,actor) {
  assertFarmReview(review,actor);
  const current=await verifiedFarm(actor,review);
  if(identity(current.token)!==identity(review.token)||current.token.precision!==review.token.precision)throw new Error('Reward token changed. Review again.');
  if(BigInt(current.raw)<=0n)throw new Error('These rewards have already been claimed. Refresh your farms.');
  const action=await buildContractAction(SWAP_CONTRACT,'getreward',{incentiveId:review.incentiveId,posId:review.posId});
  assertFarmReview(review,actor);
  return InitTransaction({actions:[action],expectedActor:actor,validUntil:review.expiresAt});
}
export async function reviewAllFarmClaims(actor,entries) {
  const unique=[...new Map(entries.map(e=>[`${e.incentiveId}:${e.posId}`,e])).values()];
  const checked=await farmMap(unique,async entry=>{
    const draft={actor,poolId:String(entry.poolId),posId:String(entry.posId),incentiveId:String(entry.incentiveId),expiresAt:Date.now()+30000};
    assertFarmReview(draft,actor);
    return {...draft,...await verifiedFarm(actor,draft)};
  },1);
  const expiresAt=Date.now()+30000;
  const claims=checked.filter(c=>BigInt(c.raw)>0n).map(c=>({...c,expiresAt}));
  if(!claims.length)throw new Error('No rewards are available to claim yet.');
  return {actor,expiresAt,claims};
}
export async function executeAllFarmClaims(review,actor) {
  if(!review||review.actor!==actor||!Array.isArray(review.claims)||!review.claims.length)throw new Error('Review your farm claims again.');
  const seen=new Set();
  for(const claim of review.claims){
    assertFarmReview(claim,actor);
    const key=`${claim.incentiveId}:${claim.posId}`;
    if(seen.has(key)||claim.expiresAt!==review.expiresAt)throw new Error('Invalid claim review. Review again.');
    seen.add(key);
  }
  const actions=await farmMap(review.claims,async claim=>{
    const current=await verifiedFarm(actor,claim);
    if(identity(current.token)!==identity(claim.token)||current.token.precision!==claim.token.precision)throw new Error('Reward token changed. Review again.');
    if(BigInt(current.raw)<=0n)throw new Error('A reward was already claimed. Refresh and review again.');
    return buildContractAction(SWAP_CONTRACT,'getreward',{incentiveId:claim.incentiveId,posId:claim.posId});
  },1);
  review.claims.forEach(claim=>assertFarmReview(claim,actor));
  return InitTransaction({actions,expectedActor:actor,validUntil:review.expiresAt});
}
export async function verifyWalletHoldings(actor,tokens) {
 if(!/^[a-z1-5.]{1,12}$/.test(actor))throw new Error('Invalid wallet.');
 const valid=tokens.filter(t=>/^[A-Z]{1,7}$/.test(t.symbol)&&/^[a-z1-5.]{1,13}$/.test(t.contract)&&Number.isInteger(t.precision)&&t.precision>=0&&t.precision<=18);
 const contracts=[...new Set(valid.map(t=>t.contract))];let unavailable=tokens.length-valid.length;
 const verified=(await farmMap(contracts,async contract=>{
  try {
   const balances=await rpc('get_currency_balance',{code:contract,account:actor});
   if(!Array.isArray(balances))throw new Error('Invalid balance response');
   return valid.filter(t=>t.contract===contract).flatMap(token=>{
    const balance=balances.find(b=>typeof b==='string'&&b.endsWith(` ${token.symbol}`));
    if(!balance)return [];
    const amount=balance.split(' ')[0];if((amount.split('.')[1]||'').length!==token.precision)throw new Error('Balance precision mismatch');const raw=rawAmount(amount,token,true,[token]);
    return raw>0n?[{...token,amount,exactAmount:formatRaw(raw,token),raw:raw.toString(),error:undefined}]:[];
   });
  }catch{unavailable+=valid.filter(t=>t.contract===contract).length;return [];}
 },3)).flat();
 return {tokens:verified,unavailable};
}
async function dustToken(actor,token) {
 if(!token||!/^[A-Z]{1,7}$/.test(token.symbol)||!/^[a-z1-5.]{1,13}$/.test(token.contract)||!Number.isInteger(token.precision)||token.precision<0||token.precision>18)throw new Error('Invalid input token.');
 const stats=await rpc('get_currency_stats',{code:token.contract,symbol:token.symbol});
 const supply=stats[token.symbol]?.supply;
 if(typeof supply!=='string'||!supply.endsWith(` ${token.symbol}`))throw new Error('Token contract could not be verified.');
 if((supply.split(' ')[0].split('.')[1]||'').length!==token.precision)throw new Error('Token precision does not match its contract.');
 rawAmount(supply.split(' ')[0],token,true,[token]);
 const verified=await verifyWalletHoldings(actor,[token]);
 if(verified.unavailable)throw new Error('Wallet balance could not be verified. Retry.');
 if(!verified.tokens.length)throw new Error('No balance remains for this token. Refresh holdings.');
 return verified.tokens[0];
}
// NEWS charges each configured transfer fee in addition to the transferred amount.
// Round each reserve upward so integer rounding cannot overdraw the wallet.
export async function dustTransferBudget(token,raw,actor) {
 if(token.contract==='chadtoken.gm') {
  const result=await rpc('get_table_rows',{json:true,code:token.contract,scope:token.contract,table:'txfees',limit:100});
  const config=result.rows?.find(r=>r.sym===`${token.precision},${token.symbol}`);
  if(!config||result.more||!Array.isArray(config.fee_receivers)||!Array.isArray(config.ignored_senders))throw new Error('CHAD token transfer settings could not be verified.');
  const exempt=config.ignored_senders.includes(actor);
  let reserve=0n;
  for(const receiver of config.fee_receivers){
   const rate=String(receiver.fee);
   if(!/^\d+(\.\d{1,24})?$/.test(rate))throw new Error('Unsupported CHAD transfer fee.');
   const [whole,fraction='']=rate.split('.'),scale=10n**BigInt(fraction.length),numerator=BigInt(whole+fraction);
   if(numerator>scale)throw new Error('Unsupported CHAD transfer fee.');
   // Reserve conservatively using the published float32 rate, plus one raw unit
   // for contract floating-point rounding. Never use Number for token amounts.
   if(!exempt&&numerator>0n)reserve+=(BigInt(raw)*numerator+scale-1n)/scale+1n;
  }
  if(BigInt(raw)<=reserve)throw new Error('Balance is too small to cover the token transfer fees.');
  return {spendRaw:String(BigInt(raw)-reserve),reserveRaw:String(reserve),feeConfig:JSON.stringify(config)};
 }
 if(!['newstokenwax','cointreasure'].includes(token.contract))return {spendRaw:String(raw),reserveRaw:'0',feeConfig:''};
 const result=await rpc('get_table_rows',{json:true,code:token.contract,scope:token.contract,table:'configs',limit:100});
 const config=result.rows?.find(r=>r.code===token.symbol);
 if(!config||result.more||!config.is_tradeable||!Array.isArray(config.tx_fees))throw new Error('Token transfer settings could not be verified.');
 const fees=config.tx_fees;
 if(fees.some(f=>!Number.isInteger(f.bps)||f.bps<0||f.bps>10000))throw new Error('Unsupported token transfer fee.');
 const reserve=fees.reduce((sum,f)=>sum+(BigInt(raw)*BigInt(f.bps)+9999n)/10000n,0n);
 if(BigInt(raw)<=reserve)throw new Error('Balance is too small to cover the token transfer fees.');
 const spend=BigInt(raw)-reserve;
 // CoinTreasure reported a minimum-amount rejection for small KRAKEN dust.
 // Conservatively require every nonzero fee to be representable before approval.
 if(token.contract==='cointreasure'&&fees.some(f=>f.bps>0&&spend*BigInt(f.bps)/10000n===0n))throw new Error(token.symbol+' balance is too small for the converter transfer-fee rounding check. This dust cannot be converted here at its current amount.');
 return {spendRaw:String(spend),reserveRaw:String(reserve),feeConfig:JSON.stringify(fees)};
}
export async function quoteDustConversion(actor,token) {
 const input=await dustToken(actor,token),output=TOKENS.find(t=>t.symbol==='TRASH');
 const allowedTokens=[...TOKENS.filter(t=>identity(t)!==identity(input)),input];
 if(identity(input)===identity(output))throw new Error('TRASH is already the destination token.');
 const index=await readPoolIndex();
 const pools=index.flatMap(p=>{try{const a=requireToken({...p.tokenA,precision:p.tokenA.decimals},allowedTokens),b=requireToken({...p.tokenB,precision:p.tokenB.decimals},allowedTokens);return p.active&&BigInt(p.liquidity)>0n?[{id:String(p.id),funded:true,tokenA:a,tokenB:b}]:[];}catch{return [];}});
 const paths=candidateRoutes(pools,input,output,allowedTokens);
 if(!paths.length)throw new Error('No route through up to three pools to TRASH is available.');
 const budget=await dustTransferBudget(input,input.raw,actor);
 const params={actor,kind:'swap',poolId:'auto',inputToken:input,outputToken:output,amount:formatRaw(budget.spendRaw,input),slippageBps:50,transferFeeReserve:budget.reserveRaw,feeConfig:budget.feeConfig};
 const snapshots=new Map();const get=id=>{if(!snapshots.has(id))snapshots.set(id,snapshot(id,allowedTokens));return snapshots.get(id);};
 const quotes=(await farmMap(paths,async path=>{try{const hops=[];let inputToken=input,amount=params.amount;for(const poolId of path){const hop=quoteTrade({...await get(poolId),...params,inputToken,amount,allowedTokens});hops.push(hop);inputToken=hop.outputToken;amount=formatRaw(hop.outputRaw,inputToken);}return assembleRoute(hops,params);}catch{return null;}},2)).filter(q=>q&&q.expiresAt>Date.now()+5000);
 if(!quotes.length)throw new Error('No usable quote: the balance may be too small, liquidity unavailable, or route data could not be loaded.');
 quotes.sort((a,b)=>BigInt(a.outputRaw)>BigInt(b.outputRaw)?-1:BigInt(a.outputRaw)<BigInt(b.outputRaw)?1:0);
 const quote={...quotes[0],coverage:{quoted:quotes.length,total:paths.length}};
 if(quote.impactBps>500)throw new Error('Price impact exceeds 5%. This token is not suitable for dust conversion at this amount.');
 assertRouteReview(quote,params,Date.now(),allowedTokens);
 return {quote,params};
}
export async function executeDustConversion(review,actor) {
 if(!review||review.params.actor!==actor)throw new Error('Wallet changed. Review again.');
 const {quote,params}=review;const output=TOKENS.find(t=>t.symbol==='TRASH');
 if(identity(params.outputToken)!==identity(output)||params.slippageBps!==50)throw new Error('Conversion settings changed. Review again.');
 const allowedTokens=[...TOKENS.filter(t=>identity(t)!==identity(params.inputToken)),params.inputToken];
 assertRouteReview(quote,params,Date.now(),allowedTokens);
 if(quote.impactBps>500)throw new Error('Price impact exceeds the dust limit.');
 const balance=await dustToken(actor,params.inputToken);
 const budget=await dustTransferBudget(params.inputToken,balance.raw,actor);
 if((params.feeConfig||'')!==budget.feeConfig)throw new Error('Token transfer fees changed. Review again.');
 if(BigInt(balance.raw)<BigInt(quote.inputRaw)+BigInt(budget.reserveRaw))throw new Error('Balance changed or cannot cover transfer fees. Review the conversion again.');
 const pools=await Promise.all(quote.route.map(id=>fetchPool(id,allowedTokens)));
 pools.forEach((row,i)=>{const [a,b]=assertPool(row,quote.route[i],allowedTokens),hop=quote.hops[i];if(identity(a)!==identity(hop.tokenA)||identity(b)!==identity(hop.tokenB)||row.fee!==hop.fee)throw new Error('Route changed. Review again.');});
 const spec=routeAction(quote,params,Date.now(),allowedTokens);
 const action=await buildContractAction(spec.account,spec.name,spec.data);
 assertRouteReview(quote,params,Date.now(),allowedTokens);
 return InitTransaction({actions:[action],expectedActor:actor,validUntil:quote.expiresAt});
}
export async function reviewFarmUnstake(actor,entry) {
  const draft={actor,poolId:String(entry.poolId),posId:String(entry.posId),incentiveId:String(entry.incentiveId),expiresAt:Date.now()+30000};
  assertFarmReview(draft,actor);
  const reward=await verifiedFarm(actor,draft);
  return {...draft,...reward,unstake:true,expiresAt:Date.now()+30000};
}
export async function executeFarmUnstake(review,actor) {
  assertFarmReview(review,actor);
  if(review.unstake!==true)throw new Error('Review this farm unstake again.');
  const current=await verifiedFarm(actor,review);
  if(identity(current.token)!==identity(review.token)||current.token.precision!==review.token.precision)throw new Error('Reward token changed. Review again.');
  // Per-incentive unstake only: never unstakepos or remove pool liquidity.
  const action=await buildContractAction(SWAP_CONTRACT,'unstake',{incentiveId:review.incentiveId,posId:review.posId});
  assertFarmReview(review,actor);
  return InitTransaction({actions:[action],expectedActor:actor,validUntil:review.expiresAt});
}