/* global BigInt */
import { getHealthyWaxMainnetEndpoint } from './waxMainnetEndpoints';
import { parseChainJson } from './exchangeMath';
import { buildContractAction } from './contractKit';
import { InitTransaction } from '../hooks/useSession';

export const COLLECTION = 'cleanupcentr';
export const MARKETPLACE_NAME = 'cleanupcentr';
const MARKET = 'atomicmarket';
const ASSETS = 'atomicassets';
const APIS = ['https://wax.api.atomicassets.io', 'https://atomic-api.wax.cryptolions.io'];
export const PAGE_SIZE = 24;
const actorName = value => {
  const actor = String(value || '');
  if (!/^[a-z1-5.]{1,12}$/.test(actor)) throw new Error('Connect a WAX mainnet wallet.');
  return actor;
};
const idOf = value => {
  const id = String(value ?? '');
  if (!/^[1-9]\d*$/.test(id) || BigInt(id) > 18446744073709551615n) throw new Error('Invalid NFT or sale ID.');
  return id;
};
export function waxQuantity(value) {
  const match = /^(\d+)(?:\.(\d{1,8}))?$/.exec(String(value || '').trim());
  if (!match) throw new Error('Enter a WAX price with up to 8 decimal places.');
  const raw = BigInt(match[1]) * 100000000n + BigInt((match[2] || '').padEnd(8, '0'));
  if (raw <= 0n || raw >= (1n << 62n)) throw new Error('Price is outside the supported WAX range.');
  return `${raw / 100000000n}.${String(raw % 100000000n).padStart(8, '0')} WAX`;
}
export function salePrice(sale) {
  const p = sale?.price;
  if (p?.token_contract !== 'eosio.token' || p?.token_symbol !== 'WAX' || Number(p?.token_precision) !== 8 || !/^\d+$/.test(String(p?.amount))) throw new Error('Only direct WAX-priced sales are supported.');
  const raw = BigInt(p.amount);
  return waxQuantity(`${raw / 100000000n}.${String(raw % 100000000n).padStart(8, '0')}`);
}
export function supportedSale(sale) {
  try {
    salePrice(sale);
    return sale.market_contract === MARKET && sale.assets_contract === ASSETS && sale.collection_name === COLLECTION && sale.listing_symbol === 'WAX' && String(sale.listing_price) === String(sale.price.amount) && sale.assets?.length === 1 && sale.assets[0]?.collection?.collection_name === COLLECTION;
  } catch { return false; }
}
async function read(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`Marketplace request failed (${response.status}).`);
    return parseChainJson(await response.text());
  } finally { clearTimeout(timeout); }
}
async function api(path, params) {
  let error;
  for (const base of APIS) {
    try {
      const result = await read(`${base}${path}?${new URLSearchParams(params)}`);
      if (!result.success || !Array.isArray(result.data)) throw new Error('Marketplace index is unavailable.');
      return result.data;
    } catch (e) { error = e; }
  }
  throw error;
}
function assetFilters({ search = '', schema = '', rarity = '', template = '' }) {
  return { ...(search ? { match: search } : {}), ...(schema ? { schema_name: schema } : {}), ...(rarity ? { 'data.Rarity': rarity } : {}), ...(template ? { template_id: idOf(template) } : {}) };
}
export function getMarketSales({ seller = '', page = 1, search = '', schema = '', rarity = '', template = '', minPrice = '', maxPrice = '', sort = 'created', order = 'desc' } = {}) {
  return api('/atomicmarket/v2/sales', { collection_name: COLLECTION, state: seller ? '0,1' : '1', symbol: 'WAX', page, limit: PAGE_SIZE, sort, order, ...(seller ? { seller: actorName(seller) } : {}), ...assetFilters({ search, schema, rarity, template }), ...(minPrice ? { min_price: waxQuantity(minPrice).split(' ')[0] } : {}), ...(maxPrice ? { max_price: waxQuantity(maxPrice).split(' ')[0] } : {}) });
}
// AtomicAssets inventory does not reliably include AtomicMarket sale metadata.
// Join against live sale rows, including announcements awaiting an offer.
export async function getAssetListings(owner, assetIds) {
  const seller = actorName(owner);
  const ids = new Set(assetIds.map(idOf));
  if (!ids.size) return [];
  const found = new Map();
  for (let page = 1; page <= 20; page++) {
    const rows = await api('/atomicmarket/v1/sales', { collection_name: COLLECTION, seller, asset_id: [...ids].join(','), state: '0,1', page, limit: 100, sort: 'created', order: 'desc' });
    for (const sale of rows) {
      if (sale.seller === seller && [0, 1].includes(Number(sale.state)) && sale.assets?.some(a => ids.has(String(a.asset_id)))) found.set(String(sale.sale_id), sale);
    }
    if (rows.length < 100) return [...found.values()];
  }
  throw new Error('Could not finish checking existing listings. Refresh before listing this NFT.');
}
export async function getOwnedMarketAssets(owner, { page = 1, search = '', schema = '', rarity = '', template = '' } = {}) {
  const assets = await api('/atomicassets/v1/assets', { owner: actorName(owner), collection_name: COLLECTION, page, limit: PAGE_SIZE, order: 'desc', sort: 'asset_id', ...assetFilters({ search, schema, rarity, template }) });
  const sales = await getAssetListings(owner, assets.map(a => a.asset_id));
  return assets.map(asset => ({ ...asset, sales: sales.filter(sale => sale.assets.some(a => String(a.asset_id) === String(asset.asset_id))) }));
}
export function getMarketSchemas() {
  return api('/atomicassets/v1/schemas', { collection_name: COLLECTION, limit: 100 });
}
export async function getMarketPriceSuggestions(asset) {
  const templateId = String(asset?.template?.template_id ?? asset?.template_id ?? '');
  if (!/^\d+$/.test(templateId) || asset?.collection?.collection_name !== COLLECTION) {
    return { templateId: '', lowest: null, lastSold: null, unavailable: 'No comparable template is available for this NFT.' };
  }
  const common = { collection_name: COLLECTION, template_id: templateId, symbol: 'WAX', min_assets: 1, max_assets: 1, page: 1, limit: 1 };
  const queries = [{ key: 'lowest', state: 1, sort: 'price', order: 'asc' }, { key: 'lastSold', state: 3, sort: 'updated', order: 'desc' }];
  const results = await Promise.allSettled(queries.map(async ({ state, sort, order }) => {
    const rows = await api('/atomicmarket/v2/sales', { ...common, state, sort, order });
    if (!rows.length) return null;
    const sale = rows[0];
    // Never offer a bundle's total, an oracle quote, or another template's
    // price as the unit price of the NFT the user is listing.
    if (!supportedSale(sale) || Number(sale.state) !== state || String(sale.assets[0]?.template?.template_id ?? sale.assets[0]?.template_id) !== templateId) throw new Error('No verified comparable WAX price is available.');
    const quantity = salePrice(sale);
    const timestamp = Number(sale.updated_at_time);
    return { quantity, price: quantity.split(' ')[0], saleId: String(sale.sale_id), at: Number.isFinite(timestamp) && timestamp > 0 && timestamp <= 8640000000000000 ? new Date(timestamp).toISOString() : null };
  }));
  const output = { templateId, checkedAt: Date.now() };
  results.forEach((result, i) => {
    const key = queries[i].key;
    output[key] = result.status === 'fulfilled' ? result.value : null;
    if (result.status === 'rejected') output[`${key}Error`] = 'Price data is temporarily unavailable.';
  });
  return output;
}
async function rpc(path, body) {
  const endpoint = await getHealthyWaxMainnetEndpoint();
  return read(`${endpoint}/v1/chain/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
async function row(code, scope, table, key, field) {
  const result = await rpc('get_table_rows', { json: true, code, scope, table, limit: 1, ...(key === undefined ? {} : { lower_bound: String(key) }) });
  const entry = result.rows?.[0];
  if (!entry || (field && String(entry[field]) !== String(key))) throw new Error('This NFT or listing is no longer available. Refresh and try again.');
  return entry;
}
export async function getMarketFees() {
  const [config, collection] = await Promise.all([row(MARKET, MARKET, 'config'), row(ASSETS, ASSETS, 'collections', COLLECTION, 'collection_name')]);
  if (config.atomicassets_account !== ASSETS || !config.supported_tokens?.some(t => t.token_contract === 'eosio.token' && t.token_symbol === '8,WAX')) throw new Error('Unexpected marketplace configuration.');
  const fees = { collection: Number(collection.market_fee), maker: Number(config.maker_market_fee), taker: Number(config.taker_market_fee) };
  if (Object.values(fees).some(f => !Number.isFinite(f) || f < 0 || f >= 1)) throw new Error('Invalid marketplace fees.');
  return fees;
}
async function ownedAsset(owner, id) {
  const asset = await row(ASSETS, owner, 'assets', idOf(id), 'asset_id');
  if (asset.collection_name !== COLLECTION) throw new Error('Only CleanupCentr NFTs can be traded here.');
  if (Number(asset.template_id) >= 0) {
    const template = await row(ASSETS, COLLECTION, 'templates', asset.template_id, 'template_id');
    if (!template.transferable) throw new Error('This NFT is not transferable.');
  }
  return asset;
}
const action = (account, name, data) => ({ account, name, data });
export async function prepareMarketOperation(params) {
  const { kind, sale, asset, price } = params;
  const actor = actorName(params.actor);
  const fees = await getMarketFees();
  const registration = await row(MARKET, MARKET, 'marketplaces', MARKETPLACE_NAME, 'marketplace_name');
  if (registration.creator !== MARKETPLACE_NAME) throw new Error('Unexpected marketplace fee recipient.');
  let actions, quantity, assetId;
  if (kind === 'list') {
    assetId = idOf(asset?.asset_id);
    await ownedAsset(actor, assetId);
    const existing = await getAssetListings(actor, [assetId]);
    if (existing.length) {
      const error = new Error(`This NFT is already listed (sale #${existing[0].sale_id}). Manage the existing listing instead.`);
      error.existingSale = existing[0];
      throw error;
    }
    quantity = waxQuantity(price);
    // Require the verified mainnet registration before attributing marketplace fees.
    actions = [action(MARKET, 'announcesale', { seller: actor, asset_ids: [assetId], listing_price: quantity, settlement_symbol: '8,WAX', maker_marketplace: MARKETPLACE_NAME }), action(ASSETS, 'createoffer', { sender: actor, recipient: MARKET, sender_asset_ids: [assetId], recipient_asset_ids: [], memo: 'sale' })];
  } else if (kind === 'buy' || kind === 'cancel') {
    if (!supportedSale(sale)) throw new Error('This listing is not a supported single-NFT WAX sale.');
    const saleId = idOf(sale.sale_id);
    assetId = idOf(sale.assets[0].asset_id);
    quantity = salePrice(sale);
    const live = await row(MARKET, MARKET, 'sales', saleId, 'sale_id');
    if (live.seller !== sale.seller || live.collection_name !== COLLECTION || live.listing_price !== quantity || live.settlement_symbol !== '8,WAX' || live.asset_ids?.length !== 1 || String(live.asset_ids[0]) !== assetId) throw new Error('The sale changed. Refresh the listing before continuing.');
    if (kind === 'cancel') {
      if (live.seller !== actor) throw new Error('Only the seller can cancel this listing.');
      actions = [action(MARKET, 'cancelsale', { sale_id: saleId })];
    } else {
      if (live.seller === actor) throw new Error('You cannot buy your own listing.');
      const offer = await row(ASSETS, ASSETS, 'offers', live.offer_id, 'offer_id');
      if (offer.sender !== live.seller || offer.recipient !== MARKET || offer.sender_asset_ids?.length !== 1 || String(offer.sender_asset_ids[0]) !== assetId || offer.recipient_asset_ids?.length !== 0) throw new Error('The NFT offer changed. Refresh before purchasing.');
      await ownedAsset(live.seller, assetId);
      const balances = await rpc('get_currency_balance', { code: 'eosio.token', account: actor, symbol: 'WAX' });
      const raw = q => BigInt(q.split(' ')[0].replace('.', ''));
      if (!balances.length || raw(balances[0]) < raw(quantity)) throw new Error('Insufficient WAX balance for this purchase.');
      actions = [action(MARKET, 'assertsale', { sale_id: saleId, asset_ids_to_assert: [assetId], listing_price_to_assert: quantity, settlement_symbol_to_assert: '8,WAX' }), action('eosio.token', 'transfer', { from: actor, to: MARKET, quantity, memo: 'deposit' }), action(MARKET, 'purchasesale', { buyer: actor, sale_id: saleId, intended_delphi_median: '0', taker_marketplace: MARKETPLACE_NAME })];
    }
    // Existing sales retain the collection royalty captured at listing time.
    fees.collection = Number(live.collection_fee);
  } else { throw new Error('Unsupported marketplace operation.'); }
  if (!Number.isFinite(fees.collection) || fees.collection < 0 || Object.values(fees).reduce((a, b) => a + b, 0) >= 1) throw new Error('Invalid marketplace fees.');
  return { actor, kind, assetId, quantity, fees, actions, expiresAt: Date.now() + 120000 };
}
export async function executeMarketOperation(review, params) {
  if (review.actor !== params.actor || Date.now() >= review.expiresAt) throw new Error('This review expired or the wallet changed. Review again.');
  const fresh = await prepareMarketOperation(params);
  if (JSON.stringify(fresh.actions) !== JSON.stringify(review.actions) || JSON.stringify(fresh.fees) !== JSON.stringify(review.fees)) throw new Error('Listing terms or fees changed. Review again.');
  const actions = await Promise.all(fresh.actions.map(a => buildContractAction(a.account, a.name, a.data)));
  return InitTransaction({ actions, expectedActor: review.actor, validUntil: review.expiresAt });
}
