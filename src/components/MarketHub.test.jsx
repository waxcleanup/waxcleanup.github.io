import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import MarketHub, { MarketRedirect } from './MarketHub';
import { useSession } from '../hooks/SessionContext';
jest.mock('../hooks/SessionContext', () => ({ useSession: jest.fn() }));
jest.mock('./ShopPage', () => ({ __esModule: true, default: () => <div>Official shop content</div> }));
jest.mock('./MarketplacePage', () => ({ __esModule: true, default: () => <div>Player listing content</div> }));
jest.mock('./RecipesPage', () => ({ __esModule: true, default: () => <div>Wallet blend content</div> }));
const login = jest.fn();
function Location() { const location = useLocation(); const navigate = useNavigate(); return <><span data-testid="location">{location.pathname}{location.search}{location.hash}</span><button onClick={() => navigate(-1)}>Browser back</button></>; }
function renderHub(path) { return render(<MemoryRouter initialEntries={[path]}><Location /><Routes><Route path="/market/*" element={<MarketHub />} />{[['shop','shop'],['marketplace','listings'],['recipes','blends']].map(([old,section]) => <Route key={old} path={`/${old}`} element={<MarketRedirect section={section} />} />)}</Routes></MemoryRouter>); }
beforeEach(() => { jest.clearAllMocks(); useSession.mockReturnValue({ session: null, loading: false, handleLogin: login }); });
test.each([['shop','shop','Official shop content'],['marketplace','listings','Player listing content'],['recipes','blends','Connect to view your blends']])('legacy %s link preserves its query and hash', async (old, section, content) => {
  renderHub(`/${old}?source=bookmark#details`);
  expect(await screen.findByText(content)).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent(`/market/${section}?source=bookmark#details`);
});
test('tabs mount the right content, highlight selection, and support browser back', async () => {
  renderHub('/market'); await screen.findByText('Official shop content');
  fireEvent.click(screen.getByRole('link', { name: /Player Marketplace/ }));
  expect(await screen.findByText('Player listing content')).toBeInTheDocument();
  expect(screen.queryByText('Official shop content')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Player Marketplace/ })).toHaveAttribute('aria-current','page');
  fireEvent.click(screen.getByRole('button', {name:'Browser back'}));
  expect(await screen.findByText('Official shop content')).toBeInTheDocument();
});
test('blends request connection in place and mount only after session restoration', async () => {
  const view = renderHub('/market/blends');
  fireEvent.click(screen.getByRole('button', {name:'Connect wallet'})); expect(login).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Wallet blend content')).not.toBeInTheDocument();
  useSession.mockReturnValue({session:{permissionLevel:{actor:'tester'}},loading:false,handleLogin:login});
  view.rerender(<MemoryRouter initialEntries={['/market/blends']}><Routes><Route path="/market/*" element={<MarketHub />} /></Routes></MemoryRouter>);
  expect(await screen.findByText('Wallet blend content')).toBeInTheDocument();
});
test('blends wait while a session is being restored', () => {
  useSession.mockReturnValue({session:null,loading:true,handleLogin:login}); renderHub('/market/blends');
  expect(screen.getByRole('status')).toHaveTextContent('Restoring'); expect(screen.queryByRole('button',{name:'Connect wallet'})).not.toBeInTheDocument();
});

