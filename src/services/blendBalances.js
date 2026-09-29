/* global BigInt */
import { postWaxRpc } from './waxRpcRead';

export const tokenKey = input => `${input.token_contract}:${input.symbol}:${input.precision}`;

export function tokenRequirements(recipes) {
  const grouped = new Map();
  for (const recipe of recipes) for (const input of recipe.token_inputs || []) {
    const key = tokenKey(input);
    const previous = grouped.get(key);
    grouped.set(key, {...input, amount: String(BigInt(previous?.amount || 0) + BigInt(input.amount || 0))});
  }
  return [...grouped.values()];
}

export function formatTokenUnits(units, precision) {
  const digits = String(units).padStart(Number(precision) + 1, '0');
  const whole = precision ? digits.slice(0, -Number(precision)) : digits;
  const fraction = precision ? digits.slice(-Number(precision)).replace(/0+$/, '') : '';
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? `.${fraction}` : ''}`;
}

export async function fetchBlendBalances(wallet, recipes) {
  const entries = await Promise.all(tokenRequirements(recipes).map(async input => {
    const key = tokenKey(input);
    try {
      if (!input.token_found || !input.token_contract || !input.symbol) throw new Error('Unknown token');
      const rows = await postWaxRpc('/v1/chain/get_currency_balance', {account:wallet, code:input.token_contract, symbol:input.symbol});
      const asset = rows.find(row => row.split(' ')[1] === input.symbol);
      const [whole, fraction = ''] = (asset?.split(' ')[0] || '0').split('.');
      if (fraction.length > Number(input.precision)) throw new Error('Token precision mismatch');
      const units = BigInt(whole + fraction.padEnd(Number(input.precision), '0'));
      return [key, units.toString()];
    } catch { return [key, null]; }
  }));
  return Object.fromEntries(entries);
}

export function blendTokenStatus(recipe, balances) {
  const inputs = tokenRequirements([recipe]).map(input => {
    const owned = balances[tokenKey(input)];
    const known = owned != null;
    const missing = known ? (BigInt(input.amount) > BigInt(owned) ? BigInt(input.amount) - BigInt(owned) : BigInt(0)).toString() : null;
    return {...input, owned, missing, known};
  });
  return {inputs, ready:inputs.every(input => input.known && input.missing === '0')};
}
