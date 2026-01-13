/**
 * Formats a numeric input into a valid EOSIO asset string.
 *
 * @param {string|number} value - numeric input (no symbol)
 * @param {string} symbol - token symbol (e.g. "TRASH")
 * @param {number} precision - decimals (e.g. 3)
 */
export function toAsset(value, symbol, precision) {
  const n = Number(String(value).replace(/,/g, '').trim());

  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid ${symbol} amount`);
  }

  return `${n.toFixed(precision)} ${symbol}`;
}

