import { TOKENS, identity } from './exchangeMath';

const id = value => /^\d+$/.test(String(value)) ? String(value) : null;
const assetText = value => /^\d+(?:\.\d+)? [A-Z]{1,7}$/.test(String(value)) ? String(value) : 'Unavailable';
const dollars = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
function token(value) {
  if (!value || !/^[A-Z]{1,7}$/.test(value.symbol) || !/^[a-z1-5.]{1,13}$/.test(value.contract) || !Number.isInteger(value.decimals)) return null;
  return { symbol: value.symbol, contract: value.contract, precision: value.decimals };
}
// Portfolio data is display-only. Transaction quotes still use verified contract tables.
export function normalizePortfolio(actor, rows, pools) {
  if (!Array.isArray(rows) || !Array.isArray(pools)) throw new Error('Alcor returned an invalid portfolio response.');
  const index = new Map(pools.map(p => [id(p.id), p]));
  const groups = new Map(); const seen = new Set();
  for (const row of rows) {
    if (row.owner !== actor) continue;
    const poolId = id(row.pool); const positionId = id(row.id);
    if (poolId === null || positionId === null) throw new Error('A position is missing its pool or position ID. Refresh your portfolio.');
    const key = `${poolId}:${positionId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!groups.has(poolId)) {
      const pool = index.get(poolId); const tokenA = token(pool?.tokenA); const tokenB = token(pool?.tokenB);
      const supported = tokenA && tokenB && [tokenA, tokenB].every(t => TOKENS.some(known => identity(known) === identity(t)));
      groups.set(poolId, { poolId, tokenA, tokenB, fee: Number.isInteger(pool?.fee) ? pool.fee : null,
        manageable: Boolean(supported && pool.active), positions: [] });
    }
    groups.get(poolId).positions.push({ id: positionId, owner: actor, poolId,
      amountA: assetText(row.amountA), amountB: assetText(row.amountB), feesA: assetText(row.feesA), feesB: assetText(row.feesB),
      valueUSD: dollars(row.totalValue), feesUSD: dollars(row.totalFeesUSD), closed: row.closed === true || /^0+$/.test(String(row.liquidity)),
      inRange: typeof row.inRange === 'boolean' ? row.inRange : null, locked: row.isLocked === true,
    });
  }
  return [...groups.values()].sort((a, b) => Number(a.poolId) - Number(b.poolId));
}
