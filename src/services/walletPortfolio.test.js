import {verifyWalletHoldings} from './alcorMainnet';
jest.mock('./alcorMainnet',()=>({verifyWalletHoldings:jest.fn()}));
beforeEach(()=>verifyWalletHoldings.mockImplementation(async(actor,tokens)=>({tokens:tokens.filter(t=>Number(t.amount)>0),unavailable:0})));
import {normalizeWallet,fetchWalletPortfolio} from './walletPortfolio';
test('prices exact contracts and precision only, preserving unpriced holdings',()=>{
 const result=normalizeWallet([{symbol:'CINDER',contract:'cleanuptoken',precision:6,amount:2},{symbol:'CINDER',contract:'other.token',precision:6,amount:3},{symbol:'BAD',contract:'bad.token',amount:10,error:'ABI unavailable'},{symbol:'ZERO',contract:'zero.token',precision:4,amount:0}], [{symbol:'CINDER',contract:'cleanuptoken',decimals:6,usd_price:4},{symbol:'CINDER',contract:'other.token',decimals:8,usd_price:100}]);
 expect(result.rows).toHaveLength(2); expect(result.rows[0].valueUSD).toBe(8);expect(result.rows[1].valueUSD).toBeNull();expect(result.skipped).toBe(1);
});
test('keeps token holdings if prices fail and rejects a different account',async()=>{
 global.fetch=jest.fn(url=>Promise.resolve({ok:true,json:async()=>url.includes('alcor')?null:{account:'alice',tokens:[]}}));
 await expect(fetchWalletPortfolio('alice')).resolves.toMatchObject({rows:[],pricesUnavailable:true});
 await expect(fetchWalletPortfolio('bob')).rejects.toThrow('Unable to load');
 delete global.fetch;
});
test('reads beyond the first page, including short pages, and deduplicates holdings',async()=>{
 global.fetch=jest.fn(url=>Promise.resolve({ok:true,json:async()=>url.includes('alcor')?[]:{account:'alice',tokens:url.includes('skip=0')?[{symbol:'ONE',contract:'one.token',precision:4,amount:1}]:url.includes('skip=1')?[{symbol:'TWO',contract:'two.token',precision:4,amount:2}]:[]}}));
 const result=await fetchWalletPortfolio('alice'); expect(result.rows).toHaveLength(2);expect(result.partial).toBe(false); expect(global.fetch).toHaveBeenCalledTimes(4);delete global.fetch;
});
