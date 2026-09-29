import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import ShopPage, { ShopItemCard, crateNftRange, slotNftRange } from './ShopPage';
import axios from 'axios';
import { usePlayerResources } from '../hooks/PlayerResourcesContext';
jest.mock('axios',()=>({get:jest.fn()}));
jest.mock('../services/shopActions',()=>({buyPack:jest.fn()}));
jest.mock('../hooks/PlayerResourcesContext',()=>({usePlayerResources:jest.fn()}));
const item={sale_id:1,template_id:904730,name:'Small Eco Crate',description:'Seeds and compost.',category:'packs',price:1800000,token:'TOMATOE',remaining:10,tx_limit:10};
const onBuy=jest.fn();
test('crate count adds fixed drops and one outcome per slot, including no-drop outcomes', () => {
 const detail = {guaranteed:[{template_id:1,qty_min:4,qty_max:4}],bonus:[
  {slot:1,template_id:2,qty_min:1,qty_max:1},
  {slot:1,template_id:3,qty_min:1,qty_max:2},
  {slot:2,template_id:0,qty_min:1,qty_max:1},
  {slot:2,template_id:4,qty_min:1,qty_max:3},
 ]};
 expect(crateNftRange(detail)).toEqual({min:5,max:9});
 expect(slotNftRange(detail.bonus.filter(d=>d.slot===2))).toEqual({min:0,max:3});
 expect(crateNftRange({guaranteed:detail.guaranteed,bonus:[{slot:1,template_id:2,qty_min:1,qty_max:1},{slot:2,template_id:3,qty_min:1,qty_max:1}]})).toEqual({min:6,max:6});
});
function show(extra={}) {const view = render(<MemoryRouter><ShopItemCard item={item} isLoggedIn onBuy={onBuy} onViewDrops={jest.fn()} buying={false} tokenBalance={99999999} balanceReady usdRate={{usd:0.000001,checkedAt:1000}} rateNow={1000} {...extra}/></MemoryRouter>); fireEvent.click(screen.getByRole('button',{name:'View item',exact:true})); return view;}
beforeEach(()=>{jest.clearAllMocks(); HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};});
test('quantity updates the token and USD total without submitting a purchase',()=>{
 show(); expect(screen.getAllByText('≈ $1.80 USD')).toHaveLength(3);
 fireEvent.click(screen.getByRole('button',{name:'Increase quantity'}));
 expect(screen.getByText('≈ $3.60 USD')).toBeInTheDocument();
 expect(screen.getByText('3,600,000 TOMATOE')).toBeInTheDocument();
 expect(onBuy).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Buy 2 crates'}));expect(onBuy).toHaveBeenCalledWith(item,2);
});
test('missing USD data never invents a zero dollar price or blocks a token purchase',()=>{
 show({usdRate:null}); expect(screen.getAllByText('USD estimate unavailable')).toHaveLength(3);
 expect(screen.getByRole('button',{name:'Buy 1 crate'})).toBeEnabled();
 expect(screen.queryByText(/\$0.00/)).not.toBeInTheDocument();
});
test('insufficient balance prevents buying and offers the exchange link',()=>{
 show({tokenBalance:0});expect(screen.getByRole('button',{name:'Need more TOMATOE'})).toBeDisabled();
 expect(screen.getByRole('link',{name:/Get TOMATOE/})).toHaveAttribute('href','/exchange');
 expect(onBuy).not.toHaveBeenCalled();
});



test('exploring contents loads the real drop rows without buying',async()=>{
 usePlayerResources.mockReturnValue({resources:{},lastUpdated:null});
 axios.get.mockImplementation(async url=>({data:url.endsWith('/shop/sales')?{sales:[item]}:{sale:item,guaranteed:[{id:1,template_id:10,name:'Enhanced seed',qty_min:1,qty_max:1}],bonus:[]}}));
 render(<MemoryRouter><ShopPage session={null} onLogin={jest.fn()} embedded /></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'View item',exact:true}));
 fireEvent.click(await screen.findByRole('button',{name:'Explore contents'}));
 expect(await screen.findByText('Enhanced seed')).toBeInTheDocument();
 expect(screen.getByRole('heading',{name:'Guaranteed Drops'})).toBeInTheDocument();
 expect(onBuy).not.toHaveBeenCalled();
});
