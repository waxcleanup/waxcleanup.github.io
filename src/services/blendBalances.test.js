import {fetchBlendBalances,blendTokenStatus,formatTokenUnits,tokenKey} from './blendBalances';
import {postWaxRpc} from './waxRpcRead';
jest.mock('./waxRpcRead',()=>({postWaxRpc:jest.fn()}));
const input={amount:'7100000000000',token_found:true,token_contract:'maestrobeatz',symbol:'TOMATOE',precision:8};
beforeEach(()=>jest.clearAllMocks());
test('uses exact units to display even a one-unit shortfall',async()=>{
 postWaxRpc.mockResolvedValue(['70999.99999999 TOMATOE']);
 const balances=await fetchBlendBalances('tester',[{token_inputs:[input]}]);
 const state=blendTokenStatus({token_inputs:[input]},balances);
 expect(state.ready).toBe(false);expect(state.inputs[0].missing).toBe('1');
 expect(formatTokenUnits(state.inputs[0].missing,8)).toBe('0.00000001');
 expect(postWaxRpc).toHaveBeenCalledWith('/v1/chain/get_currency_balance',{account:'tester',code:'maestrobeatz',symbol:'TOMATOE'});
});
test('empty balance is zero but a failed balance is unknown',async()=>{
 postWaxRpc.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('offline'));
 const recipe={token_inputs:[input]};
 expect(blendTokenStatus(recipe,await fetchBlendBalances('tester',[recipe])).inputs[0].missing).toBe(input.amount);
 expect(blendTokenStatus(recipe,await fetchBlendBalances('tester',[recipe])).inputs[0].known).toBe(false);
});
test('combines repeated token costs and requires sufficient funds',()=>{
 const recipe={token_inputs:[input,input]};
 expect(blendTokenStatus(recipe,{[tokenKey(input)]:input.amount}).ready).toBe(false);
 expect(blendTokenStatus(recipe,{[tokenKey(input)]:'14200000000000'}).ready).toBe(true);
});
