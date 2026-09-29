import {verifyWalletHoldings} from './alcorMainnet';
import {TOKENS} from './exchangeMath';
const validAccount = value => /^[a-z1-5.]{1,13}$/.test(value);
async function read(url) {
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),15000);
  try { const response=await fetch(url,{signal:controller.signal}); if(!response.ok)throw new Error('Data temporarily unavailable'); return await response.json(); }
  finally { clearTimeout(timer); }
}
export function normalizeWallet(tokens, prices) {
  const seen=new Set(); let skipped=0;
  const rows=[];
  for(const token of tokens) {
    if(token.error || !validAccount(token.contract) || !/^[A-Z]{1,7}$/.test(token.symbol) || !Number.isInteger(token.precision) || token.precision<0 || token.precision>18 || !Number.isFinite(Number(token.amount)) || Number(token.amount)<0) { skipped++; continue; }
    const key=`${token.symbol.toLowerCase()}-${token.contract}`;
    if(seen.has(key))continue; seen.add(key);
    if(Number(token.amount)===0)continue;
    const price=prices.find(p=>p.contract===token.contract && p.symbol===token.symbol && Number(p.decimals)===token.precision);
    const usd=price?.usd_price != null && Number.isFinite(Number(price.usd_price)) && Number(price.usd_price)>0 ? Number(price.usd_price) : null;
    rows.push({...token,key,amount:Number(token.amount),valueUSD:usd===null?null:Number(token.amount)*usd});
  }
  return {rows:rows.sort((a,b)=>(b.valueUSD||0)-(a.valueUSD||0)||a.symbol.localeCompare(b.symbol)),skipped};
}
async function readHoldings(actor) {
  const tokens=[]; const seen=new Set(); let skip=0;
  for(let page=0;page<20;page++) {
    let data;
    try { data=await read(`https://wax.eosusa.io/v2/state/get_tokens?account=${encodeURIComponent(actor)}&limit=100&skip=${skip}`); }
    catch(error) { if(tokens.length)return {tokens,partial:true}; throw error; }
    if(data.account!==actor || !Array.isArray(data.tokens))throw new Error('Unable to load wallet holdings. Please retry.');
    if(!data.tokens.length)return {tokens,partial:false};
    const fresh=data.tokens.filter(t=>!seen.has(`${t.symbol}@${t.contract}`));
    if(!fresh.length)return {tokens,partial:true};
    fresh.forEach(t=>seen.add(`${t.symbol}@${t.contract}`)); tokens.push(...fresh);
    skip+=data.tokens.length;
  }
  return {tokens,partial:true};
}
export async function fetchWalletPortfolio(actor) {
  if(!validAccount(actor))throw new Error('Connect a WAX wallet to view your tokens.');
  const [wallet,prices]=await Promise.all([
    readHoldings(actor),
    read('https://wax.alcor.exchange/api/v2/tokens').catch(()=>null),
  ]);
  const candidates=[...new Map([...wallet.tokens.filter(t=>Number(t.amount)>0),...TOKENS].map(t=>[`${t.symbol}@${t.contract}`,t])).values()];
  const verified=await verifyWalletHoldings(actor,candidates);
  return {...normalizeWallet(verified.tokens,Array.isArray(prices)?prices:[]),unavailable:verified.unavailable,partial:wallet.partial,pricesUnavailable:!Array.isArray(prices),updatedAt:Date.now()};
}