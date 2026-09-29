export const USD_MAX_AGE = 120000;
export const tokenPriceKey = item => `${String(item.token).toLowerCase()}-${item.token_contract}-${item.decimals}`;
export async function fetchShopUsdRate(item) {
  if (!/^[A-Z]{1,7}$/.test(item.token) || !/^[a-z1-5.]{1,12}$/.test(item.token_contract) || !Number.isInteger(Number(item.decimals))) throw new Error('Unknown token');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`https://wax.alcor.exchange/api/v2/tokens/${item.token.toLowerCase()}-${item.token_contract}`, { signal: controller.signal });
    if (!response.ok) throw new Error('USD rate unavailable');
    const data = await response.json();
    const usd = Number(data.usd_price);
    if (data.symbol !== item.token || data.contract !== item.token_contract || Number(data.decimals) !== Number(item.decimals) || !Number.isFinite(usd) || usd <= 0) throw new Error('No matching USD rate');
    return { usd, checkedAt: Date.now() };
  } finally { clearTimeout(timer); }
}
export function estimatedUsd(amount, rate, now = Date.now()) {
  if (!rate || now - rate.checkedAt > USD_MAX_AGE || now < rate.checkedAt || !Number.isFinite(rate.usd) || rate.usd <= 0) return null;
  const value = Number(amount) * rate.usd;
  if (!Number.isFinite(value) || value <= 0) return null;
  return value < 0.01 ? '≈ <$0.01 USD' : `≈ ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)} USD`;
}
