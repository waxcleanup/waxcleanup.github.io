import {readSwapHistory,chartCandles} from './exchangeHistory';
test('loads past the first page with fixed bounds and removes duplicate swaps',async()=>{
 const now=Date.now();const row=i=>({_id:String(i),time:new Date(now-i*1000).toISOString(),sqrtPriceX64:String(2**64),trx_id:'a'.repeat(64)});
 const read=jest.fn().mockResolvedValueOnce(Array.from({length:500},(_,i)=>row(i))).mockResolvedValueOnce([row(499),row(500)]);
 const result=await readSwapHistory(read,'314','24h',now);
 expect(result).toHaveLength(501);expect(result.partial).toBe(false);
 expect(read.mock.calls[1][0]).toContain('skip=500');expect(result[0].timestamp).toBe(now-500000);
});
test('repeated pages are reported as incomplete rather than a full range',async()=>{
 const now=Date.now();const rows=Array.from({length:500},(_,i)=>({_id:String(i),time:new Date(now-i*1000).toISOString(),sqrtPriceX64:String(2**64)}));
 const read=jest.fn().mockResolvedValue(rows);const result=await readSwapHistory(read,'314','1h',now);
 expect(result.partial).toBe(true);expect(read).toHaveBeenCalledTimes(2);
});
test('candles aggregate OHLC in the selected pair direction without filling gaps',()=>{
 const a={symbol:'WAX',contract:'eosio.token',precision:8},b={symbol:'WAXUSDC',contract:'eth.token',precision:6};
 const points=[{timestamp:1000,sqrt:2},{timestamp:2000,sqrt:3},{timestamp:121000,sqrt:1}];
 expect(chartCandles(points,{tokenA:a,tokenB:b},a,'1h')).toEqual([{time:0,open:400,high:900,low:400,close:900},{time:120,open:100,high:100,low:100,close:100}]);
 const inverse=chartCandles(points,{tokenA:a,tokenB:b},b,'1h');
 expect(inverse[0].high).toBe(1/400);expect(inverse[0].low).toBe(1/900);
});

test('30-day history keeps its exact bounds and uses four-hour candles', async () => {
 const now=Date.UTC(2026,8,29), start=now-30*86400000;
 const row=(timestamp,id)=>({_id:id,time:new Date(timestamp).toISOString(),sqrtPriceX64:String(2**64)});
 const read=jest.fn().mockResolvedValue([row(start-1,'old'),row(start,'first'),row(now,'last'),row(now+1,'future')]);
 const result=await readSwapHistory(read,'314','30d',now);
 expect(read.mock.calls[0][0]).toContain(`from=${start}&to=${now}`);
 expect(result.map(point=>point._id)).toEqual(['first','last']);
 expect(result.partial).toBe(false);
 const token={symbol:'WAX',contract:'eosio.token',precision:8};
 const bars=chartCandles([{timestamp:0,sqrt:1},{timestamp:14399000,sqrt:2},{timestamp:14400000,sqrt:3}],{tokenA:token,tokenB:token},token,'30d');
 expect(bars).toEqual([{time:0,open:1,high:4,low:1,close:4},{time:14400,open:9,high:9,low:9,close:9}]);
});