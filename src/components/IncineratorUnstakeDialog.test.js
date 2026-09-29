import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import IncineratorUnstakeDialog from './IncineratorUnstakeDialog';
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = jest.fn();
});
test('shows asset and resource loss, with explicit separate cancel and confirm actions', () => {
  const onCancel = jest.fn(), onConfirm = jest.fn();
  render(<IncineratorUnstakeDialog incinerator={{asset_id:'1099951100038',name:'EcoFlame',fuel:90000,energy:9}} onCancel={onCancel} onConfirm={onConfirm} />);
  expect(screen.getByText('EcoFlame')).toBeTruthy();
  expect(screen.getByText('Asset #1099951100038')).toBeTruthy();
  expect(screen.getByText(/will not be refunded/)).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole('button', {name:'Keep Staked'}));
  fireEvent.click(screen.getByRole('button', {name:'Keep Staked'}));
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name:'Unstake to Wallet'}));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});
test('does not warn about losing resources when both balances are zero', () => {
  render(<IncineratorUnstakeDialog incinerator={{id:'123',fuel:0,energy:0}} onCancel={()=>{}} onConfirm={()=>{}} />);
  expect(screen.getByText('This incinerator has no stored fuel or energy to lose.')).toBeTruthy();
});
