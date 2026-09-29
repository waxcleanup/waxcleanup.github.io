const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { transformSync } = require('@babel/core');
const { PrivateKey, Transaction, UInt16 } = require('@wharfkit/antelope');
const MAINNET = '1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4';
const TESTNET = 'f16b1833c747c43682f4386fca9cbb327929334a762755ebec17f6f23c9b8a12';
const sourceRoot = path.resolve(__dirname, '../src');

function harness({ realRpc = false } = {}) {
  const storage = new Map();
  const requests = [];
  const key = PrivateKey.generate('K1'); // Disposable offline key, never sent to a node.
  const settings = { chain: MAINNET, weight: 1, threshold: 1 };
  const browser = Object.assign(new EventTarget(), {
    isSecureContext: true, location: { href: 'http://localhost:3002/cleanupcentr/' }, crypto: webcrypto, btoa, atob, setTimeout, clearTimeout,
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) },
  });
  const rpc = {
    WAX_MAINNET_CHAIN_ID: MAINNET,
    async postWaxMainnetRpc(route, body) {
      requests.push({ route, body });
      if (route.endsWith('get_info')) return { chain_id: settings.chain };
      if (route.endsWith('get_accounts_by_authorizers')) return { accounts: [{ account_name: 'tester111111', permission_name: 'active', weight: 1, threshold: 1 }] };
      if (route.endsWith('get_account')) return { permissions: [{ perm_name: 'active', required_auth: { threshold: settings.threshold, keys: [{ key: key.toPublic().toString(), weight: settings.weight }] } }] };
      throw new Error('Unexpected RPC call: ' + route);
    },
  };
  const context = vm.createContext({ window: browser, URL, CustomEvent, TextEncoder, TextDecoder, AbortController,
    process: { env: { REACT_APP_CHAINID: MAINNET, REACT_APP_RPC: 'https://primary.invalid' } }, console, setTimeout, clearTimeout });
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(sourceRoot, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const code = transformSync(fs.readFileSync(filename, 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
    const localRequire = name => {
      if (name.endsWith('.png')) return '/bundled-maestro.png';
      if (!realRpc && name.includes('waxMainnetEndpoints')) return rpc;
      if (!name.startsWith('.')) return require(name);
      const absolute = path.resolve(path.dirname(filename), name);
      return load(path.relative(sourceRoot, absolute.endsWith('.js') ? absolute : absolute + '.js'));
    };
    vm.runInContext('(function(require,module,exports){' + code + '\n})', context, { filename })(localRequire, module, module.exports);
    return module.exports;
  }
  return { load, browser, key, settings, storage, requests };
}

async function importedWallet(h) {
  const wallet = h.load('wallet/maestro/maestroWallet.js');
  await wallet.importMaestroWallet({ privateKey: h.key.toString(), password: 'offline-test-password', termsAccepted: true });
  await wallet.unlockMaestroWallet('offline-test-password');
  return wallet;
}

test('mainnet vault encrypts locally, keeps testnet separate, rejects wrong passwords and locks signing', async () => {
  const h = harness();
  h.storage.set('rhythmfarm_maestro_testnet_wallets_v2', 'testnet-sentinel');
  const wallet = await importedWallet(h);
  assert.equal(wallet.MAESTRO_WALLET_ID, 'maestro-wallet-mainnet');
  assert.equal(h.storage.get('rhythmfarm_maestro_testnet_wallets_v2'), 'testnet-sentinel');
  assert.ok(!JSON.stringify([...h.storage]).includes(h.key.toString()));
  assert.ok(!JSON.stringify(h.requests).includes(h.key.toString()));
  assert.equal(wallet.getMaestroWalletState().unlocked, true);
  assert.throws(() => wallet.signMaestroTransaction({}, TESTNET), /outside WAX mainnet/);
  wallet.lockMaestroWallet();
  assert.throws(() => wallet.signMaestroTransaction({}, MAINNET), /Unlock/);
  await assert.rejects(wallet.unlockMaestroWallet('wrong-password'), /Unable to unlock/);
  h.settings.threshold = 2;
  await assert.rejects(wallet.unlockMaestroWallet('offline-test-password'), /Unable to unlock/);
});

test('vault metadata and chain tampering cannot unlock', async () => {
  const h = harness();
  const wallet = await importedWallet(h);
  wallet.lockMaestroWallet();
  const storageKey = 'cleanupcentr_mainnet_maestro_wallets_v2';
  const saved = h.storage.get(storageKey);
  const vault = JSON.parse(saved); vault.wallets[0].account = 'attacker1111';
  h.storage.set(storageKey, JSON.stringify(vault));
  await assert.rejects(wallet.unlockMaestroWallet('offline-test-password'), /Unable to unlock/);
  const wrongChain = JSON.parse(saved); wrongChain.chainId = TESTNET;
  h.storage.set(storageKey, JSON.stringify(wrongChain));
  await assert.rejects(wallet.unlockMaestroWallet('offline-test-password'), /invalid/);
});

test('plugin signs reviewed bytes offline and rejects mutation, mismatched accounts and wrong chains', async () => {
  const h = harness(); const wallet = await importedWallet(h);
  const { MaestroWalletPlugin } = h.load('wallet/maestro/MaestroWalletPlugin.js');
  const plugin = new MaestroWalletPlugin();
  const transaction = Transaction.from({ expiration: '2026-09-22T00:00:00', ref_block_num: 1, ref_block_prefix: 1, max_net_usage_words: 0, max_cpu_usage_ms: 0, delay_sec: 0, context_free_actions: [], actions: [{ account: 'eosio.token', name: 'transfer', authorization: [{ actor: 'tester111111', permission: 'active' }], data: '' }], transaction_extensions: [] });
  const review = { actions: [{ account: 'eosio.token', name: 'transfer', authorization: [{ actor: 'tester111111', permission: 'active' }], data: { from: 'tester111111', to: 'rhythmfarmer', quantity: '1.00000000 WAX', memo: 'energy' } }] };
  const context = { chain: { id: MAINNET }, permissionLevel: 'tester111111@active' };
  await assert.rejects(plugin.sign({ transaction, resolvedTransaction: review }, { ...context, chain: { id: TESTNET } }), /outside WAX mainnet/);
  await assert.rejects(plugin.sign({ transaction, resolvedTransaction: review }, { ...context, permissionLevel: 'attacker1111@active' }), /does not match/);
  h.browser.addEventListener(wallet.MAESTRO_WALLET_SIGN_REQUEST_EVENT, () => wallet.approveMaestroWalletSignature(), { once: true });
  const signed = await plugin.sign({ transaction, resolvedTransaction: review }, context);
  assert.ok(signed.signatures[0].recoverDigest(wallet.getMaestroTransactionDigest(transaction)).equals(h.key.toPublic()));
  h.browser.addEventListener(wallet.MAESTRO_WALLET_SIGN_REQUEST_EVENT, () => { transaction.ref_block_num = UInt16.from(2); wallet.approveMaestroWalletSignature(); }, { once: true });
  await assert.rejects(plugin.sign({ transaction, resolvedTransaction: review }, context), /changed after review/);
  assert.equal(wallet.getMaestroWalletState().unlocked, false);
});

test('locking rejects an outstanding signature approval', async () => {
  const h = harness(); const wallet = await importedWallet(h);
  const approval = wallet.requestMaestroWalletSignature({ actions: [] });
  wallet.lockMaestroWallet();
  await assert.rejects(approval, /rejected/);
});

test('RPC failover rejects a testnet endpoint and only uses verified mainnet', async () => {
  const h = harness({ realRpc: true }); const calls = [];
  h.browser.fetch = async (url) => {
    calls.push(url);
    if (url.endsWith('get_info')) return { ok: true, json: async () => ({ chain_id: url.includes('primary.invalid') ? TESTNET : MAINNET }) };
    return { ok: true, json: async () => ({ account_name: 'tester111111' }) };
  };
  const rpc = h.load('services/waxMainnetEndpoints.js');
  assert.equal(await rpc.getHealthyWaxMainnetEndpoint(), 'https://wax.greymass.com');
  await rpc.postWaxMainnetRpc('/v1/chain/get_account', { account_name: 'tester111111' });
  assert.ok(!calls.includes('https://primary.invalid/v1/chain/get_account'));
});

test('RPC selection skips a data-failing node even when its chain info is healthy',async()=>{
 const h=harness({realRpc:true});const calls=[];
 h.browser.fetch=async url=>{calls.push(url);return {ok:true,json:async()=>({chain_id:MAINNET})};};
 const rpc=h.load('services/waxMainnetEndpoints.js');
 assert.equal(await rpc.getHealthyWaxMainnetEndpoint(),'https://primary.invalid');
 rpc.invalidateWaxMainnetEndpoint('https://primary.invalid');
 assert.equal(await rpc.getHealthyWaxMainnetEndpoint({exclude:['https://primary.invalid']}),'https://wax.greymass.com');
 assert.equal(await rpc.getHealthyWaxMainnetEndpoint({exclude:['https://primary.invalid','https://wax.greymass.com']}),'https://wax.eosusa.io');
 assert.equal(calls.filter(url=>url.includes('primary.invalid')).length,1);
 await assert.rejects(rpc.getHealthyWaxMainnetEndpoint({exclude:['https://primary.invalid','https://wax.greymass.com','https://wax.eosusa.io']}),/No verified/);
});