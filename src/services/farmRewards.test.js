import {farmReward,assertFarmReview,totalFarmRewards} from './farmRewards';
const incentive={reward:{quantity:'1.000000 CINDER',contract:'cleanuptoken'},totalStakingWeight:'100',lastUpdateTime:100,periodFinish:200,rewardRateE18:'1000000000000000000',rewardPerTokenStored:'0'};
const stake={stakingWeight:'50',rewards:'7',userRewardPerTokenPaid:'0'};
test('calculates rewards with integer precision and stops accrual at farm end',()=>{expect(farmReward(incentive,stake,110).raw).toBe('12');expect(farmReward(incentive,stake,300).raw).toBe('57');});
test('preserves accumulated rewards with no staking weight and clamps future timestamps',()=>{expect(farmReward({...incentive,totalStakingWeight:'0'},stake,150).raw).toBe('7');expect(farmReward(incentive,stake,90).raw).toBe('7');});
test('rejects inconsistent reward snapshots and wallet or expiry changes',()=>{expect(()=>farmReward(incentive,{...stake,userRewardPerTokenPaid:'100000000000000000000'},110)).toThrow();const r={actor:'alice',poolId:'1',posId:'2',incentiveId:'3',expiresAt:30000};expect(()=>assertFarmReview(r,'alice',1000)).not.toThrow();expect(()=>assertFarmReview(r,'bob',1000)).toThrow('Wallet');expect(()=>assertFarmReview(r,'alice',30000)).toThrow('expired');});test('totals rewards exactly and keeps same-symbol contracts separate',()=>{
 const token={symbol:'WAX',contract:'eosio.token',precision:8};
 const totals=totalFarmRewards([{token,raw:'9007199254740993'},{token,raw:'7'},{token:{...token,contract:'other.token'},raw:'1'}]);
 expect(totals).toHaveLength(2);expect(totals[0].raw).toBe('9007199254741000');expect(totals[1].raw).toBe('1');
});