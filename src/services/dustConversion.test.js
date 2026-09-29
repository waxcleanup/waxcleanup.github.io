import {verifyWalletHoldings,executeDustConversion,quoteDustConversion,dustTransferBudget} from './alcorMainnet';
import {TOKENS,minimumRaw} from './exchangeMath';
import {assembleRoute} from './exchangeRoutes';
import {InitTransaction} from '../hooks/useSession';
import {buildContractAction} from './contractKit';
import {getHealthyWaxMainnetEndpoint} from './waxMainnetEndpoints';
jest.mock('./waxMainnetEndpoints',()=>({WAX_MAINNET_ENDPOINTS:['https://node.test'],getHealthyWaxMainnetEndpoint:jest.fn(),invalidateWaxMainnetEndpoint:jest.fn()}));
jest.mock('./exchangeQuotes',()=>({}));
jest.mock('./contractKit',()=>({buildContractAction:jest.fn()}));
jest.mock('../hooks/useSession',()=>({InitTransaction:jest.fn()}));
const input={symbol:'INDICA',contract:'stonerstoken',precision:8},output=TOKENS.find(t=>t.symbol==='TRASH');
let amount,precision,fee;
const review=()=>{const now=Date.now(),params={actor:'alice',kind:'swap',poolId:'auto',inputToken:input,outputToken:output,amount:'1.00000000',slippageBps:50};return {params,quote:assembleRoute([{network:'wax-mainnet',actor:'alice',kind:'swap',poolId:'1',tokenA:input,tokenB:output,inputToken:input,outputToken:output,inputRaw:'100000000',outputRaw:'1000',minimum:minimumRaw('1000',50).toString(),slippageBps:50,createdAt:now,expiresAt:now+30000,fee:3000,impactBps:30}],params)};};
beforeEach(()=>{amount='1.00000000';precision=8;fee=3000;getHealthyWaxMainnetEndpoint.mockResolvedValue('https://node.test');buildContractAction.mockImplementation(async(account,name,data)=>({account,name,data}));InitTransaction.mockResolvedValue({transaction_id:'a'.repeat(64)});global.fetch=jest.fn(async(url)=>({ok:true,text:async()=>JSON.stringify(url.includes('get_currency_balance')?[`${amount} INDICA`]:url.includes('get_currency_stats')?{INDICA:{supply:`100.${'0'.repeat(precision)} INDICA`}}:{rows:[{id:1,active:true,fee,tokenA:{quantity:'0.00000000 INDICA',contract:'stonerstoken'},tokenB:{quantity:'0.000 TRASH',contract:'cleanuptoken'}}]})}));});
afterEach(()=>delete global.fetch);
test('replaces stale indexed amount with exact chain balance, including one raw unit',async()=>{amount='0.00000001';await expect(verifyWalletHoldings('alice',[{...input,amount:'43.07526427'}])).resolves.toMatchObject({tokens:[{exactAmount:'0.00000001',raw:'1'}],unavailable:0});expect(InitTransaction).not.toHaveBeenCalled();});
test('failed or wrong-precision balances are excluded, never replaced with stale amounts',async()=>{amount='1.0000';await expect(verifyWalletHoldings('alice',[input])).resolves.toEqual({tokens:[],unavailable:1});global.fetch.mockRejectedValue(new Error('offline'));await expect(verifyWalletHoldings('alice',[input])).resolves.toEqual({tokens:[],unavailable:1});});
test('a reviewed external token builds one protected transfer to the exact route and TRASH contract',async()=>{const r=review();await executeDustConversion(r,'alice');expect(buildContractAction).toHaveBeenCalledWith('stonerstoken','transfer',{from:'alice',to:'swap.alcor',quantity:'1.00000000 INDICA',memo:`swapexactin#1#alice#0.995 TRASH@cleanuptoken#${Math.floor(r.quote.expiresAt/1000)}`});expect(InitTransaction).toHaveBeenCalledWith(expect.objectContaining({expectedActor:'alice',validUntil:r.quote.expiresAt,actions:[expect.objectContaining({account:'stonerstoken'})]}));});
test('blocks changed balance, contract precision, and pool fee before signing',async()=>{const r=review();amount='0.00000001';await expect(executeDustConversion(r,'alice')).rejects.toThrow('Balance changed');amount='1.00000000';precision=4;await expect(executeDustConversion(r,'alice')).rejects.toThrow('precision');precision=8;fee=10000;await expect(executeDustConversion(r,'alice')).rejects.toThrow('Route changed');expect(InitTransaction).not.toHaveBeenCalled();});
test('blocks changed wallet, expired review, changed destination, and high impact without signing',async()=>{const r=review();await expect(executeDustConversion(r,'bob')).rejects.toThrow('Wallet');await expect(executeDustConversion({...r,quote:{...r.quote,expiresAt:0}},'alice')).rejects.toThrow();await expect(executeDustConversion({...r,params:{...r.params,outputToken:TOKENS[0]}},'alice')).rejects.toThrow('settings');await expect(executeDustConversion({...r,quote:{...r.quote,impactBps:501}},'alice')).rejects.toThrow('impact');expect(InitTransaction).not.toHaveBeenCalled();});
test('zero balance stops quote creation before querying routes or wallet signing',async()=>{amount='0.00000000';await expect(quoteDustConversion('alice',input)).rejects.toThrow('No balance');expect(InitTransaction).not.toHaveBeenCalled();});
test('NEWS reserves each additive fee with upward rounding before quoting',async()=>{
 global.fetch.mockResolvedValue({ok:true,text:async()=>JSON.stringify({rows:[{code:'NEWS',is_tradeable:1,tx_fees:[{recipient:'otf.nefty',bps:2},{recipient:'eosio.null',bps:5},{recipient:'newstokenwax',bps:3}]}],more:false})});
 const token={symbol:'NEWS',contract:'newstokenwax',precision:6};
 await expect(dustTransferBudget(token,'5635')).resolves.toMatchObject({spendRaw:'5628',reserveRaw:'7'});
 await expect(dustTransferBudget(token,'1')).rejects.toThrow('too small');
});
test('NEWS fee configuration failure blocks a full-balance transfer',async()=>{
 global.fetch.mockResolvedValue({ok:true,text:async()=>JSON.stringify({rows:[],more:false})});
 await expect(dustTransferBudget({symbol:'NEWS',contract:'newstokenwax',precision:6},'5635')).rejects.toThrow('settings');
 expect(InitTransaction).not.toHaveBeenCalled();
});
test('KRAKEN dust is blocked before wallet approval when a configured fee rounds to zero',async()=>{
 global.fetch.mockResolvedValue({ok:true,text:async()=>JSON.stringify({rows:[{code:'KRAKEN',is_tradeable:1,tx_fees:[{recipient:'otf.nefty',bps:50},{recipient:'ripplingpool',bps:250}]}],more:false})});
 const token={symbol:'KRAKEN',contract:'cointreasure',precision:5};
 await expect(dustTransferBudget(token,'84')).rejects.toThrow('rounding');
 await expect(dustTransferBudget(token,'10000')).resolves.toMatchObject({spendRaw:'9700',reserveRaw:'300'});
 expect(InitTransaction).not.toHaveBeenCalled();
});

test('CHAD and BBCHAD reserve the published fee and rounding allowance, honoring sender exemptions',async()=>{
 global.fetch.mockResolvedValue({ok:true,text:async()=>JSON.stringify({rows:['CHAD','BBCHAD'].map(symbol=>({sym:`4,${symbol}`,fee_receivers:[{receiver:'chaddevs.gm',fee:'0.05000000074505806'}],ignored_senders:['swap.alcor']})),more:false})});
 for(const symbol of ['CHAD','BBCHAD']){
  const token={symbol,contract:'chadtoken.gm',precision:4};
  await expect(dustTransferBudget(token,'33','alice')).resolves.toMatchObject({spendRaw:'30',reserveRaw:'3'});
  await expect(dustTransferBudget(token,'33','swap.alcor')).resolves.toMatchObject({spendRaw:'33',reserveRaw:'0'});
  await expect(dustTransferBudget(token,'1','alice')).rejects.toThrow('too small');
  await expect(dustTransferBudget({...token,precision:8},'33','alice')).rejects.toThrow('settings');
 }
 expect(InitTransaction).not.toHaveBeenCalled();
});
