import React from 'react';
import {render,screen,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import LootReveal from './LootReveal';
import {fetchTransactionRewards,readSavedReveals} from '../services/lootReveal';
jest.mock('axios',()=>({get:jest.fn()}));
jest.mock('../services/lootReveal',()=>({...jest.requireActual('../services/lootReveal'),fetchTransactionRewards:jest.fn()}));
beforeEach(()=>{jest.clearAllMocks();localStorage.clear();HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};});
test('shows receipt mints without any history wait',()=>{
 const result={transactionId:'a'.repeat(64),actionTraces:[{act:{account:'atomicassets',name:'logmint',data:{asset_id:'123',authorized_minter:'rhythmfarmer',new_asset_owner:'tester',template_id:10,immutable_template_data:[{key:'name',value:['string','Seed']} ]}}}]};
 render(<LootReveal result={result} wallet="tester" title="Crate" onClose={()=>{}}/>);
 expect(screen.getByText('Seed')).toBeInTheDocument();expect(screen.getByRole('status')).toHaveTextContent('1 NFT received');expect(fetchTransactionRewards).not.toHaveBeenCalled();
});
test('shows accepted status immediately and cancels lookup when closed',async()=>{
 fetchTransactionRewards.mockImplementation(()=>new Promise(()=>{}));
 const {unmount}=render(<LootReveal result={{transactionId:'a'.repeat(64)}} wallet="tester" title="Crate" onClose={()=>{}}/>);
 expect(screen.getByText('TRANSACTION ACCEPTED')).toBeInTheDocument();
 await waitFor(()=>expect(fetchTransactionRewards).toHaveBeenCalled());
 const signal=fetchTransactionRewards.mock.calls[0][2];unmount();expect(signal.aborted).toBe(true);
});

test('recovers another account’s public reveal without storing its NFTs under the connected wallet',async()=>{
 fetchTransactionRewards.mockRejectedValueOnce(Object.assign(new Error('Wrong owner'),{code:'REVEAL_OWNER_MISMATCH',owner:'mmvyu.wam'})).mockResolvedValueOnce([{asset_id:'123',name:'Enhanced Tomato Seed'}]);
 render(<LootReveal result={{transactionId:'a'.repeat(64)}} wallet="maestrobeatz" title="Recovered opening" onClose={()=>{}}/>);
 await screen.findByText('Enhanced Tomato Seed');
 expect(screen.getByText('mmvyu.wam')).toBeInTheDocument();
 expect(fetchTransactionRewards.mock.calls[1][1]).toBe('mmvyu.wam');
 expect(readSavedReveals('maestrobeatz')).toEqual([]);
 expect(readSavedReveals('mmvyu.wam')[0].items[0].asset_id).toBe('123');
});
