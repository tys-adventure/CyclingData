import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCallback,createStart,createSync,createDisconnect,defaults} from '../lib/wahoo-routes.mjs';
import {recording,tokenFields,hasScopes,access,acquire} from '../lib/wahoo.mjs';
import {sameRecording} from '../public/duplicates.js';
const state='a'.repeat(64),owner='00000000-0000-0000-0000-000000000001';
const workout={id:42,starts:'2026-11-11T12:00:00Z',workout_type_id:15,name:'Morning ride',workout_summary:{name:'Coffee ride',distance_accum:'30000.25',duration_active_accum:'3600.0',duration_total_accum:'3900',ascent_accum:'200',power_avg:'170.2',heart_rate_avg:'130',speed_avg:'8.2'}};
const token={access_token:'test-access',refresh_token:'test-refresh',expires_in:7200,scope:'user_read workouts_read'};
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},redirect(status,url){this.status=status;this.url=url;},status(n){this.code=n;return this;},json(data){this.data=data;}});
const req={method:'GET',headers:{cookie:'ridevector_wahoo_oauth='+defaults.hash(state)},query:{state,code:'test-code'}};
test('Wahoo decimal mapping rejects noncycling, incomplete and invalid data; keeps active time distinct',()=>{
 const r=recording(workout,owner);assert.equal(r.ride.duration_s,3600);assert.equal(r.payload.summary.moving_s,null);assert.equal(r.payload.summary.timer_s,3600);assert.equal(r.payload.summary.average_watts,170.2);assert.equal(r.ride.user_id,owner);
 for(const override of [{workout_type_id:1},{workout_type_id:17},{workout_summary:null},{starts:'bad'},{id:-1},{workout_summary:{distance_accum:'bad',duration_active_accum:'1'}}])assert.equal(recording({...workout,...override},owner),null);
 const strava={...r.ride,source:'strava',source_id:'strava42'};assert.ok(sameRecording(r.ride,strava));assert.ok(!sameRecording(r.ride,{...strava,user_id:'other'}));
});
test('only granted read scopes and bounded token lifetimes are accepted',()=>{
 assert.ok(hasScopes('workouts_read user_read'));for(const value of ['user_read','workouts_read',undefined])assert.ok(!hasScopes(value));
 for(const override of [{scope:'user_read'},{refresh_token:null},{expires_in:-1}])assert.throws(()=>tokenFields({...token,...override}));
 assert.ok(tokenFields(token).expires_at>Date.now()/1000);
});
test('OAuth callback binds browser state, consumes it once, validates profile, and saves only server-side',async()=>{
 const calls=[],logs=[];let consumed=false;
 const d={...defaults,tokenRequest:async()=>token,wahoo:async()=>({id:123}),log:stage=>logs.push(stage),db:async(path,options)=>{calls.push({path,options});if(path.startsWith('wahoo_oauth_states')){if(consumed)return [];consumed=true;return [{user_id:owner}];}return [];}};
 let res=response();await createCallback(d)(req,res);assert.equal(new URL(res.url).searchParams.get('wahoo'),'connected');
 assert.ok(res.headers['Set-Cookie'].includes('Max-Age=0'));const saved=calls.find(c=>c.path.startsWith('wahoo_connections')).options.body;assert.equal(saved.user_id,owner);assert.equal(saved.wahoo_user_id,123);assert.ok(!res.url.includes(token.access_token));
 res=response();await createCallback(d)(req,res);assert.equal(new URL(res.url).searchParams.get('wahoo'),'expired');
 for(const changed of [{headers:{}},{query:{...req.query,state:'invalid'}},{headers:{cookie:'ridevector_wahoo_oauth='+'b'.repeat(64)}}]){const count=calls.length;await createCallback(d)({...req,...changed},response());assert.equal(calls.length,count);}
 assert.ok(!JSON.stringify(logs).includes('test-access'));
});
test('denial and missing scopes do not create connections; logs omit token error details',async()=>{
 const calls=[],logs=[];const d={...defaults,db:async(path)=>{calls.push(path);return [{user_id:owner}];},tokenRequest:async()=>({...token,scope:'user_read'}),log:s=>logs.push(s)};
 for(const query of [{...req.query,error:'access_denied'},req.query]){const res=response();await createCallback(d)({...req,query},res);assert.ok(/denied|token_exchange/.test(new URL(res.url).searchParams.get('wahoo')));}
 assert.ok(!calls.some(c=>c.startsWith('wahoo_connections')));assert.deepEqual(logs,['token_exchange']);
});
test('OAuth start authenticates before touching state and requests only profile/workout reads',async()=>{
 const calls=[];let res=response();await createStart({...defaults,configured:()=>true,identify:async()=>owner,db:async(p,o)=>{calls.push({p,o});}})({method:'POST'},res);
 const url=new URL(res.data.url);assert.equal(url.searchParams.get('scope'),'user_read workouts_read');assert.equal(url.searchParams.get('redirect_uri'),'https://ridevector.app/api/wahoo/callback');assert.ok(!JSON.stringify(calls).includes(url.searchParams.get('state')));assert.ok(res.headers['Set-Cookie'].includes('HttpOnly; Secure; SameSite=Lax'));
 const count=calls.length;await assert.rejects(()=>createStart({...defaults,identify:async()=>{throw Error('unauthorized');},db:async()=>calls.push('bad')})({method:'POST'},response()));assert.equal(calls.length,count);
});
test('refresh happens only when needed and uses the new token against Wahoo immediately',async()=>{
 const c={user_id:owner,connection_id:'conn',operation_id:'lease',expires_at:0,access_token:'old',refresh_token:'refresh'},calls=[];
 const deps={request:async()=>{calls.push('refresh');return token;},save:async(p)=>{assert.ok(p.includes('connection_id=eq.conn&operation_id=eq.lease'));calls.push('save');return [c];},api:async(p,t)=>{assert.equal(p,'user');assert.equal(t,token.access_token);calls.push('api');}};
 assert.equal(await access(c,deps),token.access_token);assert.deepEqual(calls,['refresh','save','api']);calls.length=0;assert.equal(await access({...c,expires_at:Date.now()/1000+1000},deps),'old');assert.equal(calls.length,0);
 await assert.rejects(()=>access(c,{...deps,save:async()=>[]}),/changed/);
});
test('sync pages history, preserves source IDs, saves summaries for owned returned rows, and releases its lease',async()=>{
 const calls=[],urls=[];let released=false;const c={user_id:owner,next_page:6};
 const d={...defaults,identify:async()=>owner,connection:async()=>c,acquire:async()=>c,access:async()=>token.access_token,release:async()=>{released=true;},wahoo:async(path)=>{urls.push(path);return {workouts:[workout,{...workout,id:43,workout_type_id:1}],total:152};},db:async(p,o)=>{calls.push({p,o});if(p.startsWith('rides?'))return [{...recording(workout,owner).ride,id:'saved-ride'},{...recording(workout,'other').ride,id:'not-ours'}];return [c];}};
 const res=response();await createSync(d)({method:'POST',query:{older:'1'}},res);assert.equal(urls.length,1);assert.ok(urls[0].endsWith('page=6'));assert.equal(res.data.imported,1);assert.equal(res.data.hasMore,false);assert.equal(calls.find(c=>c.p.startsWith('ride_details')).o.body.length,1);assert.ok(released);
 released=false;await assert.rejects(()=>createSync({...d,wahoo:async()=>{throw Error('rate limit');}})({method:'POST',query:{}},response()));assert.ok(released);
});
test('lease acquisition atomically blocks concurrent imports and enforces the cooldown',async()=>{
 await assert.rejects(()=>acquire(owner,{cooldown:true,save:async(p,o)=>{assert.ok(p.includes('busy_until.lt.'));assert.ok(p.includes('last_import_attempt.lt.'));assert.ok(o.body.operation_id);return [];}}),e=>e.status===429);
});
test('disconnect revokes the provider and deletes only its connection, retaining rides',async()=>{
 const calls=[];let released=false;const c={user_id:owner};const d={...defaults,identify:async()=>owner,connection:async()=>c,acquire:async()=>c,access:async()=>token.access_token,wahoo:async(p,o,opts)=>{assert.equal(p,'permissions');assert.equal(opts.method,'DELETE');calls.push('revoke');},db:async(p,o)=>{calls.push(p);assert.equal(o.method,'DELETE');},release:async()=>{released=true;}};
 await createDisconnect(d)({method:'POST'},response());assert.equal(calls[0],'revoke');assert.ok(calls[1].startsWith('wahoo_connections?'));assert.ok(!calls.some(p=>p.startsWith('rides?')));assert.ok(released);
});
