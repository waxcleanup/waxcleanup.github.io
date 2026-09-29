export async function readSwapHistory(read, poolId, range, now = Date.now()) {
  const duration = {'1h':3600000,'24h':86400000,'7d':604800000,'30d':2592000000}[range];
  if (!duration || !/^\d+$/.test(String(poolId))) throw new Error('Invalid history request.');
  const found = new Map();
  let complete = false;
  for (let page=0; page<20; page+=1) {
    const rows = await read(`/swap/pools/${poolId}/swaps?from=${now-duration}&to=${now}&limit=500&skip=${page*500}`);
    if (!Array.isArray(rows)) throw new Error('Invalid price history.');
    const before = found.size;
    rows.forEach(row=>{
      const timestamp = Date.parse(row.time);
      const sqrt = Number(row.sqrtPriceX64) / (2 ** 64);
      if (Number.isFinite(timestamp) && timestamp >= now-duration && timestamp <= now && sqrt > 0 && Number.isFinite(sqrt)) {
        found.set(row._id || `${row.trx_id}:${timestamp}:${row.sqrtPriceX64}`, {...row,timestamp,sqrt});
      }
    });
    if (rows.length < 500) {complete=true;break;}
    if (found.size === before) break;
  }
  const result = [...found.values()].sort((a,b)=>a.timestamp-b.timestamp);
  result.partial = !complete;
  return result;
}

export function chartCandles(points, pool, input, range) {
  if (!pool) return [];
  const step = {'1h':60,'24h':900,'7d':3600,'30d':14400}[range] || 3600;
  const forward = input.symbol === pool.tokenA.symbol && input.contract === pool.tokenA.contract;
  const bars = new Map();
  [...points].sort((a,b)=>a.timestamp-b.timestamp).forEach(point=>{
    const ratio = point.sqrt ** 2 * 10 ** (pool.tokenA.precision-pool.tokenB.precision);
    const price = forward ? ratio : 1 / ratio;
    if (!Number.isFinite(price) || price <= 0) return;
    const time = Math.floor(point.timestamp/1000/step)*step;
    const bar = bars.get(time);
    if (bar) {bar.high=Math.max(bar.high,price);bar.low=Math.min(bar.low,price);bar.close=price;}
    else bars.set(time,{time,open:price,high:price,low:price,close:price});
  });
  return [...bars.values()];
}
