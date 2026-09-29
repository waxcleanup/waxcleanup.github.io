import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MarketplacePage from './MarketplacePage';
import { useSession } from '../hooks/SessionContext';
import { getAssetListings, getMarketSales, getOwnedMarketAssets, getMarketSchemas, getMarketFees, getMarketPriceSuggestions, prepareMarketOperation, executeMarketOperation } from '../services/atomicMarketMainnet';
jest.mock('../hooks/SessionContext', () => ({ useSession: jest.fn() }));
jest.mock('../services/atomicMarketMainnet', () => ({ ...jest.requireActual('../services/atomicMarketMainnet'), getAssetListings: jest.fn(), getMarketSales: jest.fn(), getOwnedMarketAssets: jest.fn(), getMarketSchemas: jest.fn(), getMarketFees: jest.fn(), getMarketPriceSuggestions: jest.fn(), prepareMarketOperation: jest.fn(), executeMarketOperation: jest.fn() }));
jest.mock('../hooks/useSession', () => ({ InitTransaction: jest.fn() }));
const sale = require('../../scripts/fixtures/cleanupcentr-sales.json').data[0];
let actor; const login = jest.fn();
beforeEach(() => {
  jest.clearAllMocks(); actor = 'tester';
  useSession.mockImplementation(() => ({ session: actor ? { permissionLevel: { actor } } : null, handleLogin: login }));
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  getAssetListings.mockResolvedValue([]); getMarketSales.mockResolvedValue([sale]); getOwnedMarketAssets.mockResolvedValue(sale.assets);
  getMarketPriceSuggestions.mockResolvedValue({ templateId: '856817', checkedAt: Date.now(), lowest: null, lastSold: null });
  getMarketSchemas.mockResolvedValue([{ schema_name: 'tools' }]); getMarketFees.mockResolvedValue({ collection: .06, maker: .01, taker: .01 });
  prepareMarketOperation.mockResolvedValue({ quantity: '599.00000000 WAX', fees: { collection: .06, maker: .01, taker: .01 }, expiresAt: Date.now() + 120000 });
  executeMarketOperation.mockResolvedValue({ transactionId: 'mock-only' });
});
test('purchase requires separate review and explicit wallet confirmation', async () => {
  render(<MarketplacePage />); fireEvent.click(await screen.findByRole('button', { name: 'View & buy' }));
  fireEvent.click(screen.getByRole('button', { name: 'Review transaction' }));
  await screen.findByRole('heading', { name: 'Review purchase' }); expect(executeMarketOperation).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm in wallet' }));
  await screen.findByText(/Transaction confirmed: mock-only/);
  expect(executeMarketOperation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ kind: 'buy', actor: 'tester', sale }));
});
test('closing purchase does not request wallet and signed-out selling prompts login', async () => {
  const view = render(<MarketplacePage />); fireEvent.click(await screen.findByRole('button', { name: 'View & buy' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close' })); expect(prepareMarketOperation).not.toHaveBeenCalled(); expect(executeMarketOperation).not.toHaveBeenCalled();
  actor = ''; view.rerender(<MarketplacePage />); fireEvent.click(screen.getByRole('button', { name: 'Sell an NFT' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Connect wallet' })); expect(login).toHaveBeenCalledWith(); expect(getOwnedMarketAssets).not.toHaveBeenCalled();
});
test('my listings requests the connected seller and cancels inside the site', async () => {
  actor = sale.seller; render(<MarketplacePage />); fireEvent.click(screen.getByRole('button', { name: 'My listings' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel listing' })); fireEvent.click(screen.getByRole('button', { name: 'Review transaction' }));
  await screen.findByRole('heading', { name: 'Review cancellation' });
  expect(getMarketSales).toHaveBeenCalledWith(expect.objectContaining({ seller: sale.seller }));
  expect(prepareMarketOperation).toHaveBeenCalledWith(expect.objectContaining({ kind: 'cancel', actor: sale.seller }));
});
test('selling reviews entered price and prevents double submission', async () => {
  render(<MarketplacePage />); fireEvent.click(screen.getByRole('button', { name: 'Sell an NFT' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Set sale price' }));
  fireEvent.change(screen.getByLabelText('Sale price in WAX'), { target: { value: '0.00000001' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review transaction' }));
  await screen.findByRole('button', { name: 'Confirm in wallet' });
  expect(prepareMarketOperation).toHaveBeenCalledWith(expect.objectContaining({ kind: 'list', price: '0.00000001' }));
  expect(screen.getByLabelText('Sale price in WAX')).toBeDisabled();
  executeMarketOperation.mockReturnValue(new Promise(() => {}));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm in wallet' }));
  expect(screen.getByRole('button', { name: /Checking/ })).toBeDisabled(); expect(executeMarketOperation).toHaveBeenCalledTimes(1);
});
test('wallet switch dismisses a prepared transaction', async () => {
  const view = render(<MarketplacePage />); fireEvent.click(await screen.findByRole('button', { name: 'View & buy' }));
  fireEvent.click(screen.getByRole('button', { name: 'Review transaction' })); await screen.findByRole('button', { name: 'Confirm in wallet' });
  actor = 'other'; view.rerender(<MarketplacePage />); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(executeMarketOperation).not.toHaveBeenCalled();
});
test('search and pagination query API; stale results do not overwrite a new category', async () => {
  const many = Array.from({ length: 24 }, (_, i) => ({ ...sale, sale_id: String(i + 1) }));
  getMarketSales.mockResolvedValue(many); render(<MarketplacePage />); await screen.findAllByRole('button', { name: 'View & buy' });
  fireEvent.click(screen.getByRole('button', { name: 'Next' })); await waitFor(() => expect(getMarketSales).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })));
  let finishOld; getMarketSales.mockReturnValueOnce(new Promise(resolve => { finishOld = resolve; }));
  fireEvent.change(screen.getByLabelText('Search NFTs'), { target: { value: 'missing' } }); fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
  getMarketSales.mockResolvedValueOnce([]); fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'tools' } });
  await screen.findByText('No matching listings'); await act(async () => finishOld([sale]));
  expect(screen.queryByRole('button', { name: 'View & buy' })).not.toBeInTheDocument();
  expect(getMarketSales).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: 'missing', schema: 'tools' }));
});
test('verification errors stay in dialog and never execute payment', async () => {
  prepareMarketOperation.mockRejectedValueOnce(new Error('The sale changed. Refresh the listing.'));
  render(<MarketplacePage />); fireEvent.click(await screen.findByRole('button', { name: 'View & buy' })); fireEvent.click(screen.getByRole('button', { name: 'Review transaction' }));
  await screen.findByRole('alert'); expect(executeMarketOperation).not.toHaveBeenCalled(); expect(screen.queryByRole('button', { name: 'Confirm in wallet' })).not.toBeInTheDocument();
});

test('pricing suggestions preserve manual input until clicked and freeze during transaction review', async () => {
  let complete;
  getMarketPriceSuggestions.mockReturnValueOnce(new Promise(resolve => { complete = resolve; }));
  render(<MarketplacePage />); fireEvent.click(screen.getByRole('button', { name: 'Sell an NFT' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Set sale price' }));
  fireEvent.change(screen.getByLabelText('Sale price in WAX'), { target: { value: '7' } });
  await act(async () => complete({ templateId: '856817', checkedAt: Date.now(), lowest: { quantity: '12.00000001 WAX', price: '12.00000001' }, lastSold: { quantity: '9.00000003 WAX', price: '9.00000003', at: '2026-09-01T00:00:00Z' } }));
  expect(screen.getByLabelText('Sale price in WAX')).toHaveValue('7');
  fireEvent.click(screen.getByRole('button', { name: 'Use lowest listing' })); expect(screen.getByLabelText('Sale price in WAX')).toHaveValue('12.00000001');
  fireEvent.click(screen.getByRole('button', { name: 'Use last sold price' })); expect(screen.getByLabelText('Sale price in WAX')).toHaveValue('9.00000003');
  expect(executeMarketOperation).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: 'Review transaction' }));
  await screen.findByRole('button', { name: 'Confirm in wallet' });
  expect(screen.getByRole('button', { name: 'Use lowest listing' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Use last sold price' })).toBeDisabled();
});

test('missing comparison data disables autofill but leaves manual selling available', async () => {
  render(<MarketplacePage />); fireEvent.click(screen.getByRole('button', { name: 'Sell an NFT' })); fireEvent.click(await screen.findByRole('button', { name: 'Set sale price' }));
  await screen.findByText('No completed sale found'); expect(screen.getByRole('button', { name: 'Use last sold price' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Sale price in WAX'), { target: { value: '10' } }); expect(screen.getByRole('button', { name: 'Review transaction' })).toBeEnabled();
});


test('already listed inventory opens its existing sale instead of a duplicate listing form', async () => {
  actor = sale.seller;
  getOwnedMarketAssets.mockResolvedValue([{ ...sale.assets[0], sales: [{ ...sale, state: 1 }] }]);
  render(<MarketplacePage />); fireEvent.click(screen.getByRole('button', { name: 'Sell an NFT' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Manage listing' }));
  expect(await screen.findByRole('heading', { name: 'Cancel listing' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Sale price in WAX')).not.toBeInTheDocument();
  expect(executeMarketOperation).not.toHaveBeenCalled();
});


test('confirmed listing blocks relisting while index lags and refreshes when it catches up', async () => {
  let resolveIndex;
  getAssetListings.mockImplementation(() => new Promise(resolve => { resolveIndex = resolve; }));
  render(<MarketplacePage />); fireEvent.click(screen.getByRole('button', { name: 'Sell an NFT' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Set sale price' }));
  fireEvent.change(screen.getByLabelText('Sale price in WAX'), { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review transaction' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Confirm in wallet' }));
  expect(await screen.findByRole('button', { name: 'Listing confirmed · updating…' })).toBeDisabled();
  const before = getOwnedMarketAssets.mock.calls.length;
  getOwnedMarketAssets.mockResolvedValue([{ ...sale.assets[0], sales: [{ ...sale, seller: actor, state: 1 }] }]);
  await act(async () => resolveIndex([{ ...sale, seller: actor, state: 1 }]));
  expect(await screen.findByRole('button', { name: 'Manage listing' })).toBeEnabled();
  expect(getOwnedMarketAssets.mock.calls.length).toBeGreaterThan(before);
  expect(executeMarketOperation).toHaveBeenCalledTimes(1);
});


test('clicking NFT image opens complete details without login or transaction', async () => {
  actor = '';
  const asset = {...sale.assets[0], immutable_data:{Durability:100},mutable_data:{Charges:0},data:{...sale.assets[0].data, LongAttribute:'x'.repeat(150), Enabled:false}};
  getMarketSales.mockResolvedValue([{...sale,assets:[asset]}]);
  render(<MarketplacePage />);
  fireEvent.click(await screen.findByRole('button',{name:/View details for/}));
  expect(await screen.findByRole('heading',{name:'NFT information'})).toBeInTheDocument();
  expect(screen.getByText('Durability')).toBeInTheDocument(); expect(screen.getByText('Charges')).toBeInTheDocument();
  expect(screen.getByText('x'.repeat(150))).toBeInTheDocument();expect(screen.getByText('false')).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'Listing details'})).toBeInTheDocument();
  expect(login).not.toHaveBeenCalled();expect(prepareMarketOperation).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Close NFT details'}));expect(screen.queryByRole('heading',{name:'NFT information'})).not.toBeInTheDocument();
});

test('advanced filters reach the listing query and clear together', async () => {
  render(<MarketplacePage />); await screen.findByRole('button', { name: 'View & buy' });
  fireEvent.change(screen.getByLabelText('Rarity'), { target: { value: 'Rare' } });
  fireEvent.change(screen.getByLabelText('Template ID'), { target: { value: '856817' } });
  fireEvent.change(screen.getByLabelText('Min WAX'), { target: { value: '10' } });
  fireEvent.change(screen.getByLabelText('Max WAX'), { target: { value: '50' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
  await waitFor(() => expect(getMarketSales).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, rarity: 'Rare', template: '856817', minPrice: '10', maxPrice: '50' })));
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  await waitFor(() => expect(getMarketSales).toHaveBeenLastCalledWith(expect.objectContaining({ rarity: '', template: '', minPrice: '', maxPrice: '' })));
});

test('invalid price ranges do not issue a new listing request', async () => {
  render(<MarketplacePage />); await screen.findByRole('button', { name: 'View & buy' });
  const calls = getMarketSales.mock.calls.length;
  fireEvent.change(screen.getByLabelText('Min WAX'), { target: { value: '50' } });
  fireEvent.change(screen.getByLabelText('Max WAX'), { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
  expect(screen.getByRole('alert')).toHaveTextContent('minimum no greater than maximum');
  expect(getMarketSales).toHaveBeenCalledTimes(calls);
});

test('buyers can compare prices without submitting a transaction', async () => {
  render(<MarketplacePage />); fireEvent.click(await screen.findByRole('button', { name: 'View & buy' }));
  expect(await screen.findByRole('heading', { name: 'Compare prices' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Use lowest listing' })).not.toBeInTheDocument();
  expect(prepareMarketOperation).not.toHaveBeenCalled();
});

test('listing review shows estimated proceeds after the verified base fees', async () => {
  render(<MarketplacePage />); fireEvent.click(screen.getByRole('button', { name: 'Sell an NFT' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Set sale price' }));
  fireEvent.change(screen.getByLabelText('Sale price in WAX'), { target: { value: '599' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review transaction' }));
  expect(await screen.findByText('551.08000000 WAX')).toBeInTheDocument();
  expect(executeMarketOperation).not.toHaveBeenCalled();
});
