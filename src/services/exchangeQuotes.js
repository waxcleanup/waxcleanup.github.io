/* global BigInt */
// Import the browser math modules directly; the SDK barrel also exports a Node/WASM router.
import { Token } from '@alcorexchange/alcor-swap-sdk/build/esm/entities/token';
import { Pool } from '@alcorexchange/alcor-swap-sdk/build/esm/entities/pool';
import { Position } from '@alcorexchange/alcor-swap-sdk/build/esm/entities/position';
import { CurrencyAmount } from '@alcorexchange/alcor-swap-sdk/build/esm/entities/fractions/currencyAmount';
import { Percent } from '@alcorexchange/alcor-swap-sdk/build/esm/entities/fractions/percent';
import { assertPool, identity, rawAmount, fullRangeTicks, checkSlippage, minimumRaw } from './exchangeMath';

export function sdkPool(row, ticks, allowedTokens) {
  const [a, b] = assertPool(row, row.id, allowedTokens);
  return new Pool({ ...row, tokenA: new Token(a.contract, a.precision, a.symbol), tokenB: new Token(b.contract, b.precision, b.symbol),
    sqrtPriceX64: row.currSlot.sqrtPriceX64, tickCurrent: Number(row.currSlot.tick),
    ticks: [...ticks].sort((x, y) => Number(x.id) - Number(y.id)),
  });
}
function position(pool, row, liquidity = row.liquidity) {
  return new Position({ ...row, pool, liquidity, feeGrowthInsideALastX64: row.feeGrowthInsideALastX64 || '0',
    feeGrowthInsideBLastX64: row.feeGrowthInsideBLastX64 || '0', feesA: row.feesA || '0', feesB: row.feesB || '0' });
}
export function quoteTrade({ row, ticks, kind, actor, inputToken, amount, slippageBps, now = Date.now(), allowedTokens, positionRange }) {
  const [tokenA, tokenB] = assertPool(row, row.id, allowedTokens);
  checkSlippage(slippageBps);
  if (![identity(tokenA), identity(tokenB)].includes(identity(inputToken))) throw new Error('Input token does not belong to this pool.');
  const inputRaw = rawAmount(amount, inputToken, false, allowedTokens);
  const pool = sdkPool(row, ticks, allowedTokens);
  const isA = identity(inputToken) === identity(tokenA);
  const base = { network: 'wax-mainnet', kind, actor, poolId: String(row.id), tokenA, tokenB, inputToken, inputRaw: inputRaw.toString(),
    slippageBps, createdAt: now, expiresAt: now + 30000, fee: row.fee };
  if (kind === 'swap') {
    if (BigInt(row.liquidity) <= 0n) throw new Error('This pool has no active liquidity.');
    const input = CurrencyAmount.fromRawAmount(isA ? pool.tokenA : pool.tokenB, inputRaw);
    const mid = pool.priceOf(input.currency).quote(input);
    const output = pool.getOutputAmount(input).quotient;
    if (minimumRaw(output, slippageBps) <= 0n) throw new Error('Amount is too small to swap safely.');
    return { ...base, outputToken: isA ? tokenB : tokenA, outputRaw: output.toString(), minimum: minimumRaw(output, slippageBps).toString(),
      impactBps: mid.numerator > 0n ? Math.max(0, Number((mid.numerator - output * mid.denominator) * 10000n / mid.numerator)) : 0 };
  }
  if (kind !== 'add') throw new Error('Unknown quote type.');
  const params = { pool, id: 0, owner: actor, ...(positionRange || fullRangeTicks(row.tickSpacing)), useFullPrecision: true,
    feeGrowthInsideALastX64: '0', feeGrowthInsideBLastX64: '0', feesA: '0', feesB: '0' };
  const p = isA ? Position.fromAmountA({ ...params, amountA: inputRaw }) : Position.fromAmountB({ ...params, amountB: inputRaw });
  const amounts = p.mintAmounts;
  const mins = p.mintAmountsWithSlippage(new Percent(slippageBps, 10000));
  if (p.liquidity <= 0n || amounts.amountA + amounts.amountB <= 0n || (amounts.amountA > 0n && mins.amountA <= 0n) || (amounts.amountB > 0n && mins.amountB <= 0n)) throw new Error('Deposit is too small or this range needs the other token.');
  if ((isA ? amounts.amountA : amounts.amountB) > inputRaw) throw new Error('Deposit rounding exceeded your input. Refresh the quote.');
  return { ...base, ...(positionRange || fullRangeTicks(row.tickSpacing)), rawA: amounts.amountA.toString(), rawB: amounts.amountB.toString(), minA: mins.amountA.toString(), minB: mins.amountB.toString() };
}
export async function describePosition(row, pool) {
  const p = position(pool, row);
  // Closed positions may no longer have initialized ticks; only their stored fees remain.
  const fees = BigInt(row.liquidity) === 0n ? { feesA: { quotient: BigInt(row.feesA || 0) }, feesB: { quotient: BigInt(row.feesB || 0) } } : await p.getFees();
  return { ...row, liquidity: String(row.liquidity), rawA: p.amountA.quotient.toString(), rawB: p.amountB.quotient.toString(),
    feesA: fees.feesA.quotient.toString(), feesB: fees.feesB.quotient.toString(), inRange: pool.tickCurrent >= row.tickLower && pool.tickCurrent < row.tickUpper };
}
export async function quotePosition({ row, ticks, positionRow, actor, kind, percent, slippageBps, now = Date.now(), allowedTokens }) {
  const [tokenA, tokenB] = assertPool(row, row.id, allowedTokens);
  if (positionRow.owner !== actor) throw new Error('Position belongs to another wallet.');
  checkSlippage(slippageBps);
  if (!['remove', 'collect'].includes(kind)) throw new Error('Unknown position action.');
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) throw new Error('Choose 1–100% of your position.');
  const pool = sdkPool(row, ticks, allowedTokens);
  const full = await describePosition(positionRow, pool);
  const selectedLiquidity = BigInt(positionRow.liquidity) * BigInt(percent) / 100n;
  const base = { network: 'wax-mainnet', kind, actor, poolId: String(row.id), tokenA, tokenB, slippageBps,
    createdAt: now, expiresAt: now + 30000, positionId: String(positionRow.id), tickLower: positionRow.tickLower,
    tickUpper: positionRow.tickUpper, feesA: full.feesA, feesB: full.feesB, percent };
  if (kind === 'collect') return base;
  if (selectedLiquidity <= 0n) throw new Error('The selected withdrawal rounds to zero.');
  const p = position(pool, positionRow, selectedLiquidity);
  const mins = p.burnAmountsWithSlippage(new Percent(slippageBps, 10000));
  return { ...base, selectedLiquidity: selectedLiquidity.toString(), rawA: p.amountA.quotient.toString(), rawB: p.amountB.quotient.toString(),
    minA: mins.amountA.quotient.toString(), minB: mins.amountB.quotient.toString() };
}
