const RPC_URL = (process.env.REACT_APP_READ_RPC || process.env.REACT_APP_RPC || 'https://wax.greymass.com').replace(/\/+$/, '');
const CONTRACT = process.env.REACT_APP_CONTRACT_NAME || 'cleanupcentr';

// Aggregate counters are independent of the limited/prunable burn history.
export async function fetchBurnTotal(account, signal) {
  const personal = Boolean(account);
  const response = await fetch(`${RPC_URL}/v1/chain/get_table_rows`, {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, signal,
    body: JSON.stringify({
      json: true, code: CONTRACT, scope: CONTRACT,
      table: personal ? 'userburntot' : 'gblburntot',
      lower_bound: personal ? account : '0', upper_bound: personal ? account : '0',
      ...(personal ? { key_type: 'name', index_position: 1 } : {}), limit: 1,
    }),
  });
  if (!response.ok) throw new Error('Burn totals unavailable');
  const data = await response.json();
  if (!Array.isArray(data.rows)) throw new Error('Invalid burn totals response');
  const row = data.rows[0];
  if (!row && personal) return '0';
  if (!row || (personal ? String(row.user) !== account : String(row.id) !== '0')) throw new Error('Burn counter unavailable');
  const count = String(row.burns);
  if (!/^\d+$/.test(count) || (typeof row.burns === 'number' && !Number.isSafeInteger(row.burns))) throw new Error('Invalid burn count');
  return count;
}
export const formatBurnTotal = count => count.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function normalizeBurnCount(value) {
  const text = String(value);
  if (!/^\d+$/.test(text) || (typeof value === 'number' && !Number.isSafeInteger(value))) {
    throw new Error('Invalid burn count');
  }
  return text.replace(/^0+(?=\d)/, '');
}

// Compare decimal strings to preserve uint64 precision without browser BigInt support.
function compareCounts(a, b) {
  return b.length - a.length || (a === b ? 0 : a > b ? -1 : 1);
}

export async function fetchBurnLeaders(signal) {
  const accounts = new Map();
  const cursors = new Set();
  let cursor = '';
  for (let page = 0; page < 100; page += 1) {
    const response = await fetch(`${RPC_URL}/v1/chain/get_table_rows`, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, signal,
      body: JSON.stringify({
        json: true, code: CONTRACT, scope: CONTRACT, table: 'userburntot',
        limit: 1000, ...(cursor ? { lower_bound: cursor } : {}),
      }),
    });
    if (!response.ok) throw new Error('Burn leaderboard unavailable');
    const data = await response.json();
    if (!Array.isArray(data.rows) || typeof data.more !== 'boolean') throw new Error('Invalid leaderboard response');
    for (const row of data.rows) {
      if (!row || typeof row.user !== 'string' || !/^[a-z1-5.]{1,13}$/.test(row.user)) throw new Error('Invalid burner account');
      accounts.set(row.user, { account: row.user, burns: normalizeBurnCount(row.burns) });
    }
    if (!data.more) {
      const ranked = [...accounts.values()].filter(row => row.burns !== '0');
      ranked.sort((a, b) => compareCounts(a.burns, b.burns) || (a.account < b.account ? -1 : a.account > b.account ? 1 : 0));
      return { leaders: ranked.slice(0, 25), totalAccounts: ranked.length };
    }
    // Never show a partial table as a completed top-25 ranking.
    const next = String(data.next_key ?? '');
    if (!data.rows.length || !next || cursors.has(next)) throw new Error('Incomplete leaderboard pagination');
    cursors.add(next);
    cursor = next;
  }
  throw new Error('Leaderboard pagination limit reached');
}
