import assert from 'node:assert/strict';
import {createCallback} from '../api/strava/callback.mjs';
import {hash,same,stateCookie,cookie,method} from '../lib/server.mjs';
import {stravaResultMessage} from '../public/strava-errors.js';
const state='a'.repeat(64),origin='https://ridevector.app';
async function run({query={},cookieValue=hash(state),expired=false,failStage=null,tokenScope=undefined}={}){
 const calls=[],logs=[];
 const deps={hash,same,stateCookie,cookie,method,origin,log:reason=>logs.push(reason),
  db:async(path,options)=>{calls.push({path,options});if(failStage==='save'&&path.startsWith('strava_connections'))throw Error('must not be logged');return path.startsWith('strava_oauth_states')?(expired?[]:[{user_id:'test-user'}]):[];},
  tokenRequest:async()=>{calls.push({token:true});if(failStage==='token')throw Error('secret must not be logged');return {scope:tokenScope,athlete:{id:123},access_token:'test-access',refresh_token:'test-refresh',expires_at:123456};}
 };
 const req={method:'GET',headers:{cookie:cookieValue===null?'':`cyclingdata_oauth=${cookieValue}`},query:{state,code:'test-code',scope:'read,activity:read_all',...query}};
 const res={headers:{},setHeader(key,value){this.headers[key]=value;},redirect(status,url){this.status=status;this.url=url;}};
 await createCallback(deps)(req,res);
 return {res,calls,logs,result:new URL(res.url).searchParams.get('strava')};
}
for(const scope of ['read,activity:read_all','read activity:read_all']){
 const result=await run({query:{scope}});assert.equal(result.result,'connected');
 assert.equal(result.calls.filter(c=>c.token).length,1);
 assert.ok(result.res.headers['Set-Cookie'].includes('HttpOnly; Secure; SameSite=Lax'));
}
for(const scope of ['activity:read','read,activity:read','read activity:read']){
 const result=await run({query:{scope}});assert.equal(result.result,'connected_limited');
 assert.equal(result.calls.filter(c=>c.token).length,1);
 assert.equal(result.calls.find(c=>c.path?.startsWith('strava_connections')).options.body.scope,scope);
}
assert.equal((await run({tokenScope:'read activity:read'})).result,'connected_limited');
assert.equal((await run({tokenScope:'read'})).result,'activity_permission');
for(const [options,reason] of [[{cookieValue:null},'browser_session'],[{cookieValue:'b'.repeat(64)},'state_mismatch'],[{query:{state:'invalid'}},'invalid_state']]){
 const result=await run(options);assert.equal(result.result,reason);assert.equal(result.calls.length,0);
}
assert.equal((await run({expired:true})).result,'expired');
const permission=await run({query:{scope:'read'}});assert.equal(permission.result,'activity_permission');assert.equal(permission.calls.filter(c=>c.token).length,0);
assert.equal((await run({query:{error:'access_denied'}})).result,'denied');
assert.equal((await run({query:{code:''}})).result,'missing_code');
for(const [stage,reason] of [['token','token_exchange'],['save','connection_save']]){
 const result=await run({failStage:stage});assert.equal(result.result,reason);assert.deepEqual(result.logs,[reason]);
 assert.ok(!JSON.stringify(result.logs).includes('secret'));
}
assert.ok(stravaResultMessage('browser_session').includes('Safari or Chrome'));
assert.ok(stravaResultMessage('activity_permission').includes('permission'));
assert.ok(!stravaResultMessage('<script>').includes('<script>'));
console.log('OAuth success, comma/space scopes, missing and mismatched cookies, expired state, permission denial, token/save errors, and safe logs passed.');

assert.ok(stravaResultMessage('connected_limited').includes('without private-activity access'));
console.log('Limited activity scopes succeed and returned token scopes are respected.');
