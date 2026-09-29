import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import RecipesPage from './RecipesPage';
import {useSession} from '../hooks/SessionContext';
import {fetchBlendOverview} from '../services/blendsApi';
import {executeRecipe} from '../services/blendActions';
jest.mock('../hooks/SessionContext',()=>({useSession:jest.fn()}));
jest.mock('../services/blendActions',()=>({executeRecipe:jest.fn()}));
jest.mock('axios',()=>({get:jest.fn()}));
jest.mock('../services/blendsApi',()=>({...jest.requireActual('../services/blendsApi'),fetchBlendOverview:jest.fn()}));
const recipe={recipe_id:1,label:'Test Crate',can_blend:true,nft_inputs:[{template_id:1,qty:1,owned:1,complete:true}],loot_outputs:[{slot:0,template_id:2,qty_min:1,qty_max:1,weight:1,active:1}]};
beforeEach(()=>{jest.clearAllMocks();useSession.mockReturnValue({session:{actor:'tester'}});HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};fetchBlendOverview.mockResolvedValue({recipes:[recipe],assets:[]});});
test('viewing details groups outputs without submitting a transaction',async()=>{
 render(<RecipesPage/>);fireEvent.click(await screen.findByRole('button',{name:'View Test Crate'}));
 expect(screen.getByRole('region',{name:'Slot 1'})).toBeInTheDocument();
 expect(screen.getByText('Drops 1 NFT')).toBeInTheDocument();
 expect(fetchBlendOverview).toHaveBeenCalledTimes(1);expect(executeRecipe).not.toHaveBeenCalled();
});
test('fresh ownership is required before executing a blend',async()=>{
 fetchBlendOverview.mockResolvedValueOnce({recipes:[recipe],assets:[]}).mockResolvedValueOnce({recipes:[{...recipe,can_blend:false}],assets:[]});
 render(<RecipesPage/>);fireEvent.click(await screen.findByRole('button',{name:'View Test Crate'}));fireEvent.click(screen.getByRole('button',{name:'Open now'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Required NFTs changed');expect(executeRecipe).not.toHaveBeenCalled();
});
test('failed loading can be retried',async()=>{
 fetchBlendOverview.mockRejectedValueOnce(new Error('offline'));
 render(<RecipesPage/>);expect(await screen.findByRole('alert')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Refresh'}));
 await waitFor(()=>expect(screen.getByRole('button',{name:'View Test Crate'})).toBeInTheDocument());
});
test('explicit execution uses fresh recipe and asset IDs',async()=>{
 const assets=[{asset_id:'123',template_id:'1'}];
 fetchBlendOverview.mockResolvedValueOnce({recipes:[recipe],assets:[]}).mockResolvedValue({recipes:[recipe],assets});
 executeRecipe.mockResolvedValue({transactionId:'test-only'});
 render(<RecipesPage/>);fireEvent.click(await screen.findByRole('button',{name:'View Test Crate'}));fireEvent.click(screen.getByRole('button',{name:'Open now'}));
 await waitFor(()=>expect(executeRecipe).toHaveBeenCalledWith({session:{actor:'tester'},recipe,bagAssets:assets}));
 expect(await screen.findByText('Success — transaction test-only')).toBeInTheDocument();
});
