import {TOKENS,minimumRaw} from './exchangeMath';
import {candidateRoutes,assembleRoute,assertRouteReview,routeAction} from './exchangeRoutes';
const [wax,cinder,,, ,usd]=TOKENS;
const now=1800000000000;
const ctx={actor:'testaccount1',poolId:'auto',kind:'swap',inputToken:cinder,outputToken:usd,amount:'1',slippageBps:50};
function hop(id,input,output,inputRaw,outputRaw){
 return {network:'wax-mainnet',actor:ctx.actor,kind:'swap',poolId:id,tokenA:input,tokenB:output,inputToken:input,outputToken:output,inputRaw,outputRaw,minimum:minimumRaw(outputRaw,50).toString(),slippageBps:50,createdAt:now,expiresAt:now+30000,fee:3000,impactBps:30};
}
const make=()=>assembleRoute([hop('1',cinder,wax,'1000000','100000000'),hop('2',wax,usd,'100000000','6000')],ctx,{quoted:1,total:1});
test('enumerates direct and two-pool routes, excludes unfunded and cyclic paths',()=>{
 const pool=(id,a,b,funded=true)=>({id,tokenA:a,tokenB:b,funded});
 expect(candidateRoutes([pool('1',cinder,wax),pool('2',wax,usd),pool('3',cinder,usd),pool('4',cinder,usd,false)],cinder,usd)).toEqual([['1','2'],['3']]);
});
test('one transfer uses the exact verified route, final minimum and expiring deadline',()=>{
 const q=make(); expect(()=>assertRouteReview(q,ctx,now)).not.toThrow();
 expect(routeAction(q,ctx,now)).toEqual({account:'cleanuptoken',name:'transfer',data:{from:ctx.actor,to:'swap.alcor',quantity:'1.000000 CINDER',memo:'swapexactin#1,2#testaccount1#0.005970 WAXUSDC@eth.token#1800000030'}});
});
test.each([
 ['expired',q=>q,{},now+30000],
 ['wallet changed',q=>q,{actor:'otheraccount'},now],
 ['output changed',q=>q,{outputToken:wax},now],
 ['amount changed',q=>q,{amount:'2'},now],
 ['mode changed',q=>q,{poolId:'1'},now],
 ['route tampered',q=>({...q,route:['2','1']}),{},now],
 ['minimum tampered',q=>({...q,minimum:'1'}),{},now],
 ['broken hop amount',q=>({...q,hops:[q.hops[0],{...q.hops[1],inputRaw:'1'}]}),{},now],
 ['wrong output contract',q=>({...q,outputToken:{...usd,contract:'wrong.token'}}),{},now],
])('rejects %s',(_,change,context,time)=>expect(()=>routeAction(change(make()),{...ctx,...context},time)).toThrow());
test('external input is supported only by an explicit exact-token allowlist',()=>{
 const external={symbol:'INDICA',contract:'stonerstoken',precision:8},trash=TOKENS[2],allowed=[...TOKENS,external];
 const params={...ctx,inputToken:external,outputToken:trash,amount:'1'};
 const q=assembleRoute([hop('3',external,trash,'100000000','20000')],params);
 expect(()=>routeAction(q,params,now)).toThrow();
 expect(routeAction(q,params,now,allowed).account).toBe('stonerstoken');
 expect(()=>routeAction(q,{...params,inputToken:{...external,contract:'fake.token'}},now,allowed)).toThrow();
});
