import {fetchLiveIncinerators} from './incinerators';
import {postWaxMainnetRpc} from './waxMainnetEndpoints';
jest.mock('./waxMainnetEndpoints',()=>({postWaxMainnetRpc:jest.fn()}));
test('reads mutable state directly and filters ownership independently of metadata',async()=>{
 postWaxMainnetRpc.mockImplementation(async(_,body)=>body.table==='incinerators'?{rows:[{id:'123',owner:'alice',fuel:'900',energy:8,durability:480},{id:'456',owner:'bob',fuel:100}],more:false}:{rows:[{owner:'alice',slots:['123','0','0']}],more:false});
 const result=await fetchLiveIncinerators('alice');expect(result.rows).toHaveLength(1);expect(result.rows[0]).toMatchObject({asset_id:'123',fuel:900,energy:8,durability:480});expect(result.slots[0]).toBe('123');
});
test('does not silently replace existing readings with incomplete or unavailable data',async()=>{
 postWaxMainnetRpc.mockResolvedValue({rows:[],more:true});await expect(fetchLiveIncinerators('alice')).rejects.toThrow('Incomplete');
 postWaxMainnetRpc.mockRejectedValue(new Error('offline'));await expect(fetchLiveIncinerators('alice')).rejects.toThrow('offline');
});jest.mock('axios',()=>({get:jest.fn()}));
