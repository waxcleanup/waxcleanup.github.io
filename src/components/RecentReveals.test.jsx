import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import RecentReveals from './RecentReveals';
import {fetchRecentOpenings,readSavedReveals} from '../services/lootReveal';
jest.mock('../services/lootReveal',()=>({fetchRecentOpenings:jest.fn(),readSavedReveals:jest.fn()}));
jest.mock('./LootReveal',()=>props=><div role="dialog">{props.result.transactionId}</div>);
test('shows chain history without a pasted ID and opens the selected reveal',async()=>{
 const transactionId='a'.repeat(64);
 readSavedReveals.mockReturnValue([]);fetchRecentOpenings.mockResolvedValue([{transactionId,recipeId:'1',timestamp:Date.now()}]);
 render(<RecentReveals wallet="tester" recipes={[{recipe_id:1,label:'Small Eco Crate'}]}/>);
 expect(await screen.findByText('Small Eco Crate')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'View reveal'}));
 expect(screen.getByRole('dialog')).toHaveTextContent(transactionId);
});

test('accepts the wallet SDK Name object used by Farming without crashing',async()=>{
 const actor={value:{},toString:()=> 'maestrobeatz'};
 readSavedReveals.mockReturnValue([]);fetchRecentOpenings.mockResolvedValue([]);
 render(<RecentReveals wallet={actor}/>);
 expect(await screen.findByText('No recent openings found.')).toBeInTheDocument();
 expect(screen.getByText('Pack openings and blends for maestrobeatz')).toBeInTheDocument();
 expect(fetchRecentOpenings).toHaveBeenLastCalledWith('maestrobeatz',expect.any(AbortSignal));
});
