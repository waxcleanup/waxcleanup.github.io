/* global BigInt */
// Read the payout from the accepted burn transaction, never from balance deltas.
export function extractBurnReward(traces, owner) {
  let total = BigInt(0);
  let found = false;
  const seen = new Set();
  function visit(entry) {
    const trace = entry?.action_trace || entry;
    const act = trace?.act;
    const data = act?.data;
    const receiver = trace?.receipt?.receiver || trace?.receiver;
    if (act?.account === 'cleanuptoken' && act?.name === 'transfer' &&
        data?.from === 'cleanupcentr' && data?.to === owner &&
        ['Reward for burning NFT', 'Bulk burn reward'].includes(data?.memo) &&
        (!receiver || receiver === act.account)) {
      const match = /^(\d+)\.(\d{6}) CINDER$/.exec(data.quantity || '');
      const sequence = trace.global_sequence ?? trace.receipt?.global_sequence ?? trace.action_ordinal;
      const key = sequence == null ? null : String(sequence);
      if (match && (key === null || !seen.has(key))) {
        if (key !== null) seen.add(key);
        total += BigInt(match[1]) * BigInt(1000000) + BigInt(match[2]);
        found = true;
      }
    }
    (trace?.inline_traces || []).forEach(visit);
  }
  (traces || []).forEach(visit);
  if (!found) return null;
  return `${total / BigInt(1000000)}.${String(total % BigInt(1000000)).padStart(6, '0')}`;
}

export async function fetchBurnReward(transactionId, owner, signal) {
  if (!/^[a-f0-9]{64}$/i.test(transactionId || '')) return null;
  const response = await fetch(`https://wax.eosusa.io/v2/history/get_transaction?id=${transactionId}`, {signal});
  if (!response.ok) throw new Error('Reward history unavailable');
  const data = await response.json();
  if (data.trx_id !== transactionId || data.executed !== true) return null;
  return extractBurnReward((data.actions || []).filter(action => !action.trx_id || action.trx_id === transactionId), owner);
}