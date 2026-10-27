import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {supabaseURL,serviceKey,error,origin} from './server.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,hex=/^[0-9a-f]{64}$/;
export const calendarNonce=()=>randomBytes(32).toString('hex');
export function calendarSignature(user,nonce,key=serviceKey()){
 if(!key)throw error('Calendar subscription is not configured.',503);
 return createHmac('sha256',key).update('ridevector:calendar:v1:'+user+':'+nonce).digest('hex');
}
export function validCalendarSignature(user,nonce,signature,key=serviceKey()){
 if(typeof user!=='string'||!uuid.test(user)||typeof nonce!=='string'||!hex.test(nonce)||typeof signature!=='string'||!hex.test(signature))return false;
 const expected=calendarSignature(user,nonce,key);return timingSafeEqual(Buffer.from(expected),Buffer.from(signature));
}
export function calendarURL(user,nonce){return origin+'/api/calendar/feed?u='+user+'&v='+nonce+'&s='+calendarSignature(user,nonce);}
export async function calendarUser(id,metadata){
 if(!uuid.test(id)||!supabaseURL()||!serviceKey())throw error('Calendar access unavailable.',503);
 const key=serviceKey(),headers={apikey:key,'Content-Type':'application/json'};
 if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
 const r=await fetch(supabaseURL()+'/auth/v1/admin/users/'+id,{method:metadata===undefined?'GET':'PUT',headers,body:metadata===undefined?undefined:JSON.stringify({app_metadata:metadata}),signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw error('Calendar access unavailable. Please sign in and retry.',r.status===404?404:502);
 const result=await r.json();return result.user||result;
}
export async function authorizeCalendar(query){
 if(!validCalendarSignature(query.u,query.v,query.s))throw error('Calendar link is invalid or disabled.',404);
 const user=await calendarUser(query.u),state=user.app_metadata?.ridevector_calendar;
 if(state?.enabled!==true||state.nonce!==query.v)throw error('Calendar link is invalid or disabled.',404);
 return user.id;
}
