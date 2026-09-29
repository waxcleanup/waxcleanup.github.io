/* global BigInt */
import {TOKENS, identity, requireToken, rawAmount, formatRaw, asset, minimumRaw, assertReview, SWAP_CONTRACT} from './exchangeMath';

// Simple, cycle-free paths through the supported game tokens, at most two pools.
export function candidateRoutes(pools, input, output, allowedTokens=TOKENS) {
  requireToken(input,allowedTokens); requireToken(output,allowedTokens);
  if(identity(input)===identity(output)) throw new Error('Choose two different tokens.');
  const paths=[];
  function visit(token, path, seen) {
    for(const pool of pools.filter(p=>p.funded && !path.includes(p.id))) {
      const pair=[pool.tokenA,pool.tokenB];
      if(!pair.some(t=>identity(t)===identity(token))) continue;
      const next=pair.find(t=>identity(t)!==identity(token));
      if(!next || !allowedTokens.some(t=>identity(t)===identity(next)) || seen.has(identity(next))) continue;
      const ids=[...path,String(pool.id)];
      if(identity(next)===identity(output)) paths.push(ids);
      else if(ids.length<2) visit(next,ids,new Set([...seen,identity(next)]));
    }
  }
  visit(input,[],new Set([identity(input)]));
  return paths;
}

export function assembleRoute(hops, params, coverage) {
  const first=hops[0],last=hops[hops.length-1];
  return {...first, poolId:'auto', route:hops.map(h=>String(h.poolId)), hops,
    tokenA:params.inputToken, tokenB:params.outputToken, outputToken:params.outputToken,
    outputRaw:last.outputRaw, minimum:minimumRaw(last.outputRaw,params.slippageBps).toString(),
    impactBps:Math.round(10000*(1-hops.reduce((n,h)=>n*(1-h.impactBps/10000),1))),
    createdAt:Math.min(...hops.map(h=>h.createdAt)), expiresAt:Math.min(...hops.map(h=>h.expiresAt)),
    coverage};
}

export function assertRouteReview(q, context, now=Date.now(), allowedTokens=TOKENS) {
  if(!q || q.kind!=='swap' || q.poolId!=='auto' || !Array.isArray(q.hops) || q.hops.length<1 || q.hops.length>2 || !Array.isArray(q.route) || q.route.length!==q.hops.length || new Set(q.route).size!==q.route.length) throw new Error('Invalid swap route.');
  if(context.kind!=='swap' || context.poolId!=='auto') throw new Error('Routing mode changed. Review again.');
  if(identity(requireToken(q.outputToken,allowedTokens))!==identity(requireToken(context.outputToken,allowedTokens))) throw new Error('Output token changed. Review again.');
  if(q.actor!==context.actor || q.slippageBps!==context.slippageBps || identity(q.inputToken)!==identity(context.inputToken) || q.inputRaw!==rawAmount(context.amount,context.inputToken,false,allowedTokens).toString()) throw new Error('Swap settings changed. Review again.');
  let token=context.inputToken, amount=context.amount;
  const seen=new Set([identity(token)]);
  q.hops.forEach((hop,i)=>{
    if(String(hop.poolId)!==q.route[i] || hop.kind!=='swap') throw new Error('Route pool changed.');
    assertReview(hop,{actor:context.actor,poolId:q.route[i],kind:'swap',inputToken:token,amount,slippageBps:context.slippageBps},now,allowedTokens);
    requireToken(hop.outputToken,allowedTokens);
    if(seen.has(identity(hop.outputToken))) throw new Error('Cyclic route.');
    seen.add(identity(hop.outputToken));
    token=hop.outputToken; amount=formatRaw(hop.outputRaw,token);
  });
  const last=q.hops[q.hops.length-1];
  if(identity(token)!==identity(q.outputToken) || q.outputRaw!==last.outputRaw || q.minimum!==minimumRaw(last.outputRaw,q.slippageBps).toString() || BigInt(q.minimum)<=0n || q.expiresAt!==Math.min(...q.hops.map(h=>h.expiresAt)) || now>=q.expiresAt) throw new Error('Route result changed or expired.');
}

export function routeAction(q, context, now=Date.now(), allowedTokens=TOKENS) {
  assertRouteReview(q,context,now,allowedTokens);
  return {account:q.inputToken.contract,name:'transfer',data:{from:q.actor,to:SWAP_CONTRACT,quantity:asset(q.inputRaw,q.inputToken),
    memo:`swapexactin#${q.route.join(',')}#${q.actor}#${asset(q.minimum,q.outputToken)}@${q.outputToken.contract}#${Math.floor(q.expiresAt/1000)}`}};
}