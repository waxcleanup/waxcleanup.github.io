const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('@babel/core');
const sdk = require('@alcorexchange/alcor-swap-sdk');
const { ABI, Serializer } = require('@wharfkit/antelope');
const fixture = require('./fixtures/alcor-mainnet-5113.json');
const cache = new Map();
function load(name) {
  const filename = path.resolve(__dirname, '../src/services', name + '.js');
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = { exports: {} }; cache.set(filename, mod);
  const code = transformSync(fs.readFileSync(filename, 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', { filename })(id => {
    if (id.startsWith('@alcorexchange/')) return sdk;
    if (id.startsWith('.')) return load(path.basename(id));
    return require(id);
  }, mod, mod.exports);
  return mod.exports;
}
const math = load('exchangeMath'); const quotes = load('exchangeQuotes');
const portfolio = load('alcorPortfolio');
const [wax, cinder, trash, tomatoe] = math.TOKENS;
const actor = fixture.positions[0].owner;
const now = 1800000000000;
const params = { row: fixture.pool, ticks: fixture.ticks, kind: 'swap', actor, inputToken: wax, amount: '1', slippageBps: 50, now };
test('non-game liquidity uses an explicit verified scope without changing the swap allowlist', async () => {
  const other = { ...cinder, symbol: 'OTHER' };
  const row = { ...fixture.pool, tokenA: { ...fixture.pool.tokenA, quantity: fixture.pool.tokenA.quantity.replace('CINDER', 'OTHER') } };
  const allowedTokens = [other, wax];
  assert.throws(() => math.requireToken(other), /Unsupported/);
  const q = quotes.quoteTrade({ ...params, row, kind: 'add', allowedTokens, positionRange: { tickLower: -443580, tickUpper: 443580 } });
  const actions = math.reviewActions(q, now, allowedTokens);
  assert.deepEqual(actions.map(a => a.name), ['transfer', 'transfer', 'addliquid']);
  assert.ok(actions[0].data.quantity.endsWith(' OTHER')); checkAbi(actions);
  const remove = await quotes.quotePosition({ ...params, row, kind: 'remove', percent: 100, positionRow: fixture.positions[0], allowedTokens });
  checkAbi(math.reviewActions(remove, now, allowedTokens));
  assert.throws(() => math.reviewActions(q, now), /Unsupported/);
});
test('adding to an out-of-range position preserves its range and only transfers the required token', () => {
  const positionRange = { tickLower: 31020, tickUpper: 32040 };
  const q = quotes.quoteTrade({ ...params, kind: 'add', inputToken: cinder, amount: '1', positionRange });
  assert.equal(q.tickLower, 31020); assert.equal(q.tickUpper, 32040); assert.equal(q.rawB, '0');
  const actions = math.reviewActions(q, now);
  assert.deepEqual(actions.map(a => a.name), ['transfer', 'addliquid']);
  assert.equal(actions[1].data.tokenBDesired, '0.00000000 WAX'); checkAbi(actions);
});
test('portfolio liquidity verifies on-chain token stats, ownership and changed input before dispatch', async () => {
  const settings = { owner: actor, badPrecision: false };
  const dispatched = [];
  const row = { ...fixture.pool, tokenA: { ...fixture.pool.tokenA, quantity: fixture.pool.tokenA.quantity.replace('CINDER', 'OTHER') } };
  const filename = path.resolve(__dirname, '../src/services/alcorMainnet.js');
  const code = transformSync(fs.readFileSync(filename, 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const context = vm.createContext({ Date, console, AbortController, setTimeout, clearTimeout, fetch: async (url, options) => {
    const body = JSON.parse(options.body); let data;
    if (url.endsWith('/get_table_rows')) data = { rows: body.table === 'pools' ? [row] : body.table === 'ticks' ? fixture.ticks : [{ ...fixture.positions[0], owner: settings.owner }], more: false };
    else if (url.endsWith('/get_currency_stats')) data = { [body.symbol]: { supply: body.symbol === 'OTHER' ? (settings.badPrecision ? '100.000 OTHER' : '100.000000 OTHER') : '100.00000000 WAX' } };
    else if (url.endsWith('/get_currency_balance')) data = [body.symbol === 'OTHER' ? '100.000000 OTHER' : '100.00000000 WAX'];
    else throw new Error('Unexpected network operation');
    return { ok: true, text: async () => JSON.stringify(data) };
  } });
  const mod = { exports: {} };
  vm.runInContext('(function(require,module,exports){' + code + '\n})', context)(id => {
    if (id.includes('waxMainnetEndpoints')) return { getHealthyWaxMainnetEndpoint: async () => 'https://mainnet.invalid', invalidateWaxMainnetEndpoint() {} };
    if (id.includes('contractKit')) return { buildContractAction: async (account, name, data) => { const action = { account, name, data }; checkAbi([action]); return action; } };
    if (id.includes('useSession')) return { InitTransaction: async input => { dispatched.push(input); return { transactionId: 'offline-only' }; } };
    return load(path.basename(id));
  }, mod, mod.exports);
  const service = mod.exports;
  const input = { actor, poolId: '5113', positionId: String(fixture.positions[0].id), kind: 'add', inputSide: 'a', amount: '1', percent: 100, slippageBps: 50 };
  const q = await service.quotePortfolioLiquidity(input);
  assert.equal(q.tokenA.symbol, 'OTHER');
  await assert.rejects(service.executePortfolioLiquidity(q, { ...input, amount: '2' }), /Amount or token changed/);
  settings.owner = 'wrongwallet';
  await assert.rejects(service.executePortfolioLiquidity(q, input), /no longer exists/);
  settings.owner = actor; settings.badPrecision = true;
  await assert.rejects(service.executePortfolioLiquidity(q, input), /precision/);
  assert.equal(dispatched.length, 0);
  settings.badPrecision = false;
  await service.executePortfolioLiquidity(q, input);
  assert.equal(dispatched.length, 1); assert.equal(dispatched[0].expectedActor, actor);
  assert.equal(dispatched[0].actions[2].name, 'addliquid');
});
function checkAbi(actions) {
  for (const action of actions) {
    const abi = ABI.from(require('./fixtures/' + action.account + '-abi.json'));
    const struct = abi.actions.find(a => String(a.name) === action.name).type;
    const encoded = Serializer.encode({ abi, type: struct, object: action.data });
    assert.ok(encoded.array.length > 0);
  }
}
test('mainnet identities reject testnet TOMATOE and altered precision', () => {
  assert.equal(tomatoe.contract, 'maestrobeatz');
  assert.throws(() => math.requireToken({ ...tomatoe, contract: 'cleanuptoken' }), /Unsupported/);
  assert.throws(() => math.requireToken({ ...wax, precision: 6 }), /Unsupported/);
  assert.throws(() => math.assertPool({ ...fixture.pool, active: 0 }, 5113), /paused/);
});
test('account portfolio retains non-game pools, pool zero and multiple fee tiers while excluding other owners', () => {
  const tokenA = { symbol: 'TLM', contract: 'alien.worlds', decimals: 4 };
  const tokenB = { symbol: 'WAX', contract: 'eosio.token', decimals: 8 };
  const row = { id: 1, owner: 'tester', pool: 0, liquidity: '10', amountA: '1.0000 TLM', amountB: '2.00000000 WAX', feesA: '0.0000 TLM', feesB: '0.00000001 WAX', totalValue: 3, inRange: true };
  const result = portfolio.normalizePortfolio('tester', [row, row, { ...row, id: 2 }, { ...row, id: 3, pool: 7, liquidity: '0', totalValue: null }, { ...row, id: 4, owner: 'someoneelse' }], [
    { id: 0, tokenA, tokenB, fee: 3000, active: true }, { id: 7, tokenA, tokenB, fee: 500, active: true },
  ]);
  assert.equal(result.length, 2); assert.equal(result[0].poolId, '0'); assert.equal(result[0].positions.length, 2);
  assert.equal(result[0].tokenA.symbol, 'TLM'); assert.equal(result[0].manageable, false);
  assert.equal(result[1].positions[0].closed, true); assert.equal(result[1].positions[0].valueUSD, null);
});
test('missing portfolio pool metadata retains positions and invalid responses are not treated as empty', () => {
  const rows = [{ id: 5, pool: 99999, owner: 'tester', amountA: '1.0000 XYZ', liquidity: '5' }];
  const result = portfolio.normalizePortfolio('tester', rows, []);
  assert.equal(result[0].positions[0].amountA, '1.0000 XYZ'); assert.equal(result[0].tokenA, null);
  assert.equal(result[0].positions[0].feesA, 'Unavailable'); assert.equal(result[0].manageable, false);
  assert.throws(() => portfolio.normalizePortfolio('tester', {}, []), /invalid/);
});
test('asset arithmetic is exact above Number precision and rejects excess decimals, exponents and negatives', () => {
  assert.equal(math.rawAmount('90071992.54740993', wax), 9007199254740993n);
  assert.equal(math.formatRaw(9007199254740993n, wax), '90071992.54740993');
  assert.equal(math.rawAmount('1.001', trash), 1001n);
  for (const value of ['1e3', '-1', '0', 'NaN', '1.000000001', '999999999999999999']) assert.throws(() => math.rawAmount(value, wax));
  assert.equal(math.minimumRaw(123456789n, 50), 122839505n);
  assert.throws(() => math.minimumRaw(100n, 101), /slippage/);
});
test('chain JSON preserves uint64 digits without changing strings, decimals or exponents', () => {
  const result = math.parseChainJson('{"liquidity":18446744073709551615,"negative":-9007199254740993,"text":"a 18446744073709551615 \\\" b","fraction":0.12345678901234567,"e":1e18}');
  assert.equal(result.liquidity, '18446744073709551615'); assert.equal(result.negative, '-9007199254740993');
  assert.equal(result.text, 'a 18446744073709551615 " b'); assert.equal(typeof result.fraction, 'number'); assert.equal(result.e, 1e18);
});
test('table pagination follows all pages and refuses incomplete or repeated cursors', async () => {
  const calls = [];
  const rows = await math.paginateRows(async opts => { calls.push(opts); return calls.length === 1 ? { rows: [{ id: 1 }], more: true, next_key: '1001' } : { rows: [{ id: 1001 }], more: false }; }, { table: 'ticks' });
  assert.equal(rows.length, 2); assert.equal(calls[1].lower_bound, '1001');
  await assert.rejects(math.paginateRows(async () => ({ rows: [], more: true, next_key: '1' }), {}), /Incomplete/);
});
test('real mainnet snapshot produces both swap directions with exact minimums and ABI-valid actions', () => {
  for (const inputToken of [wax, cinder]) {
    const q = quotes.quoteTrade({ ...params, inputToken });
    assert.ok(BigInt(q.outputRaw) > 0n); assert.equal(q.minimum, math.minimumRaw(q.outputRaw, 50).toString());
    const actions = math.reviewActions(q, now); assert.equal(actions.length, 1);
    assert.equal(actions[0].account, inputToken.contract);
    assert.equal(actions[0].data.from, actor); assert.equal(actions[0].data.to, 'swap.alcor');
    assert.ok(actions[0].data.memo.endsWith('#1800000030'));
    assert.ok(actions[0].data.memo.includes(`${math.asset(q.minimum, q.outputToken)}@${q.outputToken.contract}`));
    checkAbi(actions);
  }
});
test('review rejects stale quotes, changed wallets, amounts, pools, slippage and network', () => {
  const q = quotes.quoteTrade(params);
  const ctx = { actor, poolId: '5113', kind: 'swap', inputToken: wax, amount: '1', slippageBps: 50 };
  math.assertReview(q, ctx, now + 1000);
  assert.throws(() => math.assertReview(q, ctx, now + 30000), /expired/);
  for (const patch of [{ actor: 'otherwallet' }, { poolId: '3271' }, { amount: '2' }, { inputToken: cinder }, { slippageBps: 100 }]) assert.throws(() => math.assertReview(q, { ...ctx, ...patch }, now));
  assert.throws(() => math.assertReview({ ...q, network: 'wax-testnet' }, ctx, now));
});
test('full range deposits from either token respect input caps, nonzero minima and atomic action order', () => {
  for (const inputToken of [wax, cinder]) {
    const q = quotes.quoteTrade({ ...params, kind: 'add', inputToken });
    assert.ok(BigInt(q.rawA) > 0n && BigInt(q.rawB) > 0n);
    assert.ok(BigInt(q.minA) <= BigInt(q.rawA)); assert.ok(BigInt(q.minB) <= BigInt(q.rawB));
    const inputIsA = math.identity(inputToken) === math.identity(q.tokenA);
    assert.ok(BigInt(inputIsA ? q.rawA : q.rawB) <= BigInt(q.inputRaw));
    const actions = math.reviewActions(q, now); assert.deepEqual(actions.map(a => a.name), ['transfer', 'transfer', 'addliquid']);
    assert.equal(actions[0].data.memo, 'deposit'); assert.equal(actions[2].data.deadline, 1800000030);
    assert.equal(q.tickLower, -443580); assert.equal(q.tickUpper, 443580); checkAbi(actions);
  }
});
test('withdrawals calculate exact partial liquidity, enforce ownership and collect only to the owner', async () => {
  const base = { ...params, positionRow: fixture.positions[0], kind: 'remove', percent: 25 };
  const q = await quotes.quotePosition(base);
  assert.equal(q.selectedLiquidity, (BigInt(fixture.positions[0].liquidity) / 4n).toString());
  const actions = math.reviewActions(q, now); assert.deepEqual(actions.map(a => a.name), ['subliquid', 'collect']);
  assert.equal(actions[1].data.recipient, actor); checkAbi(actions);
  await assert.rejects(quotes.quotePosition({ ...base, actor: 'otherwallet' }), /another wallet/);
  await assert.rejects(quotes.quotePosition({ ...base, positionRow: { ...base.positionRow, liquidity: '1' }, percent: 1 }), /rounds to zero/);
  const collect = await quotes.quotePosition({ ...base, kind: 'collect' });
  const collection = math.reviewActions(collect, now); assert.equal(collection.length, 1); checkAbi(collection);
});
test('large swap price impact is reported and dust cannot produce executable quotes', () => {
  assert.ok(quotes.quoteTrade({ ...params, amount: '999999999.00000000' }).impactBps > 9900);
  assert.throws(() => quotes.quoteTrade({ ...params, amount: '0.00000001' }));
});
test('wallet dispatch refuses an account switch or expiry after session restoration', async () => {
  const calls = [];
  const session = { permissionLevel: { actor: 'restored1234', permission: 'active' }, walletPlugin: { id: 'anchor' }, transact: async transaction => { calls.push(transaction); return { transaction_id: 'offline-transaction' }; } };
  const source = fs.readFileSync(path.resolve(__dirname, '../src/hooks/useSession.js'), 'utf8');
  const code = transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const context = vm.createContext({ console: { error() {}, warn() {} } }); const mod = { exports: {} };
  vm.runInContext('(function(require,module,exports){' + code + '\n})', context)(id => {
    if (id.includes('sessionConfig')) return { __esModule: true, default: { restore: async () => session }, ensureSessionEndpoint: async () => {}, assertMainnetSession() {} };
    if (id.includes('transactionFinality')) return { extractTransactionBlockNumber: () => 1 };
    return {};
  }, mod, mod.exports);
  await assert.rejects(mod.exports.InitTransaction({ actions: [], expectedActor: 'oldaccount12' }), /account changed/);
  await assert.rejects(mod.exports.InitTransaction({ actions: [], expectedActor: 'restored1234', validUntil: Date.now() - 1 }), /expired/);
  assert.equal(calls.length, 0);
  await mod.exports.InitTransaction({ actions: [{ account: 'eosio.token', name: 'transfer', data: {} }], expectedActor: 'restored1234', validUntil: Date.now() + 30000 });
  assert.equal(calls.length, 1); assert.equal(calls[0].actions[0].authorization[0].actor, 'restored1234');
});

test('leading-dot decimals keep exact precision through swap review and transfer', () => {
  assert.equal(math.rawAmount('.24333619', wax), 24333619n);
  assert.equal(math.rawAmount(' .001 ', trash), 1n);
  assert.equal(math.rawAmount('.000001', cinder), 1n);
  assert.equal(math.rawAmount('.0', wax, true), 0n);
  for (const value of ['.', '', '.0', '.000000001', '.1e2', '-.1', '..1', '.1.2']) {
    assert.throws(() => math.rawAmount(value, wax));
  }
  const q = quotes.quoteTrade({ ...params, amount: '.24333619' });
  const canonical = quotes.quoteTrade({ ...params, amount: '0.24333619' });
  assert.equal(q.inputRaw, canonical.inputRaw);
  assert.equal(q.outputRaw, canonical.outputRaw);
  math.assertReview(q, { actor, poolId: q.poolId, kind: 'swap', inputToken: wax, amount: '.24333619', slippageBps: 50 }, now);
  const actions = math.reviewActions(q, now);
  assert.equal(actions[0].data.quantity, '0.24333619 WAX');
  checkAbi(actions);
});
