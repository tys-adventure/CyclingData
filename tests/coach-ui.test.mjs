import assert from 'node:assert/strict';
import {createCoach} from '../public/coach-ui.js';
import {dateKey,addDays} from '../public/planner.js';
import {monday} from '../public/rides.js';
const previousDocument=globalThis.document;
const nodes=new Map(),node=key=>{if(!nodes.has(key))nodes.set(key,{innerHTML:'',textContent:'',disabled:false,close(){},showModal(){}});return nodes.get(key)};
globalThis.document={querySelector:node,addEventListener(){}};
try{
 const now=new Date(),start=monday(now),user={id:'test-user'},profile={experience:'intermediate',available_days:[1,3,5,6],weekly_minutes:600,long_minutes:180,long_day:6,planning_mph:12,baseline_miles:72,target_race_id:'race',started_week:dateKey(start)};
 const client={from:table=>({select(){return this},order(){return this},maybeSingle:async()=>({data:profile}),range:async()=>({data:[]}),in:async()=>({data:[]})})};
 const coach=createCoach({getClient:()=>client,getUser:()=>user,getZones:()=>null,getRaces:()=>[{id:'race',name:'Test <race>',race_date:dateKey(addDays(now,90)),race_type:'road'}],getRides:()=>[],getSessions:()=>[],needUser:()=>true,notify(){},openCoach(){},openTraining(){},openRaces(){},refreshCalendar(){}});
 await coach.load();
 const html=node('#coach-panel').innerHTML;
 assert(html.includes('Weekly riding time'));assert(html.includes('6 hrs'));assert(html.includes('Intensity is unknown'));assert(html.includes('Recovery & recent workload'));assert(html.includes('No check-in for this week'));assert(html.includes('Consistency'));assert(html.includes('Test &lt;race&gt;'));assert(!html.includes('NaN'));assert(!html.includes('undefined'));assert(!html.includes('Weekly distance target'));
 assert(node('#dashboard-coach').innerHTML.includes('6 hrs'));
 coach.reset();assert(node('#coach-panel').innerHTML.includes('Loading your private setup'));
 console.log('Coach UI renders time, consistency, missing intensity and recovery states without invalid values.');
}finally{globalThis.document=previousDocument;}

