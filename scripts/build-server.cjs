const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '..');
const CHAIN = '1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4';
const allowed = new Set(['REACT_APP_API_BASE_URL','REACT_APP_CHAINID','REACT_APP_RPC','REACT_APP_CONTRACT_NAME','REACT_APP_IPFS_GATEWAY','REACT_APP_ATOMIC_ASSETS_BASE','REACT_APP_ATOMICHUB_COLLECTION_URL','REACT_APP_DISCORD_INVITE_URL','REACT_APP_TWITTER_URL','REACT_APP_TELEGRAM_URL','REACT_APP_MARKET_API_BASE_URL']);
function serverEnvironment(parent = process.env) {
  const env = Object.fromEntries(Object.entries(parent).filter(([key])=>!key.startsWith('REACT_APP_')));
  for(const file of ['.env','.env.production','.env.local','.env.production.local']) {
    const name=path.join(root,file);
    if(fs.existsSync(name)) for(const [key,value] of Object.entries(dotenv.parse(fs.readFileSync(name)))) { if(allowed.has(key)) env[key]=value; else if(key.startsWith('REACT_APP_')) env[key]=''; }
  }
  assert.equal(env.REACT_APP_CHAINID,CHAIN,'Server preview must use the existing WAX Mainnet configuration');
  const rpc = new URL(env.REACT_APP_RPC);
  assert.equal(rpc.protocol,'https:');assert.ok(!/testnet/i.test(rpc.hostname));
  Object.assign(env,{
    NODE_ENV:'production',PUBLIC_URL:'/cleanupcentr',BUILD_PATH:'build-server',GENERATE_SOURCEMAP:'false',INLINE_RUNTIME_CHUNK:'false',
    REACT_APP_ROUTER_BASENAME:'/cleanupcentr',REACT_APP_SERVER_HOSTED:'true',
    REACT_APP_API_BASE_URL:'https://maestrobeatz.servegame.com',
    REACT_APP_BACKEND_API_BASE_URL:'https://maestrobeatz.servegame.com',
    REACT_APP_MARKET_API_BASE_URL:'https://maestrobeatz.servegame.com',
    // CRA loads .env again; an explicit empty value prevents the legacy unused key from entering its environment.
    REACT_APP_ENCRYPTION_KEY:''
  });
  return env;
}
function finalizeServerBuild() {
  const output=path.join(root,'build-server'),entry=path.join(output,'index.html');
  let html=fs.readFileSync(entry,'utf8');
  html=html.replaceAll('https://waxcleanup.github.io/','https://maestrobeatz.servegame.com/cleanupcentr/');
  html=html.replace(/<meta name="robots" content="noindex,nofollow,noarchive" \/>/g,'');
  html=html.replace('</head>','<meta name="robots" content="noindex,nofollow,noarchive" /></head>');
  fs.writeFileSync(entry,html);
  fs.writeFileSync(path.join(output,'robots.txt'),'User-agent: *\nDisallow: /\n');
  // Nginx serves SPA deep links directly; GitHub's redirect shim must not escape the subpath.
  for(const file of ['404.html','404 (Copy).html']) fs.rmSync(path.join(output,file),{force:true});
  fs.writeFileSync(path.join(output,'deployment.json'),JSON.stringify({network:'wax-mainnet',chainId:CHAIN,basePath:'/cleanupcentr',hosting:'aws-parallel-preview',builtAt:new Date().toISOString()},null,2));
  assert.ok(html.includes('/cleanupcentr/static/'),'Assets must remain under the mainnet subpath');
  assert.ok(!html.includes('waxcleanup.github.io'),'Server metadata must reference the server URL');
  const files=[];function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);item.isDirectory()?walk(p):files.push(p);}}walk(output);
  assert.ok(!files.some(f=>f.endsWith('.map')),'No public source maps');
  const js=files.filter(f=>f.endsWith('.js')).map(f=>fs.readFileSync(f,'utf8')).join('\n');
  assert.ok(js.includes(CHAIN),'Mainnet chain included');
  // Wallet SDKs bundle chain registries, including testnets; validate the selected configuration, not registry strings.
  assert.equal(serverEnvironment().REACT_APP_CHAINID,CHAIN);
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html),'No inline scripts under the server CSP');
  assert.ok(!js.includes('REACT_APP_ENCRYPTION_KEY is not set'),'Unused encryption helper excluded');
  // Do not print a secret even if validation detects one.
  const legacy=dotenv.parse(fs.readFileSync(path.join(root,'.env'))).REACT_APP_ENCRYPTION_KEY;
  if(legacy && legacy.length>=8) assert.ok(!js.includes(legacy),'Legacy encryption value must not enter the server bundle');
  assert.ok(js.includes('cleanupcentr-mainnet'),'Mainnet wallet storage is isolated from testnet');
  console.log('Server build verified: mainnet, /cleanupcentr, isolated wallet storage, noindex, no source maps or frontend encryption value.');
}
if(require.main===module){
  const walletChecks=spawnSync(process.execPath,['--test','scripts/maestro-policy.test.mjs','scripts/mainnet-wallet.test.cjs','scripts/mainnet-exchange.test.cjs','scripts/mainnet-marketplace.test.cjs'],{cwd:root,stdio:'inherit'});
  if(walletChecks.status!==0)process.exit(walletChecks.status||1);
  const result=spawnSync(process.execPath,[require.resolve('react-scripts/scripts/build')],{cwd:root,env:serverEnvironment(),stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
  finalizeServerBuild();
}
module.exports={serverEnvironment,finalizeServerBuild,CHAIN};
