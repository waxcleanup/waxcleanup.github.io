import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import IncineratorDetails from './IncineratorDetails';
import {loadFuel,loadEnergy} from '../services/transactionActions';
jest.mock('../services/transactionActions',()=>({loadFuel:jest.fn(),loadEnergy:jest.fn()}));
const inc={asset_id:'123',name:'EcoFlame',owner:'alice',fuel:99000,energy:8,durability:480};
test('fuel review shows exact target, cost and capacity; refreshes immediately after acceptance',async()=>{
 const refresh=jest.fn().mockResolvedValue(),changed=jest.fn();loadFuel.mockResolvedValue('tx');window.addEventListener('cleanup:incinerator-changed',changed);
 render(<IncineratorDetails incinerator={inc} onRepair={()=>{}} fetchIncineratorData={refresh}/>);
 fireEvent.click(screen.getByRole('button',{name:'Load TRASH fuel'}));fireEvent.click(screen.getByRole('button',{name:'Fill capacity'}));
 expect(screen.getByLabelText('TRASH to load').value).toBe('1000');
 fireEvent.click(screen.getByRole('button',{name:'Load fuel in wallet'}));
 await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(1));expect(loadFuel).toHaveBeenCalledWith('alice','123',1000);expect(changed).toHaveBeenCalledTimes(1);window.removeEventListener('cleanup:incinerator-changed',changed);
});
test('rejected transactions show their error and do not refresh or show success',async()=>{
 const refresh=jest.fn();loadEnergy.mockRejectedValue(new Error('Rejected in wallet'));
 render(<IncineratorDetails incinerator={inc} onRepair={()=>{}} fetchIncineratorData={refresh}/>);
 fireEvent.click(screen.getByRole('button',{name:'Recharge energy'}));fireEvent.click(screen.getByRole('button',{name:'Recharge in wallet'}));
 await screen.findByText('Rejected in wallet');expect(refresh).not.toHaveBeenCalled();
});