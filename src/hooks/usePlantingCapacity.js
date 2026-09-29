import { useCallback, useEffect, useRef, useState } from 'react';
import { postWaxRpc } from '../services/waxRpcRead';
import { plantingCapacity } from '../utils/plantingCapacity';
const code = process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';
async function read(table, key, extra = {}) {
  const result = await postWaxRpc('/v1/chain/get_table_rows', {
    json: true, code, scope: code, table, lower_bound: String(key), upper_bound: String(key), limit: 100, ...extra,
  });
  if (result.more) throw new Error('Planting inventory is incomplete.');
  return result.rows || [];
}
export default function usePlantingCapacity({ wallet, farmId, batch, refreshNonce, pending }) {
  const [snapshot, setSnapshot] = useState(null);
  const key = `${wallet}:${farmId}:${batch?.seed_asset_id}:${batch?.qty}`;
  const current = useRef(key); current.current = key;
  const batchId = batch?.seed_asset_id, templateId = batch?.seed_tpl_id;
  const refresh = useCallback(async () => {
    if (!wallet || farmId == null) return 0;
    try {
      const [seeds, compost, user, farm, ratio, meta] = await Promise.all([
        read('seedinv', wallet, { index_position: 2, key_type: 'name' }),
        read('ucomposts', wallet, { key_type: 'name' }), read('userenergy', wallet, { key_type: 'name' }),
        read('farmenergy', farmId), read('energyratio', 0), templateId == null ? Promise.resolve([]) : read('seedmeta', templateId),
      ]);
      const seed = seeds.find(s => String(s.seed_asset_id) === String(batchId) && String(s.seed_tpl_id) === String(templateId));
      const capacity = plantingCapacity({ seeds: seed?.qty || 0, compost: compost[0]?.balance || 0,
        userEnergy: user[0]?.energy || 0, farmEnergy: farm[0]?.energy || 0, ratio: ratio[0], validSeed: Number(meta[0]?.water_ticks) > 0 });
      const missing = [];
      if (!Number(seed?.qty)) missing.push('seeds');
      if (Number(compost[0]?.balance || 0) < 1) missing.push('compost');
      const energyCost = percent => Number(percent) > 0 ? Math.max(1, Math.floor(2 * Number(percent) / 100)) : 0;
      if (ratio[0]) {
        if (Number(user[0]?.energy || 0) < energyCost(ratio[0].user_ratio)) missing.push('player energy');
        if (Number(farm[0]?.energy || 0) < energyCost(ratio[0].farm_ratio)) missing.push('farm energy');
      }
      const message = missing.length ? `Needs ${missing.join(', ')}` : !capacity ? 'Planting configuration unavailable' : 'Ready to plant';
      if (current.current === key) setSnapshot({ key, capacity, message });
      return current.current === key ? capacity : 0;
    } catch {
      if (current.current === key) setSnapshot({ key, capacity: 0, message: 'Unable to check ingredients' });
      return 0;
    }
  }, [wallet, farmId, batchId, templateId, key]);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 30000); return () => clearInterval(timer); }, [refresh, refreshNonce, pending]);
  return { capacity: snapshot?.key === key ? snapshot.capacity : 0, message: !wallet ? 'Connect wallet to check ingredients' : snapshot?.key === key ? snapshot.message : 'Checking ingredients…', refresh };
}
