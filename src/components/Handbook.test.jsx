import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import '@testing-library/jest-dom';
import {MemoryRouter} from 'react-router-dom';
import axios from 'axios';
import GuidePage from './GuidePage';
import CollectionsPage from './CollectionsPage';
jest.mock('axios',()=>({get:jest.fn()}));
beforeEach(()=>{window.location.hash=''; Element.prototype.scrollIntoView=jest.fn();axios.get.mockReset()});
const reference={success:true,seeds:[{template_id:2,seed_name:'Basic Tomato Seed',base_yield_display:'440,000',water_ticks:14,growth_duration_display:'8h',token_symbol_code:'TOMATOE'}],packs:[],compost:[]};
test('shared guide link opens its topic and markets use current site destinations',async()=>{
 window.location.hash='#exchange';axios.get.mockResolvedValue({data:reference});
 render(<MemoryRouter><GuidePage/></MemoryRouter>);
 expect(document.getElementById('exchange')).toHaveAttribute('open');
 expect(screen.getByRole('link',{name:'Open exchange →'})).toHaveAttribute('href','/exchange');
 screen.getAllByRole('link',{name:'Player marketplace →'}).forEach(link=>expect(link).toHaveAttribute('href','/market/listings'));
 await screen.findByText('440,000 TOMATOE');
 expect(screen.getByText('Basic Tomato Seed')).toBeInTheDocument();
});
test('encyclopedia uses metadata before ambiguous names and filters search results',async()=>{
 axios.get.mockImplementation(url=>Promise.resolve({data:url.includes('registered')?{templates:[
 {template_id:1,name:'Farm Cell',schema:'energycell',nft_type:'Farm Cell'},
 {template_id:2,name:'EcoTools Crate',schema:'packs',nft_type:'Crate'}
 ]}:reference}));
 render(<MemoryRouter><CollectionsPage/></MemoryRouter>);
 await screen.findByRole('heading',{name:'Farm Cell'});
 fireEvent.click(screen.getByRole('button',{name:/Energy & Resources/}));
 expect(screen.getByRole('heading',{name:'Farm Cell'})).toBeInTheDocument();
 expect(screen.queryByRole('heading',{name:'EcoTools Crate'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/Packs/}));
 expect(screen.getByRole('heading',{name:'EcoTools Crate'})).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Search encyclopedia'),{target:{value:'not found'}});
 expect(screen.getByText('No items found')).toBeInTheDocument();
});
test('seed reference reports unavailability rather than showing invented values',async()=>{
 axios.get.mockRejectedValue(Error('offline'));
 render(<MemoryRouter><GuidePage/></MemoryRouter>);
 await waitFor(()=>expect(screen.getByText(/Seed data is unavailable/)).toBeInTheDocument());
});