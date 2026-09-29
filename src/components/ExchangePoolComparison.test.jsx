import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import ExchangePoolComparison from './ExchangePoolComparison';
import {fetchQuote} from '../services/alcorMainnet';
import {TOKENS} from '../services/exchangeMath';
jest.mock('../services/alcorMainnet',()=>({fetchQuote:jest.fn()}));
test('ranks exact output amounts rather than fee and only selects a pool on click',async()=>{
 const choose=jest.fn();const now=Date.now();
 fetchQuote.mockImplementation(async({poolId})=>({poolId,outputRaw:poolId==='314'?'6000':'5000',expiresAt:now+30000}));
 render(<ExchangePoolComparison choices={[{id:'4498',funded:true},{id:'314',funded:true}]} input={TOKENS[0]} output={TOKENS[5]} amount="1" actor="maestrobeatz" slippage={50} poolId="4498" onChoose={choose} now={now}/>);
 expect(await screen.findByText('Best quoted pool #314')).toBeInTheDocument();expect(choose).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Use pool'}));expect(choose).toHaveBeenCalledWith('314');
});
