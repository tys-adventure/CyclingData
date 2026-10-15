import {activityAccess} from '../../lib/strava-scopes.mjs';
import {method,db,hash,same,stateCookie,cookie,tokenRequest,origin} from '../../lib/server.mjs';
export function createCallback(deps={method,db,hash,same,stateCookie,cookie,tokenRequest,origin,log:reason=>console.error('Strava callback failed',reason)}) {
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');let stage='callback';
  const fail=reason=>{throw Object.assign(new Error('Strava callback failed'),{callbackReason:reason});};
  try {
   deps.method(req,['GET']);
   const {state,code,scope,error}=req.query;
   if(typeof state!=='string'||!/^[a-f0-9]{64}$/.test(state))fail('invalid_state');
   const savedCookie=deps.stateCookie(req);
   if(!savedCookie)fail('browser_session');
   if(!deps.same(deps.hash(state),savedCookie))fail('state_mismatch');
   res.setHeader('Set-Cookie',deps.cookie('',0));
   stage='state_store';
   const rows=await deps.db('strava_oauth_states?state_hash=eq.'+deps.hash(state)+'&expires_at=gt.'+encodeURIComponent(new Date().toISOString()),{method:'DELETE'});
   const entry=rows?.[0];if(!entry)fail('expired');
   if(error){res.redirect(303,deps.origin+'/?strava=denied');return;}
   if(typeof code!=='string'||!code)fail('missing_code');
   if(activityAccess(scope)==='none')fail('activity_permission');
   stage='token_exchange';
   const token=await deps.tokenRequest({grant_type:'authorization_code',code});
   if(!token.athlete?.id||!token.access_token||!token.refresh_token)fail('token_response');
   const effectiveScope=typeof token.scope==='string'?token.scope:scope;
   const access=activityAccess(effectiveScope);
   if(access==='none')fail('activity_permission');
   stage='connection_save';
   await deps.db('strava_connections?on_conflict=user_id',{method:'POST',body:{user_id:entry.user_id,athlete_id:token.athlete.id,access_token:token.access_token,refresh_token:token.refresh_token,expires_at:token.expires_at,scope:effectiveScope},prefer:'resolution=merge-duplicates,return=representation'});
   res.redirect(303,deps.origin+'/?strava='+(access==='limited'?'connected_limited':'connected'));
  }catch(e){
   const reason=e.callbackReason||stage;
   deps.log(reason);
   res.redirect(303,deps.origin+'/?strava='+encodeURIComponent(reason));
  }
 };
}
export default createCallback();
