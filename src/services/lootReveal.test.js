import {extractMintedRewards,fetchTransactionRewards,recentOpeningTransactions} from './lootReveal';
import opening from './__fixtures__/reveal/opening-rng.json';
import callbacks from './__fixtures__/reveal/callback-window.json';
import completion from './__fixtures__/reveal/real-callback.json';
const mint=(id='123',owner='tester',minter='rhythmfarmer')=>({act:{account:'atomicassets',name:'logmint',data:{asset_id:id,new_asset_owner:owner,authorized_minter:minter,template_id:10,immutable_template_data:[{key:'name',value:['string','Tomato Seed']},{key:'img',value:['string','cid']}]}}});
test('receipt rewards are immediate, deduplicated, and restricted to this owner and game',()=>{
 const traces=[{inline_traces:[mint(),mint(),mint('124'),mint('125','other'),mint('126','tester','othergame')]}];
 expect(extractMintedRewards(traces,'tester').map(item=>item.asset_id)).toEqual(['123','124']);
 expect(extractMintedRewards(traces,'tester')[0].name).toBe('Tomato Seed');
});
test('history lookup rejects a different transaction and never treats failure as zero rewards',async()=>{
 const id='a'.repeat(64);
 global.fetch=jest.fn().mockResolvedValueOnce({ok:true,json:async()=>({trx_id:'b'.repeat(64),executed:true,actions:[mint()]})}).mockResolvedValueOnce({ok:true,json:async()=>({trx_id:id,executed:true,actions:[mint()]})});
 expect(await fetchTransactionRewards(id,'tester')).toEqual([]);
 expect((await fetchTransactionRewards(id,'tester'))[0].asset_id).toBe('123');
});
test('real Small Eco Crate opening follows RNG callback and recovers all five NFTs',async()=>{
 global.fetch=jest.fn();
 [opening,callbacks,completion].forEach(data=>global.fetch.mockResolvedValueOnce({ok:true,json:async()=>data}));
 const rewards=await fetchTransactionRewards(opening.trx_id,'mmvyu.wam');
 expect(rewards).toHaveLength(5);
 expect(rewards.map(item=>item.asset_id).sort()).toEqual(['1100002537386','1100002537387','1100002537388','1100002537389','1100002537390']);
});

test('recovery identifies the actual opening owner instead of silently polling the connected wallet',async()=>{
 global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>opening});
 await expect(fetchTransactionRewards(opening.trx_id,'maestrobeatz')).rejects.toMatchObject({code:'REVEAL_OWNER_MISMATCH',owner:'mmvyu.wam'});
 expect(global.fetch).toHaveBeenCalledTimes(1);
});
test('reused RNG association cannot reveal another opening with different consumed NFTs',async()=>{
 global.fetch=jest.fn();
 const wrong={...completion,actions:completion.actions.filter(action=>!['burnasset','logburnasset'].includes(action.act.name))};
 [opening,callbacks,wrong].forEach(data=>global.fetch.mockResolvedValueOnce({ok:true,json:async()=>data}));
 expect(await fetchTransactionRewards(opening.trx_id,'mmvyu.wam')).toEqual([]);
});
test('recent history deduplicates blend transfers and excludes unrelated wallet activity',()=>{
 const transfer=opening.actions.find(action=>action.act.name==='transfer');
 const unrelated={...transfer,trx_id:'b'.repeat(64),act:{...transfer.act,data:{...transfer.act.data,memo:'stake:tool'}}};
 const rows=recentOpeningTransactions([...opening.actions,transfer,unrelated],'mmvyu.wam');
 expect(rows).toHaveLength(1);expect(rows[0].transactionId).toBe(opening.trx_id);expect(rows[0].recipeId).toBe('1');
 expect(rows[0].timestamp).toBe(Date.parse('2026-09-28T19:06:12.500Z'));
 expect(recentOpeningTransactions(opening.actions,'anotheruser')).toEqual([]);
});
