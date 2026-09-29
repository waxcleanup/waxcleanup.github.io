const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('@babel/core');
const { ABI, Serializer } = require('@wharfkit/antelope');
const sale = require('./fixtures/cleanupcentr-sales.json').data[0];
const abis = { atomicmarket: require('./fixtures/atomicmarket-mainnet.json').abi, atomicassets: require('./fixtures/atomicassets-mainnet.json').abi, 'eosio.token': require('./fixtures/eosio.token-abi.json') };
let sent, requests, mutate, balance;
function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '../src/services', file + '.js');
  const code = transformSync(fs.readFileSync(filename, 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const mod = { exports: {} };
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename })(id => mocks[id] || require(id), mod, mod.exports);
  return mod.exports;
}
const math = load('exchangeMath');
function checkAbi(a) {
  const abi = ABI.from(abis[a.account]);
  const type = abi.actions.find(x => String(x.name) === a.name).type;
  Serializer.encode({ abi, type, object: a.data });
  return a;
}
const service = load('atomicMarketMainnet', {
  './exchangeMath': math,
  './waxMainnetEndpoints': { getHealthyWaxMainnetEndpoint: async () => 'https://verified-mainnet.invalid' },
  './contractKit': { buildContractAction: async (account, name, data) => checkAbi({ account, name, data }) },
  '../hooks/useSession': { InitTransaction: async p => { sent = p; return { transactionId: 'mock-not-broadcast' }; } },
});
test.beforeEach(() => {
  sent = null; requests = []; mutate = x => x; balance = '1000.00000000 WAX';
  global.fetch = async (url, options = {}) => {
    const body = JSON.parse(options.body || '{}'); requests.push({ url, body });
    let result;
    if (url.includes('/get_currency_balance')) result = [balance];
    else if (url.includes('/get_table_rows')) {
      let entry;
      switch (body.table) {
        case 'marketplaces': entry = { marketplace_name: 'cleanupcentr', creator: 'cleanupcentr' }; break;
        case 'config': entry = { atomicassets_account: 'atomicassets', supported_tokens: [{ token_contract: 'eosio.token', token_symbol: '8,WAX' }], maker_market_fee: '0.01', taker_market_fee: '0.01' }; break;
        case 'collections': entry = { collection_name: 'cleanupcentr', market_fee: '0.06' }; break;
        case 'assets': entry = { asset_id: sale.assets[0].asset_id, collection_name: 'cleanupcentr', template_id: '856817' }; break;
        case 'templates': entry = { template_id: '856817', transferable: true }; break;
        case 'sales': entry = { sale_id: sale.sale_id, seller: sale.seller, collection_name: 'cleanupcentr', asset_ids: [sale.assets[0].asset_id], listing_price: '599.00000000 WAX', settlement_symbol: '8,WAX', offer_id: sale.offer_id, collection_fee: '0.06' }; break;
        case 'offers': entry = { offer_id: sale.offer_id, sender: sale.seller, recipient: 'atomicmarket', sender_asset_ids: [sale.assets[0].asset_id], recipient_asset_ids: [] }; break;
        default: throw new Error(body.table);
      }
      const changed = mutate(entry, body); result = { rows: changed ? [changed] : [] };
    } else result = { success: true, data: [sale] };
    return { ok: true, text: async () => JSON.stringify(result) };
  };
});
const buy = () => ({ actor: 'tester', kind: 'buy', sale });
const list = () => ({ actor: 'tester', kind: 'list', asset: sale.assets[0], price: '0.00000001' });
test('exact WAX quantities retain eight decimals and reject invalid or excessive prices', () => {
  assert.equal(service.waxQuantity('90071992.54740993'), '90071992.54740993 WAX');
  assert.equal(service.waxQuantity('0.00000001'), '0.00000001 WAX');
  for (const p of ['0', '-1', '1e2', '1.000000001', '46116860184.27387904']) assert.throws(() => service.waxQuantity(p));
});
test('mainnet purchase pins exact sale before payment and purchase; validates all payloads against live ABI fixtures', async () => {
  const review = await service.prepareMarketOperation(buy());
  assert.equal(sent, null);
  assert.deepEqual(review.actions.map(a => a.name), ['assertsale', 'transfer', 'purchasesale']);
  await service.executeMarketOperation(review, buy());
  assert.equal(sent.expectedActor, 'tester'); assert.equal(sent.validUntil, review.expiresAt);
  assert.equal(sent.actions[1].data.quantity, '599.00000000 WAX');
  assert.equal(sent.actions[2].data.taker_marketplace, 'cleanupcentr');
});
test('listing creates sale plus offer atomically without sending the NFT to escrow', async () => {
  const review = await service.prepareMarketOperation(list()); await service.executeMarketOperation(review, list());
  assert.deepEqual(sent.actions.map(a => a.name), ['announcesale', 'createoffer']);
  assert.equal(sent.actions[0].data.maker_marketplace, 'cleanupcentr'); assert.equal(sent.actions[1].data.recipient, 'atomicmarket');
});
test('seller can cancel; another wallet cannot', async () => {
  const params = { actor: sale.seller, kind: 'cancel', sale };
  const review = await service.prepareMarketOperation(params); await service.executeMarketOperation(review, params);
  assert.deepEqual(sent.actions.map(a => a.name), ['cancelsale']); sent = null;
  await assert.rejects(service.prepareMarketOperation({ ...params, actor: 'tester' }), /Only the seller/); assert.equal(sent, null);
});
test('changed sale, removed offer, wrong owner, and nontransferable NFTs never reach wallet', async () => {
  mutate = (r, b) => b.table === 'sales' ? { ...r, listing_price: '600.00000000 WAX' } : r;
  await assert.rejects(service.prepareMarketOperation(buy()), /sale changed/);
  mutate = (r, b) => b.table === 'offers' ? null : r;
  await assert.rejects(service.prepareMarketOperation(buy()), /no longer available/);
  mutate = (r, b) => b.table === 'assets' ? null : r;
  await assert.rejects(service.prepareMarketOperation(list()), /no longer available/);
  mutate = (r, b) => b.table === 'templates' ? { ...r, transferable: false } : r;
  await assert.rejects(service.prepareMarketOperation(list()), /not transferable/); assert.equal(sent, null);
});
test('rejects wrong token contract, collection, bundle, USD listing, or self purchase', async () => {
  for (const changed of [{ ...sale, price: { ...sale.price, token_contract: 'fake.token' } }, { ...sale, collection_name: 'other' }, { ...sale, assets: [...sale.assets, ...sale.assets] }, { ...sale, listing_symbol: 'USD' }]) {
    await assert.rejects(service.prepareMarketOperation({ ...buy(), sale: changed }), /not a supported/);
  }
  await assert.rejects(service.prepareMarketOperation({ ...buy(), actor: sale.seller }), /own listing/);
  assert.equal(sent, null);
});
test('insufficient balance, expired review, changed wallet, fees and listing amount reject before signing', async () => {
  balance = '1.00000000 WAX'; await assert.rejects(service.prepareMarketOperation(buy()), /Insufficient/);
  const review = await service.prepareMarketOperation(list());
  await assert.rejects(service.executeMarketOperation({ ...review, expiresAt: 1 }, list()), /expired/);
  await assert.rejects(service.executeMarketOperation(review, { ...list(), actor: 'other' }), /wallet changed/);
  await assert.rejects(service.executeMarketOperation(review, { ...list(), price: '2' }), /terms or fees changed/);
  mutate = (r, b) => b.table === 'collections' ? { ...r, market_fee: '0.07' } : r;
  await assert.rejects(service.executeMarketOperation(review, list()), /terms or fees changed/); assert.equal(sent, null);
});
test('queries page and seller server-side so My listings is not limited to browse page', async () => {
  await service.getMarketSales({ seller: 'tester', page: 3, schema: 'tools', search: 'Eco', sort: 'price', order: 'asc' });
  const q = new URL(requests[0].url).searchParams;
  assert.equal(q.get('seller'), 'tester'); assert.equal(q.get('page'), '3'); assert.equal(q.get('schema_name'), 'tools'); assert.equal(q.get('collection_name'), 'cleanupcentr');
});

test('unregistered marketplace or unexpected fee recipient blocks signing', async () => {
  mutate = (r, b) => b.table === 'marketplaces' ? null : r;
  await assert.rejects(service.prepareMarketOperation(list()), /no longer available/);
  mutate = (r, b) => b.table === 'marketplaces' ? { ...r, creator: 'other' } : r;
  await assert.rejects(service.prepareMarketOperation(buy()), /Unexpected marketplace fee recipient/);
  assert.equal(sent, null);
});

test('suggestions query lowest active and latest sold for exact template, preserving raw precision', async () => {
  const urls = [];
  global.fetch = async url => {
    const q = new URL(url).searchParams; urls.push(q);
    const item = { ...sale, state: Number(q.get('state')), price: { ...sale.price, amount: '1200000001' }, listing_price: '1200000001', updated_at_time: '1789517167500' };
    return { ok: true, text: async () => JSON.stringify({ success: true, data: [item] }) };
  };
  const result = await service.getMarketPriceSuggestions(sale.assets[0]);
  assert.equal(result.lowest.price, '12.00000001'); assert.equal(result.lastSold.quantity, '12.00000001 WAX');
  assert.deepEqual(urls.map(q => [q.get('state'), q.get('sort'), q.get('order')]), [['1', 'price', 'asc'], ['3', 'updated', 'desc']]);
  for (const q of urls) { assert.equal(q.get('template_id'), sale.assets[0].template.template_id); assert.equal(q.get('max_assets'), '1'); assert.equal(q.get('collection_name'), 'cleanupcentr'); }
  assert.equal(sent, null);
});

test('suggestions reject wrong-template or bundle prices and retain independent successful data', async () => {
  global.fetch = async url => {
    const state = Number(new URL(url).searchParams.get('state'));
    const item = { ...sale, state, assets: state === 1 ? [...sale.assets, ...sale.assets] : sale.assets };
    return { ok: true, text: async () => JSON.stringify({ success: true, data: [item] }) };
  };
  let result = await service.getMarketPriceSuggestions(sale.assets[0]);
  assert.equal(result.lowest, null); assert.ok(result.lowestError); assert.ok(result.lastSold);
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ success: true, data: [{ ...sale, assets: [{ ...sale.assets[0], template: { template_id: '999' } }] }] }) });
  result = await service.getMarketPriceSuggestions(sale.assets[0]); assert.equal(result.lowest, null); assert.equal(result.lastSold, null);
});

test('empty history and untemplated assets never invent suggested prices', async () => {
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ success: true, data: [] }) });
  const result = await service.getMarketPriceSuggestions(sale.assets[0]); assert.equal(result.lowest, null); assert.equal(result.lastSold, null); assert.equal(result.lastSoldError, undefined);
  const untemplated = await service.getMarketPriceSuggestions({ ...sale.assets[0], template: null, template_id: '-1' }); assert.ok(untemplated.unavailable);
});


test('inventory without sales metadata is joined to existing active and announced sales', async () => {
  const asset = { ...sale.assets[0] }; delete asset.sales;
  global.fetch = async url => ({ ok: true, text: async () => JSON.stringify({ success: true, data: url.includes('/atomicassets/') ? [asset] : [{ ...sale, state: 1 }, { ...sale, sale_id: '123', state: 0 }, { ...sale, sale_id: '124', state: 3 }] }) });
  const assets = await service.getOwnedMarketAssets(sale.seller);
  assert.deepEqual(assets[0].sales.map(s => Number(s.state)), [1, 0]);
});
test('existing sale blocks duplicate listing before wallet and provides management context', async () => {
  await assert.rejects(service.prepareMarketOperation({ ...list(), actor: sale.seller }), e => /already listed/.test(e.message) && e.existingSale.sale_id === sale.sale_id);
  assert.equal(sent, null);
});
test('listing lookup failure fails closed rather than offering duplicate listing', async () => {
  const original = global.fetch;
  global.fetch = async (url, options) => { if (url.includes('/atomicmarket/v1/sales')) throw new Error('Index unavailable'); return original(url, options); };
  await assert.rejects(service.prepareMarketOperation(list()), /Index unavailable/);
  assert.equal(sent, null);
});

test('listing filters and price sorting use sales v2 before pagination', async () => {
  await service.getMarketSales({ page: 2, rarity: 'Rare', template: '856817', minPrice: '10.5', maxPrice: '99', sort: 'price', order: 'asc' });
  const url = new URL(requests[0].url);
  assert.equal(url.pathname, '/atomicmarket/v2/sales');
  for (const [key, value] of Object.entries({ page: '2', 'data.Rarity': 'Rare', template_id: '856817', min_price: '10.50000000', max_price: '99.00000000', symbol: 'WAX', sort: 'price', order: 'asc' })) assert.equal(url.searchParams.get(key), value);
  assert.equal(sent, null);
});
