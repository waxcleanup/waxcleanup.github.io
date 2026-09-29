/* global BigInt */
import {formatRaw} from './exchangeMath';
const uint=value=>{if(!/^\d+$/.test(String(value)))throw new Error('Invalid farm reward data.');return BigInt(value);};
export function farmReward(incentive,stake,now=Math.floor(Date.now()/1000)) {
 const match=/^\d+(?:\.(\d+))? ([A-Z]{1,7})$/.exec(incentive.reward?.quantity||'');
 if(!match || !/^[a-z1-5.]{1,13}$/.test(incentive.reward.contract))throw new Error('Invalid reward token.');
 const token={symbol:match[2],precision:(match[1]||'').length,contract:incentive.reward.contract};
 const total=uint(incentive.totalStakingWeight),last=uint(incentive.lastUpdateTime),end=uint(incentive.periodFinish);
 const time=BigInt(Math.floor(now)); const applicable=time<end?time:end;
 let perToken=uint(incentive.rewardPerTokenStored);
 if(total>0n && applicable>last)perToken+=(applicable-last)*uint(incentive.rewardRateE18)/total;
 const paid=uint(stake.userRewardPerTokenPaid);
 if(perToken<paid)throw new Error('Farm data changed. Refresh to retry.');
 const raw=uint(stake.rewards)+uint(stake.stakingWeight)*(perToken-paid)/1000000000000000000n;
 return {token,raw:raw.toString(),amount:formatRaw(raw,token),ended:time>=end};
}
export function assertFarmReview(review,actor,now=Date.now()) {
 if(!review || review.actor!==actor || !/^[a-z1-5.]{1,12}$/.test(actor))throw new Error('Wallet changed. Review this claim again.');
 if(!Number.isFinite(review.expiresAt)||now>=review.expiresAt||review.expiresAt-now>30000)throw new Error('Claim review expired. Review again.');
 for(const key of ['poolId','posId','incentiveId'])uint(review[key]);
}
export function totalFarmRewards(claims) {
 const totals=new Map();
 for(const claim of claims){const key=`${claim.token.symbol}@${claim.token.contract}:${claim.token.precision}`;const prior=totals.get(key);totals.set(key,{token:claim.token,raw:(prior?.raw||0n)+uint(claim.raw)});}
 return [...totals.values()].map(t=>({...t,raw:t.raw.toString(),amount:formatRaw(t.raw,t.token)}));
}