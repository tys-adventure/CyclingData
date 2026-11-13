import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateRide,manualRide,parseCSV,weekStats,monday} from '../public/rides.js';
import {ridesFromFITMessages} from '../public/fit.js';
import {rideFromActivity} from '../lib/server.mjs';
import {recording} from '../lib/wahoo.mjs';
import {sameRecording,uniqueRecordings} from '../public/duplicates.js';
import {rangeStats,dashboardRange} from '../public/ranges.js';
import {personalRecords} from '../public/planner.js';
import {trainingTrend} from '../public/training.js';
import {renderRideDetails} from '../public/details.js';
const base={name:'Indoor spin',started_at:'2026-11-13T10:00:00Z',distance_m:null,elevation_m:0,duration_s:2700,indoor:true,source:'fit',source_id:'fit1',id:'fit1'};
test('indoor manual entry requires duration, retains unknown distance and optional sensors/notes',()=>{
 const r=manualRide({kind:'indoor',name:base.name,started_at:base.started_at,distance:'',elevation:'',duration:'45',heart_rate:'140',power:'180',cadence:'85',notes:'Class <hard>',source_id:'manual1'});
 assert.equal(r.distance_m,null);assert.equal(r.duration_s,2700);assert.equal(r._details.summary.average_cadence,85);assert.equal(r._details.summary.notes,'Class <hard>');
 assert.equal(validateRide({...base,distance_m:0}).distance_m,null);
 for(const override of [{duration_s:0},{duration_s:-1},{distance_m:-1},{distance_m:NaN},{indoor:false},{indoor:'true'}])assert.throws(()=>validateRide({...base,...override}));
 assert.throws(()=>manualRide({kind:'indoor',name:'Ride',started_at:base.started_at,duration:'45',power:'oops'}));
 assert.equal(parseCSV('name,date,duration_minutes,indoor\nSpin,2026-11-13T10:00:00Z,45,true')[0].distance_m,null);
 assert.throws(()=>parseCSV('name,date,duration_minutes,indoor\nRun,2026-11-13T10:00:00Z,45,false'));
});
test('Strava trainer and virtual rides import without distance; outdoor validation stays strict',()=>{
 const a={sport_type:'Ride',trainer:true,id:42,name:'Trainer',start_date:base.started_at,moving_time:0,elapsed_time:2700,distance:0};
 const r=rideFromActivity(a,'owner');assert.equal(r.indoor,true);assert.equal(r.distance_m,null);assert.equal(r.duration_s,2700);
 assert.equal(rideFromActivity({...a,sport_type:'VirtualRide',trainer:false,distance:12000},'owner').distance_m,12000);
 assert.equal(rideFromActivity({...a,distance:undefined,moving_time:2700},'owner').distance_m,null);
 for(const override of [{trainer:false},{sport_type:'Workout'},{sport_type:'Run'},{elapsed_time:0},{distance:-1}])assert.equal(rideFromActivity({...a,...override},'owner'),null);
});
test('all Wahoo indoor cycling categories import duration-only while planned and noncycling sessions stay excluded',()=>{
 const workout={id:43,starts:base.started_at,workout_type_id:12,workout_summary:{duration_active_accum:'2700',power_avg:'180',heart_rate_avg:'140',cadence_avg:'85'}};
 for(const workout_type_id of [12,21,49,61,68]){const r=recording({...workout,workout_type_id},'owner');assert.equal(r.ride.indoor,true);assert.equal(r.ride.distance_m,null);assert.equal(r.payload.summary.timer_s,2700);assert.equal(r.payload.summary.average_cadence,85);}
 for(const override of [{workout_type_id:15},{workout_type_id:17},{workout_type_id:18},{workout_summary:null},{workout_summary:{duration_active_accum:'0'}},{workout_summary:{duration_active_accum:'0.1'}},{workout_summary:{duration_active_accum:'2700',distance_accum:'bad'}}])assert.equal(recording({...workout,...override},'owner'),null);
});
test('Garmin FIT indoor, spin and virtual subsports preserve timer duration and sensors without distance',()=>{
 for(const subSport of ['indoor_cycling','spin','virtual_activity',5,6,58]){
 const [r]=ridesFromFITMessages({fileIdMesgs:[{type:'activity'}],sessionMesgs:[{sport:'cycling',subSport,startTime:base.started_at,totalTimerTime:2700,avgCadence:85,avgPower:180}],recordMesgs:[]},'Garmin Indoor.fit');assert.equal(r.distance_m,null);assert.equal(r.indoor,true);assert.equal(r._details.summary.average_cadence,85);
 }
 assert.throws(()=>ridesFromFITMessages({fileIdMesgs:[{type:'activity'}],sessionMesgs:[{sport:'cycling',subSport:'road',startTime:base.started_at,totalTimerTime:2700}]}));
});
test('time-only duplicate matches need tight indoor timing; copies remain intact and recorded distance survives',()=>{
 const other={...base,id:'wahoo1',source:'wahoo',source_id:'wahoo1',distance_m:12000};assert.ok(sameRecording(base,other));
 const grouped=uniqueRecordings([base,other]);assert.equal(grouped.length,1);assert.equal(grouped[0].distance_m,12000);assert.equal(grouped[0]._copies[0].distance_m,null);
 for(const override of [{indoor:false},{source:'manual'},{source:'fit',source_id:'different'},{started_at:'2026-11-13T10:00:06Z'},{duration_s:2400},{user_id:'other'}])assert.equal(sameRecording({...base,user_id:'owner'},{...other,user_id:'owner',...override}),false);
 assert.equal(sameRecording({...base,duration_s:120},{...other,duration_s:120}),false);
});
test('duration-only rides count in totals, training and time records without distance records',()=>{
 const now=new Date('2026-11-13T23:00:00Z'),range=dashboardRange('week',now),stats=rangeStats([base],range.start,range.end);
 assert.equal(stats.distance,0);assert.equal(stats.duration,2700);assert.equal(stats.count,1);assert.equal(weekStats([base],monday(now)).duration,2700);
 const records=personalRecords([base],now);assert.equal(records.distance,null);assert.equal(records.week,null);assert.equal(records.duration.id,base.id);
 assert.equal(trainingTrend([base],range).points.reduce((sum,p)=>sum+p.load,0),45);
});
test('indoor details lead with time, escape notes, show cadence, and omit unavailable maps and distance charts',()=>{
 const target={innerHTML:'',querySelectorAll:()=>[],querySelector:()=>null};
 renderRideDetails(target,base,{summary:{average_watts:180,average_hr:140,average_cadence:85,notes:'Class <hard>'},streams:{}});
 assert.match(target.innerHTML,/Ride duration/);assert.match(target.innerHTML,/Not recorded/);assert.match(target.innerHTML,/Average cadence/);assert.match(target.innerHTML,/Class &lt;hard&gt;/);
 for(const absent of ['ride-route-map','speed-chart','distance-chart','Average speed'])assert.ok(!target.innerHTML.includes(absent));
});

test('dashboard time formatting and indoor breakdown use the requested dates and recorded seconds',async()=>{
 const {formatRidingTime,ridingTimeBreakdown}=await import('../public/riding-time.js');
 assert.equal(formatRidingTime(6097),'1 hr 42 min');assert.equal(formatRidingTime(2700),'45 min');assert.equal(formatRidingTime(7200),'2 hrs');
 const outdoor={...base,indoor:false,distance_m:10000,duration_s:3600},rides=[base,outdoor,{...base,started_at:'2026-11-12T10:00:00Z',duration_s:600}];
 const time=ridingTimeBreakdown(rides,{start:new Date('2026-11-13T00:00:00Z'),end:new Date('2026-11-14T00:00:00Z')});
 assert.equal(time.totalSeconds,6300);assert.equal(time.total,'1 hr 45 min');assert.equal(time.text,'Indoor 45 min · Outdoor 1 hr');assert.equal(time.indoorCount,1);
 const future=ridingTimeBreakdown(rides,{start:new Date('2026-11-13T00:00:00Z'),now:new Date('2026-11-13T09:00:00Z')});assert.equal(future.totalSeconds,0);
});
test('indoor time reduces remaining coach volume and can meet its whole target without mileage',async()=>{
 const {buildCoachWeek}=await import('../public/coach.js');
 const now=new Date(2026,10,13,12),week=monday(now),profile={experience:'intermediate',available_days:[1,3,5,6],weekly_minutes:360,long_minutes:120,long_day:6,planning_mph:12,baseline_miles:60,target_race_id:'race',started_week:'2026-11-09'},races=[{id:'race',name:'Future race',race_date:'2027-05-14',race_type:'road',goal:'compete'}];
 const model=rides=>buildCoachWeek({profile,races,rides,week,now});
 const ride={...base,started_at:new Date(2026,10,13,8).toISOString()},one=model([ride]);
 assert.equal(one.state,'ready');assert.equal(one.actual.minutes,45);assert.equal(one.actual.distance,0);assert.equal(one.consistency.daysActual,1);assert.equal(one.days.find(d=>d.date==='2026-11-13').kind,'recorded');
 assert.equal(one.evidence.recentMinutes,45);assert.equal(one.evidence.unknownRides,1);
 const completed=model([{...ride,duration_s:360*60}]);assert.equal(completed.actual.minutes,360);assert.ok(completed.suggestions.every(d=>d.session_type==='rest'));
});
