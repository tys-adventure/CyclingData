import {randomUUID} from 'node:crypto';
import {method,identify,error,db,randomState,hash,same,origin,json} from './server.mjs';
import * as w from './wahoo.mjs';

export const defaults={method,identify,error,db,randomState,hash,same,origin,json,...w,uuid:randomUUID,log:stage=>console.error('Wahoo callback failed',stage)};
export function createStart(d=defaults){return async(req,res)=>{
 d.method(req,['POST']);const user=await d.identify(req);
 if(!d.configured())throw d.error('Wahoo setup is pending. You can still upload FIT files.',503);
 const state=d.randomState();
 await d.db('wahoo_oauth_states?expires_at=lt.'+encodeURIComponent(new Date().toISOString()),{method:'DELETE'});
 await d.db('wahoo_oauth_states?user_id=eq.'+user,{method:'DELETE'});
 await d.db('wahoo_oauth_states',{method:'POST',body:{user_id:user,state_hash:d.hash(state),expires_at:new Date(Date.now()+600000).toISOString()}});
 res.setHeader('Set-Cookie',d.cookie(d.hash(state),600));
 const url=new URL('https://api.wahooligan.com/oauth/authorize');url.search=new URLSearchParams({client_id:process.env.WAHOO_CLIENT_ID,response_type:'code',redirect_uri:d.redirectURI,scope:d.scopes,state}).toString();
 d.json(res,200,{url:url.toString()});
};}
export function createCallback(d=defaults){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');let stage='callback';
 const fail=reason=>{throw Object.assign(new Error('Wahoo callback failed'),{reason});};
 try{
  d.method(req,['GET']);const {state,code,error:denied}=req.query;
  if(typeof state!=='string'||!/^[a-f0-9]{64}$/.test(state))fail('invalid_state');
  const browser=d.stateCookie(req);if(!browser||!d.same(d.hash(state),browser))fail('browser_session');
  res.setHeader('Set-Cookie',d.cookie('',0));stage='state_store';
  const rows=await d.db('wahoo_oauth_states?state_hash=eq.'+d.hash(state)+'&expires_at=gt.'+encodeURIComponent(new Date().toISOString()),{method:'DELETE'});
  const entry=rows?.[0];if(!entry)fail('expired');
  if(denied){res.redirect(303,d.origin+'/?wahoo=denied');return;}
  if(typeof code!=='string'||!code)fail('missing_code');
  stage='token_exchange';const token=d.tokenFields(await d.tokenRequest({grant_type:'authorization_code',code}));
  stage='profile';const profile=await d.wahoo('user',token.access_token);
  if(!Number.isSafeInteger(profile?.id)||profile.id<=0)fail('profile');
  stage='connection_save';
  await d.db('wahoo_connections?on_conflict=user_id',{method:'POST',body:{user_id:entry.user_id,wahoo_user_id:profile.id,connection_id:d.uuid(),...token,last_synced_at:null,next_page:null,busy_until:null,operation_id:null,last_import_attempt:null},prefer:'resolution=merge-duplicates,return=representation'});
  res.redirect(303,d.origin+'/?wahoo=connected');
 }catch(e){const reason=e.reason||stage;d.log(reason);res.redirect(303,d.origin+'/?wahoo='+encodeURIComponent(reason));}
};}
export function createSync(d=defaults){return async(req,res)=>{
 d.method(req,['POST']);const user=await d.identify(req);
 if(!await d.connection(user))throw d.error('Connect your Wahoo account first.',409);
 const c=await d.acquire(user,{cooldown:true});
 try{
  const token=await d.access(c),older=req.query?.older==='1';
  if(older&&!c.next_page)throw d.error('Your available Wahoo history has already been imported.',409);
  let page=older?c.next_page:1,imported=0,examined=0,nextPage=null;const skipped={};
  // One page keeps the extra detail reads within the provider and function budgets.
  for(let i=0;i<1;i++,page++){
   const batch=await d.wahoo('workouts?per_page=30&page='+page,token);
   if(!Array.isArray(batch?.workouts)||!Number.isSafeInteger(batch.total)||batch.total<0)throw d.error('Wahoo returned an unexpected workout list. Please retry.',502);
   examined+=batch.workouts.length;
   const workouts=[...batch.workouts];
   // A list entry can omit completed results. Check the authenticated show endpoint
   // before concluding that a cycling workout has no completed summary.
   for(let offset=0;offset<workouts.length;offset+=4){
    const details=await Promise.all(workouts.slice(offset,offset+4).map(async workout=>{
     if(!d.needsWorkoutDetail(workout))return workout;
     const full=await d.wahoo('workouts/'+workout.id,token);
     if(full?.id!==workout.id)throw d.error('Wahoo returned an unexpected workout. Please retry.',502);
     return full;
    }));
    workouts.splice(offset,details.length,...details);
   }
   const records=workouts.map(a=>{const issue=d.recordingIssue(a);if(issue)skipped[issue]=(skipped[issue]||0)+1;return d.recording(a,user);}).filter(Boolean);
   if(records.length){
    const saved=await d.db('rides?on_conflict=user_id,source,source_id',{method:'POST',body:records.map(r=>r.ride),prefer:'resolution=merge-duplicates,return=representation'});
    const payloads=new Map(records.map(r=>[r.ride.source_id,r.payload]));
    const details=(saved||[]).filter(r=>r.user_id===user&&r.source==='wahoo'&&payloads.has(r.source_id)).map(r=>({ride_id:r.id,payload:payloads.get(r.source_id),updated_at:new Date().toISOString()}));
    if(details.length)await d.db('ride_details?on_conflict=ride_id',{method:'POST',body:details,prefer:'resolution=merge-duplicates,return=minimal'});
    imported+=records.length;
   }
   if(batch.workouts.length===0||page*30>=batch.total){nextPage=null;break;}
   nextPage=page+1;
  }
  // Preserve an existing history cursor when refreshing the latest rides.
  const cursor=older?nextPage:c.next_page||nextPage;
  const updated=await d.db(d.leasePath(c),{method:'PATCH',body:{last_synced_at:new Date().toISOString(),next_page:cursor}});
  if(!updated?.length)throw d.error('Your Wahoo connection changed. Please retry.',409);
  d.json(res,200,{imported,examined,hasMore:Boolean(cursor),skipped});
 }finally{await d.release(c);}
};}
export function createDisconnect(d=defaults){return async(req,res)=>{
 d.method(req,['POST']);const user=await d.identify(req);
 if(!await d.connection(user)){d.json(res,200,{disconnected:true});return;}
 const c=await d.acquire(user);
 try{
  try{const token=await d.access(c);await d.wahoo('permissions',token,{method:'DELETE'});}catch(e){if(e.status!==401)throw e;}
  await d.db(d.leasePath(c),{method:'DELETE'});
  d.json(res,200,{disconnected:true});
 }finally{await d.release(c);}
};}
