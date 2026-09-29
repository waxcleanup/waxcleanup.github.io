import {extractBurnReward, fetchBurnReward} from './burnReward';
const payout = (quantity = '0.123456 CINDER', extra = {}) => ({receiver:'cleanuptoken', global_sequence:1, act:{account:'cleanuptoken',name:'transfer',data:{from:'cleanupcentr',to:'alice',memo:'Reward for burning NFT',quantity}},...extra});
test('reads nested payout and ignores notification duplicates', () => {
  expect(extractBurnReward([{inline_traces:[payout(),payout('0.123456 CINDER',{receiver:'alice'}),payout()]}],'alice')).toBe('0.123456');
});
test('sums distinct transfers without losing precision', () => {
  expect(extractBurnReward([payout('9007199254.123456 CINDER'),payout('0.123456 CINDER',{global_sequence:2})],'alice')).toBe('9007199254.246912');
});
test('missing or unrelated payouts never become a zero reward', () => {
  expect(extractBurnReward([], 'alice')).toBeNull();
  expect(extractBurnReward([payout()], 'bob')).toBeNull();
  const wrong = payout(); wrong.act.account = 'fake.token';
  expect(extractBurnReward([wrong], 'alice')).toBeNull();
  expect(extractBurnReward([payout('1.000000 WAX')], 'alice')).toBeNull();
});
test('history must confirm exact transaction and execution', async () => {
  const id = 'a'.repeat(64);
  global.fetch = jest.fn().mockResolvedValue({ok:true,json:async()=>({trx_id:'b'.repeat(64),executed:true,actions:[payout()]})});
  expect(await fetchBurnReward(id,'alice')).toBeNull();
  global.fetch.mockResolvedValue({ok:true,json:async()=>({trx_id:id,executed:true,actions:[payout()]})});
  expect(await fetchBurnReward(id,'alice')).toBe('0.123456');
  delete global.fetch;
});