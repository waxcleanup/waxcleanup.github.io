// src/services/repairStatusApi.js
const RPC_URL = 'https://wax.greymass.com';
const CONTRACT = 'cleanupcentr';
const REPAIR_TABLE = 'repairtrack';

export async function getRepairStatus(incineratorId) {
  const id = String(incineratorId || '').trim();
  if (!id) return null;

  let res;
  try {
    res = await fetch(`${RPC_URL}/v1/chain/get_table_rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({
        json: true,
        code: CONTRACT,
        scope: CONTRACT,
        table: REPAIR_TABLE,
        lower_bound: id,
        upper_bound: id,
        limit: 1,
      }),
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let json = null;
  try {
    json = await res.json();
  } catch {
    return null;
  }


  const row = Array.isArray(json?.rows) ? json.rows[0] : null;

  if (!row || String(row.incinerator_id) !== id) return null;
  if (!row.repair_time || !row.repair_points) return null;

  return row;
}