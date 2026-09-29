const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {serverEnvironment,CHAIN}=require('./build-server.cjs');const root=path.resolve(__dirname,'..');
const {localEnvironment}=require('./start-mainnet.cjs');
test('local mainnet uses its own port, the AWS route base and a development-only API proxy',()=>{
 const env=localEnvironment({PATH:'/usr/bin',PORT:'3001',REACT_APP_CHAINID:'testnet'});
 assert.equal(env.REACT_APP_CHAINID,CHAIN);assert.equal(env.PORT,'3002');assert.equal(env.HOST,'127.0.0.1');
 assert.equal(env.NODE_ENV,'development');assert.equal(env.REACT_APP_LOCAL_MAINNET,'true');
 assert.equal(env.PUBLIC_URL,'/cleanupcentr');assert.equal(env.REACT_APP_ROUTER_BASENAME,'/cleanupcentr');
 assert.equal(env.REACT_APP_API_BASE_URL,'/mainnet-api');assert.equal(env.REACT_APP_SERVER_HOSTED,'true');
 assert.equal(env.REACT_APP_ENCRYPTION_KEY,'');assert.equal(env.BUILD_PATH,undefined);
});
test('server build fixes mainnet and subpath without inheriting arbitrary frontend secrets',()=>{
 const env=serverEnvironment({PATH:'/usr/bin',REACT_APP_PRIVATE_KEY:'do-not-bundle',REACT_APP_ENCRYPTION_KEY:'do-not-bundle'});
 assert.equal(env.REACT_APP_CHAINID,CHAIN);assert.equal(env.PUBLIC_URL,'/cleanupcentr');assert.equal(env.REACT_APP_ROUTER_BASENAME,'/cleanupcentr');
 assert.equal(env.REACT_APP_PRIVATE_KEY,undefined);assert.equal(env.REACT_APP_ENCRYPTION_KEY,'');assert.equal(env.BUILD_PATH,'build-server');assert.equal(env.GENERATE_SOURCEMAP,'false');
});
test('GitHub deploy and root hosting remain independently supported',()=>{
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
 assert.equal(pkg.homepage,'https://waxcleanup.github.io');assert.equal(pkg.scripts.deploy,'gh-pages -d build');assert.equal(pkg.scripts.build,'react-scripts build');
 const index=fs.readFileSync(path.join(root,'src/index.js'),'utf8');assert.ok(index.includes("process.env.REACT_APP_ROUTER_BASENAME || ''"));assert.ok(index.includes('!routerBasename && savedPath'));
});
test('server sessions use a mainnet-only namespace and validate restored and new sessions',()=>{
 const config=fs.readFileSync(path.join(root,'src/config/sessionConfig.js'),'utf8');
 assert.ok(config.includes("new BrowserLocalStorage('cleanupcentr-mainnet')"));
 const hook=fs.readFileSync(path.join(root,'src/hooks/SessionContext.js'),'utf8');
 assert.ok(hook.includes('assertMainnetSession(restored)'));assert.ok(hook.includes('assertMainnetSession(newSession)'));
});
