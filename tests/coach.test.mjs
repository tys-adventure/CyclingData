import assert from 'node:assert/strict';
import {validateCoachProfile,validateCheckin,buildCoachWeek} from '../public/coach.js';
import {miles,metersFromMiles} from '../public/units.js';
const profile=validateCoachProfile({experience:'intermediate',available_days:[1,3,5,6],weekly_minutes:360,long_minutes:120,long_day:6,planning_mph:12,baseline_miles:60,target_race_id:'race',started_week:'2026-10-12'});
const race={id:'race',name:'Stage race',race_date:'2027-05-14',race_end_date:'2027-05-16',distance_m:321868.8,race_type:'road',goal:'compete'};
const monday=new Date(2026,9,12,12),wednesday=new Date(2026,9,14,12);
const make=(extra={})=>buildCoachWeek({profile,races:[race],rides:[],week:monday,now:wednesday,...extra});
const draft=make();assert.equal(draft.state,'ready');assert.equal(draft.phase,'Base');assert.equal(draft.targetMiles,60);assert.equal(draft.stageDays,3);assert.ok(Math.abs(draft.averageStageMiles-200/3)<.01);
assert.ok(draft.days.filter(d=>d.duration_min).every(d=>d.duration_min<=120));assert.ok(draft.targetMinutes<=360);
const full=make({now:monday});assert.equal(full.targetMiles,draft.targetMiles);
for(const day of draft.days){const original=full.days.find(d=>d.date===day.date);assert.ok((day.duration_min||0)<=(original.duration_min||0));}
assert.equal(draft.days.find(d=>d.date==='2026-10-13').kind,'past');
const doneRide={id:'ridden',started_at:new Date(2026,9,14,8).toISOString(),distance_m:metersFromMiles(70),duration_s:3600};
const met=make({rides:[doneRide]});assert.ok(met.suggestions.every(d=>d.session_type==='rest'));assert.equal(met.days.find(d=>d.date==='2026-10-14').kind,'recorded');
const timeMet=make({rides:[{...doneRide,distance_m:1000,duration_s:360*60}]});assert.ok(timeMet.suggestions.every(d=>d.session_type==='rest'));
const tired=make({checkin:{recovery:'tired'}});assert.ok(tired.targetMinutes<draft.targetMinutes);assert.ok(tired.suggestions.every(d=>d.session_type==='easy'||d.session_type==='rest'));
const rest=make({checkin:{recovery:'tired',override_distance_m:0}});assert.equal(rest.targetMinutes,0);
const override=make({checkin:{recovery:'tired',override_distance_m:metersFromMiles(30)}});assert.equal(override.targetMiles,30);
const saved=draft.suggestions.find(d=>d.kind==='suggestion');
const kept=make({sessions:[{...saved,session_date:saved.date,archived:false,status:'planned',id:'saved'}]});assert.equal(kept.days.find(d=>d.date===saved.date).kind,'existing');assert.ok(!kept.suggestions.some(d=>d.date===saved.date));
const archived=make({sessions:[{...saved,session_date:saved.date,archived:true,status:'planned',id:'saved'}]});assert.equal(archived.days.find(d=>d.date===saved.date).kind,'existing');
const budget=make({profile:{...profile,weekly_minutes:60,long_minutes:30}});assert.ok(budget.targetMinutes<=60);assert.ok(budget.rangeHigh<=12);
const raceWeek=make({week:new Date(2027,4,10)});assert.equal(raceWeek.phase,'Race week');for(const date of ['2027-05-14','2027-05-15','2027-05-16'])assert.equal(raceWeek.days.find(d=>d.date===date).kind,'race');
assert.equal(make({week:new Date(2027,4,3)}).phase,'Taper');assert.equal(make({week:new Date(2027,4,17)}).phase,'Recovery');assert.equal(make({week:new Date(2027,4,31)}).state,'finished');
assert.equal(make({profile:null}).state,'setup');assert.equal(make({races:[]}).state,'race');assert.equal(make({profile:{...profile,baseline_miles:null}}).state,'baseline');
const returner=make({profile:{...profile,experience:'returning'}});assert.ok(returner.targetMinutes<draft.targetMinutes);
assert.throws(()=>validateCoachProfile({...profile,available_days:[0,1,2,3,4,5,6]}));assert.throws(()=>validateCoachProfile({...profile,available_days:[1,1]}));assert.throws(()=>validateCoachProfile({...profile,long_day:0}));assert.throws(()=>validateCoachProfile({...profile,long_minutes:480}));
assert.throws(()=>validateCheckin({week_start:'2026-10-13',recovery:'normal'},profile));assert.throws(()=>validateCheckin({week_start:'2026-10-12',recovery:'normal',override_distance_m:metersFromMiles(100)},profile));assert.equal(validateCheckin({week_start:'2026-10-12',recovery:'normal',override_distance_m:0},profile).override_distance_m,0);
const keys=draft.suggestions.map(d=>d.coach_key);assert.equal(new Set(keys).size,keys.length);assert.ok(draft.suggestions.every(d=>d.date>='2026-10-14'));
console.log('Coach baseline/budget caps, no catch-up, time and mileage completion, tired/edited targets, preserved plans, stage race days, taper/recovery, validation and duplicate keys passed.');

assert.equal(make({sessions:[{session_date:'2026-10-15',status:'planned',duration_min:600}]}).reviewCalendar,true);

assert.equal(make({checkin:{recovery:'normal',override_distance_m:metersFromMiles(12)}}).targetMiles,12);
