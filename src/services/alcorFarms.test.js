import {reviewFarmClaim,executeFarmClaim,reviewAllFarmClaims,executeAllFarmClaims,reviewFarmUnstake,executeFarmUnstake} from './alcorMainnet';
import {InitTransaction} from '../hooks/useSession';
import {buildContractAction} from './contractKit';
import {getHealthyWaxMainnetEndpoint} from './waxMainnetEndpoints';
jest.mock('./waxMainnetEndpoints',()=>({WAX_MAINNET_ENDPOINTS:['https://primary.test','https://backup.test'],getHealthyWaxMainnetEndpoint:jest.fn(async()=> 'https://node.test'),invalidateWaxMainnetEndpoint:jest.fn()}));
jest.mock('./contractKit',()=>({buildContractAction:jest.fn(async(account,name,data)=>({account,name,data}))}));
jest.mock('../hooks/useSession',()=>({InitTransaction:jest.fn(async()=>({transaction_id:'a'.repeat(64)}))}));
let owner,rewards;
beforeEach(()=>{jest.clearAllMocks();getHealthyWaxMainnetEndpoint.mockImplementation(async({exclude=[]}={})=>exclude.includes('https://primary.test')?'https://backup.test':'https://primary.test');buildContractAction.mockImplementation(async(account,name,data)=>({account,name,data}));InitTransaction.mockResolvedValue({transaction_id:'a'.repeat(64)});owner='alice';rewards='100';global.fetch=jest.fn(async(url,options)=>{const body=JSON.parse(options.body);const rows=body.table==='positions'?[{id:'2',owner}]:body.table==='incentives'?[{id:body.lower_bound,poolId:'1',reward:{quantity:'1.000000 CINDER',contract:'cleanuptoken'},totalStakingWeight:'0',lastUpdateTime:100,periodFinish:200,rewardRateE18:'0',rewardPerTokenStored:'0'}]:[{posId:'2',stakingWeight:'0',rewards,userRewardPerTokenPaid:'0'}];return {ok:true,text:async()=>JSON.stringify({rows})};});});
afterEach(()=>{delete global.fetch;});
test('review does not submit; confirmation builds only the verified getreward action',async()=>{const r=await reviewFarmClaim('alice',{poolId:'1',posId:'2',incentiveId:'3'});expect(InitTransaction).not.toHaveBeenCalled();await executeFarmClaim(r,'alice');expect(buildContractAction).toHaveBeenCalledWith('swap.alcor','getreward',{incentiveId:'3',posId:'2'});expect(InitTransaction).toHaveBeenCalledWith(expect.objectContaining({expectedActor:'alice',actions:[{account:'swap.alcor',name:'getreward',data:{incentiveId:'3',posId:'2'}}]}));});
test('rechecks ownership and newly claimed rewards before submission',async()=>{const r=await reviewFarmClaim('alice',{poolId:'1',posId:'2',incentiveId:'3'});owner='bob';await expect(executeFarmClaim(r,'alice')).rejects.toThrow('wallet');owner='alice';rewards='0';await expect(executeFarmClaim(r,'alice')).rejects.toThrow('already');expect(InitTransaction).not.toHaveBeenCalled();});
jest.mock('./exchangeQuotes',()=>({}));
test('claim all deduplicates and submits exactly one transaction containing both rewards',async()=>{
 const a={poolId:'1',posId:'2',incentiveId:'3'},b={...a,incentiveId:'4'};
 const review=await reviewAllFarmClaims('alice',[a,b,a]);expect(review.claims).toHaveLength(2);expect(InitTransaction).not.toHaveBeenCalled();
 await executeAllFarmClaims(review,'alice');expect(InitTransaction).toHaveBeenCalledTimes(1);expect(InitTransaction.mock.calls[0][0].actions.map(a=>a.data.incentiveId)).toEqual(['3','4']);
});
test('claim all blocks changed wallet, duplicate actions and claimed rewards before signing',async()=>{
 const review=await reviewAllFarmClaims('alice',[{poolId:'1',posId:'2',incentiveId:'3'}]);
 await expect(executeAllFarmClaims(review,'bob')).rejects.toThrow();
 await expect(executeAllFarmClaims({...review,claims:[...review.claims,...review.claims]},'alice')).rejects.toThrow();
 rewards='0';await expect(executeAllFarmClaims(review,'alice')).rejects.toThrow('already');expect(InitTransaction).not.toHaveBeenCalled();
});test('claim preparation moves to a different node after a network error',async()=>{
 const healthyFetch=global.fetch;
 global.fetch=jest.fn((url,options)=>url.startsWith('https://primary.test')?Promise.reject(new TypeError('Failed to fetch')):healthyFetch(url,options));
 const review=await reviewAllFarmClaims('alice',[{poolId:'1',posId:'2',incentiveId:'3'},{poolId:'1',posId:'2',incentiveId:'4'}]);
 expect(review.claims).toHaveLength(2);
 expect(getHealthyWaxMainnetEndpoint).toHaveBeenCalledWith({exclude:['https://primary.test']});
 expect(global.fetch.mock.calls.some(([url])=>url.startsWith('https://backup.test'))).toBe(true);
 expect(InitTransaction).not.toHaveBeenCalled();
});
test('when every node fails, reports unavailable data without signing or a partial claim',async()=>{
 global.fetch=jest.fn(async()=>{throw new TypeError('Failed to fetch');});
 await expect(reviewAllFarmClaims('alice',[{poolId:'1',posId:'2',incentiveId:'3'}])).rejects.toThrow('trying 2 nodes');
 expect(InitTransaction).not.toHaveBeenCalled();
});
test('unstake with zero rewards targets only one farm, never the entire position',async()=>{
 rewards='0';
 const review=await reviewFarmUnstake('alice',{poolId:'1',posId:'2',incentiveId:'3'});
 expect(InitTransaction).not.toHaveBeenCalled();
 await executeFarmUnstake(review,'alice');
 expect(InitTransaction).toHaveBeenCalledWith(expect.objectContaining({expectedActor:'alice',validUntil:review.expiresAt,actions:[{account:'swap.alcor',name:'unstake',data:{incentiveId:'3',posId:'2'}}]}));
});
test('unstake rechecks owner and rejects expired reviews',async()=>{
 const review=await reviewFarmUnstake('alice',{poolId:'1',posId:'2',incentiveId:'3'});
 owner='bob';await expect(executeFarmUnstake(review,'alice')).rejects.toThrow('wallet');
 owner='alice';await expect(executeFarmUnstake({...review,expiresAt:0},'alice')).rejects.toThrow();
 expect(InitTransaction).not.toHaveBeenCalled();
});