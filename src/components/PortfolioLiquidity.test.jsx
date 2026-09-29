import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PortfolioLiquidity from './PortfolioLiquidity';
import { loadPortfolioLiquidity, quotePortfolioLiquidity, executePortfolioLiquidity } from '../services/alcorMainnet';
jest.mock('../services/alcorMainnet', () => ({ loadPortfolioLiquidity: jest.fn(), quotePortfolioLiquidity: jest.fn(), executePortfolioLiquidity: jest.fn() }));
const tokenA = { symbol: 'TLM', contract: 'alien.worlds', precision: 4 };
const tokenB = { symbol: 'WAX', contract: 'eosio.token', precision: 8 };
const props = { actor: 'tester', group: { poolId: '0' }, position: { id: '123', closed: false, locked: false }, onClose: jest.fn(), onComplete: jest.fn() };
beforeEach(() => {
  jest.resetAllMocks(); HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  loadPortfolioLiquidity.mockResolvedValue({ allowedTokens: [tokenA, tokenB], balances: ['100000', '100000000'], positionRow: { tickLower: -443580, tickUpper: 443580 } });
  quotePortfolioLiquidity.mockImplementation(async p => ({ ...p, tokenA, tokenB, rawA: '10000', rawB: '1000000', minA: '9950', minB: '995000', feesA: '1', feesB: '2', expiresAt: Date.now() + 30000 }));
  executePortfolioLiquidity.mockResolvedValue({ transactionId: 'mock-only' });
});
test('non-game deposits show balances and require review then explicit wallet confirmation', async () => {
  render(<PortfolioLiquidity {...props} />);
  await screen.findByRole('option', { name: 'TLM · 10.0000 available' });
  fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review amounts' }));
  await screen.findByRole('heading', { name: 'Review deposit' }); expect(executePortfolioLiquidity).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm in wallet' }));
  await waitFor(() => expect(props.onComplete).toHaveBeenCalledWith({ transactionId: 'mock-only' }));
  expect(executePortfolioLiquidity).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ poolId: '0', positionId: '123', actor: 'tester', kind: 'add', amount: '1' }));
});
test('partial removal remains in our dialog and is bound to the selected percentage', async () => {
  render(<PortfolioLiquidity {...props} />); await screen.findByLabelText('Amount');
  fireEvent.click(screen.getByRole('button', { name: 'Remove liquidity' }));
  fireEvent.change(screen.getByLabelText('Remove from this position'), { target: { value: '25' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review amounts' }));
  await screen.findByRole('heading', { name: 'Review withdrawal' });
  expect(quotePortfolioLiquidity).toHaveBeenCalledWith(expect.objectContaining({ kind: 'remove', percent: 25, positionId: '123' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit' })); expect(executePortfolioLiquidity).not.toHaveBeenCalled();
});
test('locked positions disable removal and failed verification cannot open a wallet', async () => {
  loadPortfolioLiquidity.mockRejectedValueOnce(new Error('Position belongs to another wallet.'));
  const view = render(<PortfolioLiquidity {...props} />);
  await screen.findByText('Position belongs to another wallet.'); expect(screen.getByRole('button', { name: 'Review amounts' })).toBeDisabled();
  view.unmount(); render(<PortfolioLiquidity {...props} position={{ ...props.position, locked: true }} />);
  await screen.findByLabelText('Amount'); expect(screen.getByRole('button', { name: 'Remove liquidity' })).toBeDisabled();
  expect(executePortfolioLiquidity).not.toHaveBeenCalled();
});
