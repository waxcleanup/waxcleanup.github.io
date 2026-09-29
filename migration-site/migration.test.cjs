const test=require('node:test');const assert=require('node:assert/strict');const {destination}=require('./migration');const fs=require('node:fs');const vm=require('node:vm');
test('maps old bookmarks and preserves query and section',()=>{
 const base='https://maestrobeatz.servegame.com/cleanupcentr';
 for(const [old,next] of [['/shop','/market/shop'],['/marketplace/','/market/listings'],['/recipes','/market/blends'],['/farming','/farming'],['/guide','/guide'],['/market/blends','/market/blends']])assert.equal(destination(old,'?reveal=123','#details'),base+next+'?reveal=123#details');
 assert.equal(destination('/unknown'),base+'/');
 assert.equal(destination('//evil.example'),base+'/');
});
test('homepage stays visible, localhost never redirects, old bookmarks redirect',()=>{
 const script=fs.readFileSync(require.resolve('./migration'),'utf8');
 function run(host,path){const calls=[];const link={};vm.runInNewContext(script,{window:{location:{hostname:host,pathname:path,search:'?x=1',hash:'#section',replace:url=>calls.push(url)}},document:{getElementById:()=>link}});return {calls,link};}
 assert.equal(run('waxcleanup.github.io','/').calls.length,0);
 assert.equal(run('localhost','/farming').calls.length,0);
 assert.deepEqual(run('waxcleanup.github.io','/recipes').calls,['https://maestrobeatz.servegame.com/cleanupcentr/market/blends?x=1#section']);
});