import {randomUUID} from 'node:crypto';
import {db,error,origin} from './server.mjs';

export const scopes='user_read workouts_read';
export const redirectURI=origin+'/api/wahoo/callback';
export const configured=()=>Boolean(process.env.WAHOO_CLIENT_ID&&process.env.WAHOO_CLIENT_SECRET);
export const cookie=(value,maxAge)=>'ridevector_wahoo_oauth='+value+'; Path=/api/wahoo/callback; HttpOnly; Secure; SameSite=Lax; Max-Age='+maxAge;
export const stateCookie=req=>req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('ridevector_wahoo_oauth='))?.slice('ridevector_wahoo_oauth='.length);
export function hasScopes(value){const granted=new Set(typeof value==='string'?value.split(/[\s,]+/):[]);return scopes.split(' ').every(s=>granted.has(s));}
export async function tokenRequest(fields){
 const response=await fetch('https://api.wahooligan.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({client_id:process.env.WAHOO_CLIENT_ID,client_secret:process.env.WAHOO_CLIENT_SECRET,redirect_uri:redirectURI,...fields}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw error('Wahoo authorization could not be completed. Please reconnect.',response.status===400||response.status===401?401:502);
 return response.json();
}
export async function wahoo(path,token,{method='GET'}={}){
 const response=await fetch('https://api.wahooligan.com/v1/'+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/json','Content-Type':'application/json'},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw error(response.status===429?'Wahoo’s rate limit was reached. Wait a few minutes and retry.':response.status===401||response.status===403?'Wahoo access expired or is missing permission. Disconnect and reconnect.':'Wahoo could not load your workouts.',response.status===429?429:response.status===401||response.status===403?401:502);
 return response.status===204||method==='DELETE'?null:response.json();
}
export const connection=async user=>(await db('wahoo_connections?user_id=eq.'+encodeURIComponent(user)+'&select=*'))?.[0];
export function tokenFields(token){
 if(typeof token.access_token!=='string'||!token.access_token||typeof token.refresh_token!=='string'||!token.refresh_token||!Number.isFinite(token.expires_in)||token.expires_in<=0||!hasScopes(token.scope))throw error('Wahoo did not grant the required read permissions. Please reconnect.',401);
 return {access_token:token.access_token,refresh_token:token.refresh_token,expires_at:Math.floor(Date.now()/1000)+token.expires_in,scope:token.scope};
}
// Every token refresh happens under a per-connection lease, immediately before an API call.
// Using the new token against /user also retires Wahoo's previous rotating token.
export async function access(c,{request=tokenRequest,api=wahoo,save=db}={}){
 if(c.expires_at>Date.now()/1000+90)return c.access_token;
 const fresh=tokenFields(await request({grant_type:'refresh_token',refresh_token:c.refresh_token}));
 const saved=await save('wahoo_connections?user_id=eq.'+c.user_id+'&connection_id=eq.'+c.connection_id+'&operation_id=eq.'+c.operation_id,{method:'PATCH',body:fresh});
 if(!saved?.length)throw error('Your Wahoo connection changed. Please retry.',409);
 await api('user',fresh.access_token);
 return fresh.access_token;
}
export async function acquire(user,{cooldown=false,save=db}={}){
 const now=new Date(),operation=randomUUID();
 const filter='wahoo_connections?user_id=eq.'+encodeURIComponent(user)+'&or=(busy_until.is.null,busy_until.lt.'+encodeURIComponent(now.toISOString())+')'+(cooldown?'&and=(or(last_import_attempt.is.null,last_import_attempt.lt.'+encodeURIComponent(new Date(now-60000).toISOString())+'))':'');
 const rows=await save(filter,{method:'PATCH',body:{operation_id:operation,busy_until:new Date(+now+90000).toISOString(),...(cooldown?{last_import_attempt:now.toISOString()}:{})}});
 if(!rows?.length)throw error('Wahoo is busy or an import just ran. Wait one minute and retry.',429);
 return rows[0];
}
export const leasePath=c=>'wahoo_connections?user_id=eq.'+c.user_id+'&connection_id=eq.'+c.connection_id+'&operation_id=eq.'+c.operation_id;
export const release=c=>db(leasePath(c),{method:'PATCH',body:{busy_until:null,operation_id:null}});
const cyclingTypes=new Set([0,11,12,13,14,15,16,21,49,61,64,68,70]);
const decimal=(value,max)=>{if(value===null||value===undefined||value===''||!['string','number'].includes(typeof value))return null;const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=max?n:null;};
export function recording(workout,user){
 const s=workout?.workout_summary;
 if(!s||!cyclingTypes.has(workout.workout_type_id)||!Number.isSafeInteger(workout.id)||workout.id<=0||typeof workout.starts!=='string'||!Number.isFinite(Date.parse(workout.starts)))return null;
 const distance=decimal(s.distance_accum,10000000),duration=decimal(s.duration_active_accum,604800),elevation=decimal(s.ascent_accum,100000);
 if(distance===null||duration===null)return null;
 return {ride:{user_id:user,name:String(s.name||workout.name||'Wahoo ride').slice(0,160),started_at:new Date(workout.starts).toISOString(),distance_m:distance,elevation_m:elevation??0,duration_s:Math.round(duration),source:'wahoo',source_id:String(workout.id)},payload:{source:'wahoo',summary:{elapsed_s:decimal(s.duration_total_accum,604800),timer_s:duration,moving_s:null,average_watts:decimal(s.power_avg,5000),average_hr:decimal(s.heart_rate_avg,300),average_speed:decimal(s.speed_avg,150),moving_estimated:false},streams:{}}};
}
