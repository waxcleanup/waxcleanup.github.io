/* global BigInt */
export const SWAP_CONTRACT = 'swap.alcor';
export const TOKENS = Object.freeze([
  { key: 'wax', symbol: 'WAX', precision: 8, contract: 'eosio.token' },
  { key: 'cinder', symbol: 'CINDER', precision: 6, contract: 'cleanuptoken' },
  { key: 'trash', symbol: 'TRASH', precision: 3, contract: 'cleanuptoken' },
  { key: 'tomatoe', symbol: 'TOMATOE', precision: 8, contract: 'maestrobeatz' },
  { key: 'bananaz', symbol: 'BANANAZ', precision: 8, contract: 'maestrobeatz' },
  { key: 'waxusdc', symbol: 'WAXUSDC', precision: 6, contract: 'eth.token' },
].map(Object.freeze));
export const MAX_ASSET = (2n ** 62n) - 1n;
export const identity = t => `${t.symbol}@${t.contract}:${t.precision}`;
export const requireToken = (t, allowedTokens = TOKENS) => {
  const found = allowedTokens.find(candidate => identity(candidate) === identity(t));
  if (!found) throw new Error('Unsupported mainnet token or precision.');
  return found;
};
export function rawAmount(value, token, allowZero = false, allowedTokens = TOKENS) {
  requireToken(token, allowedTokens);
  const text = String(value).trim().replace(/^\.(?=\d)/, '0.');
  if (!/^\d+(?:\.\d+)?$/.test(text)) throw new Error(`Enter a decimal ${token.symbol} amount.`);
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > token.precision) throw new Error(`${token.symbol} supports ${token.precision} decimal places.`);
  const raw = BigInt(whole) * 10n ** BigInt(token.precision) + BigInt(fraction.padEnd(token.precision, '0') || '0');
  if (raw > MAX_ASSET || raw < 0n || (!allowZero && raw === 0n)) throw new Error('Amount is outside the supported asset range.');
  return raw;
}
export function formatRaw(value, token) {
  const raw = BigInt(value);
  if (raw < 0n || raw > MAX_ASSET) throw new Error('Invalid asset amount.');
  const scale = 10n ** BigInt(token.precision);
  return `${raw / scale}${token.precision ? '.' + (raw % scale).toString().padStart(token.precision, '0') : ''}`;
}
export const asset = (raw, token) => `${formatRaw(raw, token)} ${token.symbol}`;
export function checkSlippage(bps) {
  if (!Number.isInteger(bps) || bps < 1 || bps > 100) throw new Error('Choose slippage between 0.01% and 1%.');
  return bps;
}
export const minimumRaw = (raw, bps) => BigInt(raw) * BigInt(10000 - checkSlippage(bps)) / 10000n;
export function poolTokens(row, allowedTokens = TOKENS) {
  return ['tokenA', 'tokenB'].map(key => {
    const value = row[key];
    const match = String(value?.quantity).match(/^\d+(?:\.(\d+))? ([A-Z]{1,7})$/);
    if (!match) throw new Error('Invalid pool asset.');
    return requireToken({ contract: value.contract, symbol: match[2], precision: (match[1] || '').length }, allowedTokens);
  });
}
export function assertPool(row, id, allowedTokens = TOKENS) {
  if (String(row?.id) !== String(id)) throw new Error('The requested pool was not returned.');
  const [a, b] = poolTokens(row, allowedTokens);
  if (identity(a) === identity(b)) throw new Error('Pool assets must be different.');
  if (!row.active) throw new Error('This pool is paused.');
  if (!Number.isSafeInteger(Number(row.id)) || Number(row.id) < 0) throw new Error('Invalid pool ID.');
  return [a, b];
}
export function fullRangeTicks(spacing) {
  if (!Number.isInteger(spacing) || spacing < 1 || spacing > 10000) throw new Error('Invalid tick spacing.');
  return { tickLower: Math.ceil(-443636 / spacing) * spacing, tickUpper: Math.floor(443636 / spacing) * spacing };
}
// RPC can serialize uint64 values as JSON numbers. Preserve their digits before parsing.
export function parseChainJson(text) {
  return JSON.parse(text.replace(/"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    value => /^-?\d{16,}$/.test(value) ? `"${value}"` : value));
}
export async function paginateRows(read, options) {
  const rows = [];
  let cursor = '';
  const seen = new Set();
  for (let page = 0; page < 100; page += 1) {
    const result = await read({ ...options, limit: 1000, ...(cursor ? { lower_bound: cursor } : {}) });
    if (!Array.isArray(result.rows)) throw new Error('Invalid table response.');
    rows.push(...result.rows);
    if (!result.more) return rows;
    const next = String(result.next_key || '');
    if (!next || seen.has(next)) throw new Error('Incomplete table data. Please refresh.');
    seen.add(next); cursor = next;
  }
  throw new Error('Table is too large to load completely.');
}
export function assertReview(q, { actor, poolId, kind, inputToken, amount, slippageBps }, now = Date.now(), allowedTokens = TOKENS) {
  if (!q || q.network !== 'wax-mainnet' || !Number.isSafeInteger(q.expiresAt) || !Number.isSafeInteger(q.createdAt) || now >= q.expiresAt || q.createdAt > now || q.expiresAt <= q.createdAt || q.expiresAt - q.createdAt > 30000) throw new Error('Quote expired. Refresh it before continuing.');
  if (!/^[a-z1-5.]{1,12}$/.test(actor) || q.actor !== actor) throw new Error('Wallet account changed. Review again.');
  if (String(q.poolId) !== String(poolId) || q.kind !== kind || q.slippageBps !== checkSlippage(slippageBps)) throw new Error('Pool or settings changed. Review again.');
  requireToken(q.tokenA, allowedTokens); requireToken(q.tokenB, allowedTokens);
  if (!/^\d+$/.test(String(q.poolId)) || identity(q.tokenA) === identity(q.tokenB)) throw new Error('Invalid quoted pool.');
  if (q.kind === 'swap' && (identity(q.inputToken) === identity(q.outputToken) || ![q.inputToken, q.outputToken].every(t => [identity(q.tokenA), identity(q.tokenB)].includes(identity(t))))) throw new Error('Quoted tokens do not match the pool.');
  if (inputToken && (identity(q.inputToken) !== identity(inputToken) || q.inputRaw !== rawAmount(amount, inputToken, false, allowedTokens).toString())) throw new Error('Amount or token changed. Refresh the quote.');
}
export function reviewActions(q, now = Date.now(), allowedTokens = TOKENS) {
  assertReview(q, { actor: q.actor, poolId: q.poolId, kind: q.kind, slippageBps: q.slippageBps }, now, allowedTokens);
  const deadline = Math.floor(q.expiresAt / 1000);
  const action = (account, name, data) => ({ account, name, data });
  const transfer = (token, raw, memo) => action(token.contract, 'transfer', { from: q.actor, to: SWAP_CONTRACT, quantity: asset(raw, token), memo });
  if (q.kind === 'swap') {
    const output = requireToken(q.outputToken);
    const min = minimumRaw(q.outputRaw, q.slippageBps);
    if (min <= 0n || BigInt(q.inputRaw) <= 0n) throw new Error('Amount is too small to swap safely.');
    return [transfer(requireToken(q.inputToken), q.inputRaw, `swapexactin#${q.poolId}#${q.actor}#${asset(min, output)}@${output.contract}#${deadline}`)];
  }
  const common = { poolId: String(q.poolId), owner: q.actor, tickLower: q.tickLower, tickUpper: q.tickUpper };
  if (q.kind === 'add') {
    if (BigInt(q.rawA) + BigInt(q.rawB) <= 0n || [[q.rawA, q.minA], [q.rawB, q.minB]].some(([raw, min]) => BigInt(raw) < 0n || BigInt(min) < 0n || BigInt(min) > BigInt(raw) || (BigInt(raw) > 0n && BigInt(min) === 0n))) throw new Error('Increase the deposit to protect token minimums.');
    return [...(BigInt(q.rawA) > 0n ? [transfer(q.tokenA, q.rawA, 'deposit')] : []), ...(BigInt(q.rawB) > 0n ? [transfer(q.tokenB, q.rawB, 'deposit')] : []), action(SWAP_CONTRACT, 'addliquid', {
      ...common, tokenADesired: asset(q.rawA, q.tokenA), tokenBDesired: asset(q.rawB, q.tokenB), tokenAMin: asset(q.minA, q.tokenA), tokenBMin: asset(q.minB, q.tokenB), deadline,
    })];
  }
  const collect = action(SWAP_CONTRACT, 'collect', { ...common, recipient: q.actor, tokenAMax: asset(MAX_ASSET, q.tokenA), tokenBMax: asset(MAX_ASSET, q.tokenB) });
  if (q.kind === 'collect') return [collect];
  if (q.kind !== 'remove' || BigInt(q.selectedLiquidity) <= 0n) throw new Error('Choose a nonzero liquidity amount.');
  return [action(SWAP_CONTRACT, 'subliquid', { ...common, liquidity: q.selectedLiquidity, tokenAMin: asset(q.minA, q.tokenA), tokenBMin: asset(q.minB, q.tokenB), deadline }), collect];
}
