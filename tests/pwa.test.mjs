import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
const root=new URL('../public/',import.meta.url),worker=fs.readFileSync(new URL('sw.js',root),'utf8');
function harness(){
 const handlers={},reads=[],writes=[],removed=[];let network=true,activated=0;
 const values=new Map(['/offline.html','/install.html','/releases.html','/privacy.html','/style.css'].map(path=>[path,new Response(path)]));
 const cache={addAll:async paths=>writes.push(...paths),match:async path=>{reads.push(path);return values.get(path)?.clone();}};
 const self={location:{origin:'https://ridevector.app'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:()=>activated++};
 const context={self,URL,Response,caches:{open:async()=>cache,keys:async()=>['ridevector-public-old','unrelated-cache'],delete:async key=>removed.push(key)},fetch:async request=>{if(!network)throw Error('Offline');return new Response('network:'+request.url);}};
 vm.runInNewContext(worker,context);
 async function request(path,{method='GET',authorization=false,navigate=false}={}){let response=null;const req={url:path.startsWith('http')?path:'https://ridevector.app'+path,method,headers:new Headers(authorization?{Authorization:'Bearer synthetic'}:{}),mode:navigate?'navigate':'cors'};handlers.fetch({request:req,respondWith:value=>response=Promise.resolve(value)});return response?await response:null;}
 return {handlers,reads,writes,removed,request,offline:()=>network=false,activated:()=>activated};
}
test('manifest identity, opaque icons, and public offline assets are ready',async()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('manifest.webmanifest',root)));assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');assert.equal(manifest.id,'/');assert.ok(manifest.icons.some(i=>i.purpose==='maskable'));
 for(const size of [180,192,512]){const png=fs.readFileSync(new URL('icons/icon-'+size+'.png',root));assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);}
 const h=harness();let installing;h.handlers.install({waitUntil:promise=>installing=promise});await installing;
 assert.ok(h.writes.includes('/offline.html'));assert.ok(h.writes.includes('/releases.html'));assert.ok(!h.writes.includes('/'));assert.ok(!h.writes.includes('/index.html'));assert.ok(!h.writes.some(p=>p.startsWith('/api/')||p.includes('supabase')));
 for(const path of h.writes)assert.ok(fs.existsSync(new URL(path.slice(1),root)),path+' missing');
 assert.equal(h.activated(),0);
});
test('account routes, tokens, mutations and third-party requests bypass the worker',async()=>{
 const h=harness();h.offline();
 for(const [url,options] of [['/api/wahoo/callback?code=synthetic',{navigate:true}],['/api/strava/status',{}],['/style.css',{authorization:true}],['/',{method:'POST'}],['https://example.supabase.co/rest/v1/rides',{}],['/unlisted.json',{}],['/style.css?access_token=synthetic',{}]])assert.equal(await h.request(url,options),null);
 assert.equal(h.reads.length,0);assert.equal(h.writes.length,0);
});
test('offline dashboard uses a public fallback; public guides work; queries are never replayed',async()=>{
 const h=harness();h.offline();
 assert.equal(await (await h.request('/',{navigate:true})).text(),'/offline.html');
 assert.equal(await (await h.request('/?source=homescreen',{navigate:true})).text(),'/offline.html');
 assert.equal(await (await h.request('/releases',{navigate:true})).text(),'/releases.html');
 assert.equal(await (await h.request('/install',{navigate:true})).text(),'/install.html');
 assert.equal(await (await h.request('/releases?token=synthetic',{navigate:true})).text(),'/offline.html');
 assert.equal(await (await h.request('/style.css')).text(),'/style.css');assert.equal(h.writes.length,0);
});
test('online navigation stays live and only explicit update messages activate a new build',async()=>{
 const h=harness();assert.equal(await (await h.request('/#rides',{navigate:true})).text(),'network:https://ridevector.app/#rides');assert.equal(h.writes.length,0);
 h.handlers.message({data:{type:'UNKNOWN'}});assert.equal(h.activated(),0);h.handlers.message({data:{type:'ACTIVATE_UPDATE'}});assert.equal(h.activated(),1);
 let activating;h.handlers.activate({waitUntil:value=>activating=value});await activating;assert.deepEqual(h.removed,['ridevector-public-old']);
});
