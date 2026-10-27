import assert from 'node:assert/strict';
import {buildCalendarICS,foldICS} from '../lib/calendar-ics.mjs';
import {calendarSignature,validCalendarSignature,authorizeCalendar} from '../lib/calendar.mjs';
import link from '../api/calendar/link.mjs';
import feed from '../api/calendar/feed.mjs';
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const process=globalThis.process||(globalThis.process={env:{}});
const previousFetch=globalThis.fetch,env={SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY,SUPABASE_SECRET_KEY:process.env.SUPABASE_SECRET_KEY,SUPABASE_PUBLISHABLE_KEY:process.env.SUPABASE_PUBLISHABLE_KEY};
process.env.SUPABASE_URL='https://calendar-test.invalid';process.env.SUPABASE_SECRET_KEY='sb_secret_calendar_test';process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_calendar_test';
let record={id:owner,app_metadata:{providers:['email']},user_metadata:{ridevector_calendar:{enabled:true,nonce:'0'.repeat(64)}}},writes=0,reads=[];
const session={id:'s1',title:'Ride, recover; repeat\nBEGIN:BAD',session_date:'2026-10-28',session_type:'easy',duration_min:45,status:'planned',notes:'PRIVATE HEALTH NOTE'};
const race={id:'r1',name:'Two day race',race_date:'2027-05-14',race_end_date:'2027-05-15'};
globalThis.fetch=async(url,opts={})=>{
 if(String(url).endsWith('/auth/v1/user'))return Response.json({id:owner});
 if(String(url).includes('/auth/v1/admin/users/')){assert(String(url).endsWith(owner));if(opts.method==='PUT'){writes++;record.app_metadata={...record.app_metadata,...JSON.parse(opts.body).app_metadata};}return Response.json(record);}
 if(String(url).includes('/rest/v1/')){assert(String(url).includes('user_id=eq.'+owner));reads.push(url);return Response.json(String(url).includes('training_sessions')?[session]:[race]);}
 throw Error('Unexpected fetch destination');
};
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v},status(s){this.code=s;return this},json(v){this.body=v},send(v){this.body=v}});
const call=async(handler,req)=>{const res=response();await handler({query:{},headers:{},...req},res);return res;};
try{
 assert.equal((await call(link,{method:'GET'})).code,401);
 const auth={authorization:'Bearer test-session'};
 let result=await call(link,{method:'GET',headers:auth});assert.equal(result.body.enabled,false);assert.equal(writes,0);
 result=await call(link,{method:'POST',headers:auth,body:{action:'enable'}});assert.equal(result.code,200);assert.equal(record.app_metadata.providers[0],'email');
 const first=new URL(result.body.url),query=Object.fromEntries(first.searchParams);
 assert(validCalendarSignature(query.u,query.v,query.s));assert(!validCalendarSignature(other,query.v,query.s));assert(!validCalendarSignature(owner,query.v,'0'.repeat(64)));
 assert.equal((await call(feed,{method:'GET',query:{...query,u:other}})).code,404);
 result=await call(feed,{method:'GET',query});assert.equal(result.code,200);assert.equal(result.headers['Cache-Control'],'private, no-store');assert.equal(reads.length,2);
 assert(result.body.includes('DTEND;VALUE=DATE:20270516'));assert(result.body.includes('UID:session-s1@ridevector.app'));assert(!result.body.includes('PRIVATE HEALTH NOTE'));
 assert(!result.body.includes('\r\nBEGIN:BAD'));assert(result.body.includes('SUMMARY:Ride\\, recover\\; repeat\\nBEGIN:BAD'));
 result=await call(link,{method:'POST',headers:auth,body:{action:'rotate'}});assert.notEqual(result.body.url,first.toString());
 assert.equal((await call(feed,{method:'GET',query})).code,404);
 const next=Object.fromEntries(new URL(result.body.url).searchParams);
 await call(link,{method:'POST',headers:auth,body:{action:'disable'}});
 assert.equal((await call(feed,{method:'GET',query:next})).code,404);
 assert.equal((await call(link,{method:'POST',headers:auth,body:{action:'unexpected'}})).code,400);
 const folded=foldICS('SUMMARY:'+('🚴é'.repeat(100)));assert(folded.split('\r\n').every(line=>Buffer.byteLength(line)<=75));assert.equal(folded.replace(/\r\n /g,''),'SUMMARY:'+('🚴é'.repeat(100)));
 const ics=buildCalendarICS({sessions:[session,{...session,id:'s2',archived:true},{...session,id:'s3',status:'skipped'}],races:[race],now:new Date('2026-10-26T12:00:00Z')});
 assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,2);assert(ics.endsWith('\r\n'));
 console.log('Calendar auth, owner scoping, token rotation/revocation, private fields, multiday dates, stable IDs, injection escaping and UTF-8 folding passed.');
}finally{globalThis.fetch=previousFetch;for(const [k,v]of Object.entries(env))if(v===undefined)delete process.env[k];else process.env[k]=v;}
