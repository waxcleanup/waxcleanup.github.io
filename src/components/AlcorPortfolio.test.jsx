import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AlcorPortfolio from './AlcorPortfolio';
import { fetchAllPositions } from '../services/alcorMainnet';
jest.mock('../services/alcorMainnet', () => ({ fetchAllPositions: jest.fn() }));
jest.mock('./PortfolioLiquidity', () => ({ actor, group }) => <div role="dialog" aria-label="Manage liquidity">{actor} pool {group.poolId}</div>);
const group = { poolId: '0', tokenA: { symbol: 'TLM', contract: 'alien.worlds' }, tokenB: { symbol: 'WAX', contract: 'eosio.token' }, fee: 3000, manageable: false,
  positions: [{ id: '123', amountA: '1.0000 TLM', amountB: '2.00000000 WAX', feesA: '0.0001 TLM', feesB: '0.01000000 WAX', valueUSD: 1, closed: false, inRange: false }] };
const response = { groups: [group, { ...group, poolId: '7', fee: 500, positions: [{ ...group.positions[0], id: '456', closed: true }] }], updatedAt: Date.now() };
beforeEach(() => { jest.resetAllMocks(); fetchAllPositions.mockResolvedValue(response); });
test('shows all pools with non-game assets, separate fee tiers, status filters and search', async () => {
  render(<AlcorPortfolio actor="tester" />);
  expect(await screen.findByText('Position #123')).toBeInTheDocument(); expect(screen.getByText('Position #456')).toBeInTheDocument();
  expect(screen.getByText('Out of range')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'View position on Alcor ↗' })[0]).toHaveAttribute('href', 'https://wax.alcor.exchange/positions/123');
  fireEvent.change(screen.getByLabelText('Show positions'), { target: { value: 'open' } });
  expect(screen.queryByText('Position #456')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search your pools'), { target: { value: 'missingtoken' } });
  expect(screen.getByText('No positions match your search or filter.')).toBeInTheDocument();
});
test('wallet change clears previous holdings and ignores a late response from the old account', async () => {
  let finishOld;
  fetchAllPositions.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; })).mockResolvedValueOnce({ groups: [], updatedAt: Date.now() });
  const view = render(<AlcorPortfolio actor="oldwallet" />); view.rerender(<AlcorPortfolio actor="newwallet" />);
  await screen.findByText('No Alcor liquidity positions found for newwallet.');
  await act(async () => finishOld(response));
  expect(screen.queryByText('Position #123')).not.toBeInTheDocument();
});
test('load failures offer retry instead of claiming there are no positions', async () => {
  fetchAllPositions.mockRejectedValueOnce(new Error('Alcor unavailable'));
  render(<AlcorPortfolio actor="tester" />); await screen.findByText('Alcor unavailable');
  expect(screen.queryByText(/No Alcor liquidity positions found/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry portfolio' }));
  await screen.findByText('Position #123'); expect(fetchAllPositions).toHaveBeenCalledTimes(2);
});
test('list sorts positions by value, fees and newest and preserves large asset digits', async () => {
  fetchAllPositions.mockResolvedValueOnce({ groups: [{ ...group, positions: [
    { ...group.positions[0], id: '100', valueUSD: 50, feesUSD: 2, amountA: '25899730388.351277 TRASH' },
    { ...group.positions[0], id: '200', valueUSD: 20, feesUSD: 4 },
  ] }], updatedAt: Date.now() });
  render(<AlcorPortfolio actor="tester" />);
  await screen.findByText('25,899,730,388.351277 TRASH');
  expect(screen.getAllByRole('article')[0]).toHaveAttribute('aria-label', 'Position 100');
  fireEvent.click(screen.getByRole('button', { name: 'Fees', exact: true }));
  expect(screen.getAllByRole('article')[0]).toHaveAttribute('aria-label', 'Position 200');
  fireEvent.click(screen.getByRole('button', { name: 'Newest', exact: true }));
  expect(screen.getAllByRole('article')[0]).toHaveAttribute('aria-label', 'Position 200');
});
test('non-game pools open internal management and guests connect without passing a click event', async () => {
  const onLogin = jest.fn();
  fetchAllPositions.mockResolvedValueOnce({ groups: [group], updatedAt: Date.now() });
  const view = render(<AlcorPortfolio actor="tester" onLogin={onLogin} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Manage liquidity' })); expect(screen.getByRole('dialog', { name: 'Manage liquidity' })).toHaveTextContent('tester pool 0');
  view.rerender(<AlcorPortfolio actor="" onLogin={onLogin} />);
  await waitFor(() => expect(screen.queryByText('Position #123')).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Connect wallet' })); expect(onLogin).toHaveBeenCalledWith();
});
