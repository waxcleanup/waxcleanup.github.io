import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExchangePage from './ExchangePage';
import { TOKENS } from '../services/exchangeMath';
import { fetchRouteQuote, executeRouteReview, fetchPools, fetchPool, fetchQuote, fetchBalances, fetchPositions, fetchHistory, executeReview } from '../services/alcorMainnet';

let mockActor = 'testaccount1';
const mockLogin = jest.fn();
jest.mock('../hooks/SessionContext', () => ({ useSession: () => ({ session: mockActor ? { permissionLevel: { actor: mockActor } } : null, handleLogin: mockLogin }) }));
jest.mock('../services/alcorMainnet', () => ({ fetchRouteQuote: jest.fn(), executeRouteReview: jest.fn(), fetchPools: jest.fn(), fetchPool: jest.fn(), fetchQuote: jest.fn(), fetchBalances: jest.fn(), fetchPositions: jest.fn(), fetchPositionQuote: jest.fn(), executeReview: jest.fn(), fetchHistory: jest.fn() }));
const [wax, cinder] = TOKENS;
beforeEach(() => {
  jest.clearAllMocks(); mockActor = 'testaccount1';
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  fetchPools.mockResolvedValue([{ id: '5113', tokenA: cinder, tokenB: wax, fee: 3000, funded: true }]);
  fetchPool.mockResolvedValue({ id: 5113, active: 1, tokenA: { quantity: '100.000000 CINDER', contract: 'cleanuptoken' }, tokenB: { quantity: '100.00000000 WAX', contract: 'eosio.token' } });
  fetchBalances.mockResolvedValue({ wax: '10000000000', cinder: '100000000' });
  fetchPositions.mockResolvedValue([]); fetchHistory.mockResolvedValue([]);
  fetchQuote.mockImplementation(async p => { const createdAt = Date.now(); return { ...p, network: 'wax-mainnet', tokenA: cinder, tokenB: wax, poolId: '5113', fee: 3000,
    inputRaw: '100000000', outputToken: cinder, outputRaw: '4700000', minimum: '4676500', impactBps: 35, createdAt, expiresAt: createdAt + 30000 }; });
});
async function renderQuote() {
  const view = render(<ExchangePage />);
  await screen.findByText('● Verified on WAX mainnet');
  fireEvent.change(screen.getByRole('textbox', { name: 'WAX amount' }), { target: { value: '1' } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Review swap' })).toBeEnabled());
  return view;
}
test('swap requires explicit review before wallet submission; backing out submits nothing', async () => {
  await renderQuote();
  fireEvent.click(screen.getByRole('button', { name: 'Review swap' }));
  const dialog = screen.getByRole('dialog', { name: 'Review swap' });
  expect(within(dialog).getByText('4.676500 CINDER')).toBeInTheDocument();
  expect(executeReview).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Back' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(executeReview).not.toHaveBeenCalled();
});
test('edited amounts immediately disable stale quotes and a wallet change dismisses review', async () => {
  const view = await renderQuote();
  fireEvent.click(screen.getByRole('button', { name: 'Review swap' }));
  mockActor = 'different123'; view.rerender(<ExchangePage />);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  fireEvent.change(screen.getByRole('textbox', { name: 'WAX amount' }), { target: { value: '2' } });
  expect(screen.queryByText('4.700000')).not.toBeInTheDocument(); expect(executeReview).not.toHaveBeenCalled();
});
test('insufficient balance prevents review and quote errors remain visible', async () => {
  fetchBalances.mockResolvedValue({ wax: '0', cinder: '0' });
  render(<ExchangePage />); await screen.findByText('● Verified on WAX mainnet');
  fireEvent.change(screen.getByRole('textbox', { name: 'WAX amount' }), { target: { value: '1' } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Insufficient WAX balance' })).toBeDisabled());
  fireEvent.change(screen.getByRole('textbox', { name: 'WAX amount' }), { target: { value: '1e8' } });
  expect(await screen.findByText('Enter a decimal WAX amount.')).toBeInTheDocument();
  expect(executeReview).not.toHaveBeenCalled();
});
test('visitors can browse pools and positions prompt connection without submitting', async () => {
  mockActor = ''; render(<ExchangePage />); await screen.findByText('● Verified on WAX mainnet');
  fireEvent.click(screen.getByRole('button', { name: 'Liquidity', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Selected pool' }));
  fireEvent.click(screen.getByRole('button', { name: 'Connect wallet' }));
  expect(mockLogin).toHaveBeenCalledTimes(1); expect(fetchPositions).not.toHaveBeenCalled(); expect(executeReview).not.toHaveBeenCalled();
});
test('both token dropdowns show exact connected-wallet balances including zero', async () => {
  fetchBalances.mockResolvedValue({ wax: '123456789', cinder: '0', trash: '1001', tomatoe: null, bananaz: '100000000' });
  render(<ExchangePage />);
  await waitFor(() => expect(within(screen.getByRole('combobox', { name: 'From asset' })).getByRole('option', { name: 'WAX · 1.23456789' })).toBeInTheDocument());
  for (const label of ['From asset', 'To asset']) {
    const list = within(screen.getByRole('combobox', { name: label }));
    expect(list.getByRole('option', { name: 'CINDER · 0.000000' })).toBeInTheDocument();
    expect(list.getByRole('option', { name: 'TRASH · 1.001' })).toBeInTheDocument();
    expect(list.getByRole('option', { name: 'TOMATOE · balance loading / unavailable' })).toBeInTheDocument();
  }
});

test('amount field inserts a missing leading zero before requesting a quote', async () => {
  render(<ExchangePage />);
  await screen.findByText('● Verified on WAX mainnet');
  const input = screen.getByRole('textbox', { name: 'WAX amount' });
  fireEvent.change(input, { target: { value: '.' } });
  expect(input).toHaveValue('0.');
  fireEvent.change(input, { target: { value: '.24333619' } });
  expect(input).toHaveValue('0.24333619');
  await waitFor(() => expect(fetchQuote).toHaveBeenCalledWith(expect.objectContaining({ amount: '0.24333619' })));
  expect(screen.queryByText('Enter a decimal WAX amount.')).not.toBeInTheDocument();
  expect(executeReview).not.toHaveBeenCalled();
});

test('game token shortcuts clear previous amounts and quotes without trading', async () => {
  await renderQuote();
  fireEvent.click(screen.getByRole('button', { name: 'Get TRASH' }));
  expect(screen.getByRole('combobox', { name: 'From asset' })).toHaveValue('wax');
  expect(screen.getByRole('combobox', { name: 'To asset' })).toHaveValue('trash');
  expect(screen.getByRole('textbox', { name: 'WAX amount' })).toHaveValue('');
  expect(screen.queryByText('4.700000')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Review swap' })).toBeDisabled();
  expect(executeReview).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Get CINDER' }));
  expect(screen.getByRole('combobox', { name: 'To asset' })).toHaveValue('cinder');
});


test('auto routing works without a direct pool and changing routing invalidates review', async()=>{
 const usd=TOKENS[5];
 fetchPools.mockResolvedValue([]);
 fetchBalances.mockResolvedValue({wax:'10000000000',cinder:'10000000',waxusdc:'0'});
 fetchRouteQuote.mockImplementation(async p=>{
  const createdAt=Date.now();
  const h=(poolId,inputToken,outputToken,inputRaw,outputRaw)=>({network:'wax-mainnet',kind:'swap',actor:mockActor,poolId,tokenA:inputToken,tokenB:outputToken,inputToken,outputToken,inputRaw,outputRaw,minimum:'1',slippageBps:50,createdAt,expiresAt:createdAt+30000,fee:3000,impactBps:30});
  const hops=[h('1',cinder,wax,'1000000','100000000'),h('2',wax,usd,'100000000','6000')];
  return {...hops[0],poolId:'auto',tokenB:usd,outputToken:usd,outputRaw:'6000',minimum:'5970',route:['1','2'],hops,coverage:{quoted:1,total:1}};
 });
 render(<ExchangePage/>);
 fireEvent.change(screen.getByLabelText('From asset'),{target:{value:'cinder'}});
 fireEvent.change(screen.getByLabelText('To asset'),{target:{value:'waxusdc'}});
 fireEvent.change(screen.getByLabelText('Swap routing'),{target:{value:'auto'}});
 fireEvent.change(screen.getByRole('textbox',{name:'CINDER amount'}),{target:{value:'1'}});
 await waitFor(()=>expect(screen.getByRole('button',{name:'Review swap'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Review swap'}));
 expect(screen.getByRole('dialog')).toHaveTextContent('CINDER → WAX → WAXUSDC');
 expect(executeRouteReview).not.toHaveBeenCalled();
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Back'}));
 fireEvent.change(screen.getByLabelText('Swap routing'),{target:{value:'direct'}});
 expect(screen.getByRole('button',{name:'Review swap'})).toBeDisabled();
 expect(executeReview).not.toHaveBeenCalled();
});