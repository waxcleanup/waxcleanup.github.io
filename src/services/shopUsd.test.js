import { estimatedUsd, fetchShopUsdRate, USD_MAX_AGE } from './shopUsd';
const item = { token: 'TOMATOE', token_contract: 'maestrobeatz', decimals: 8 };
afterEach(() => jest.restoreAllMocks());
test('USD estimates multiply quantities, retain small values, and expire', () => {
 const rate={usd:0.000001,checkedAt:1000};
 expect(estimatedUsd(1800000,rate,1000)).toBe('≈ $1.80 USD');
 expect(estimatedUsd(3600000,rate,1000)).toBe('≈ $3.60 USD');
 expect(estimatedUsd(1,rate,1000)).toBe('≈ <$0.01 USD');
 expect(estimatedUsd(1800000,rate,1001+USD_MAX_AGE)).toBeNull();
 expect(estimatedUsd(1800000,null,1000)).toBeNull();
 expect(estimatedUsd(Infinity,rate,1000)).toBeNull();
});
test('rate lookup verifies token contract, symbol, precision and positive finite price', async () => {
 global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({symbol:'TOMATOE',contract:'maestrobeatz',decimals:8,usd_price:0.000001})});
 expect((await fetchShopUsdRate(item)).usd).toBe(0.000001);
 expect(fetch).toHaveBeenCalledWith('https://wax.alcor.exchange/api/v2/tokens/tomatoe-maestrobeatz',expect.anything());
 for(const bad of [{contract:'otheraccount'},{symbol:'FAKE'},{decimals:4},{usd_price:0},{usd_price:Infinity}]) {
  fetch.mockResolvedValue({ok:true,json:async()=>({symbol:'TOMATOE',contract:'maestrobeatz',decimals:8,usd_price:0.000001,...bad})});
  await expect(fetchShopUsdRate(item)).rejects.toThrow();
 }
});
