import {timeInZones} from './zones.js';
import {dateKey,addDays} from './planner.js';
export function coachTime(minutes){
 const total=Math.max(0,Math.round(Number(minutes)||0)),h=Math.floor(total/60),m=total%60;
 return h?(h+' hr'+(h===1?'':'s')+(m?' '+m+' min':'')):total+' min';
}
export function coachEvidence({rides=[],recordings={},zones=null,now=new Date(),baselineMinutes=0}){
 const recent=rides.filter(r=>new Date(r.started_at)<=now&&new Date(r.started_at)>=addDays(now,-7));
 let coveredMinutes=0,highMinutes=0,powerRides=0,hrRides=0,lastHardEnd=null;
 const analyses=[];
 for(const ride of recent){
  const payload=recordings[ride.id];if(!payload)continue;
  const duration=Math.max(0,Number(ride.duration_s)||0);if(!duration)continue;
  let result=null,source='';
  if(payload.summary?.device_watts!==false){const p=timeInZones(payload.streams,'power',zones);if(p.covered>=duration*.6){result=p;source='power';}}
  if(!result){const h=timeInZones(payload.streams,'hr',zones);if(h.covered>=duration*.6){result=h;source='heart rate';}}
  if(!result)continue;
  const high=result.seconds.slice(3).reduce((s,x)=>s+x,0)/60;
  const coverage=result.covered/60;
  coveredMinutes+=coverage;highMinutes+=high;
  if(source==='power')powerRides++;else hrRides++;
  const finish=new Date(Math.min(now.getTime(),Date.parse(ride.started_at)+duration*1000));
  if(high>=20&&(!lastHardEnd||finish>lastHardEnd))lastHardEnd=finish;
  analyses.push({rideId:ride.id,source,highMinutes:high,coveredMinutes:coverage});
 }
 const recentMinutes=recent.reduce((s,r)=>s+Math.max(0,Number(r.duration_s)||0)/60,0);
 const recentDays=new Set(recent.map(r=>dateKey(r.started_at))).size;
 const hardWithin48h=!!lastHardEnd&&now-lastHardEnd<48*3600000;
 const volumeSpike=baselineMinutes>0&&recentMinutes>baselineMinutes*1.3;
 return {recentMinutes,recentDays,coveredMinutes,highMinutes,powerRides,hrRides,analyses,unknownRides:recent.length-analyses.length,
  hardWithin48h,volumeSpike,lastHardEnd,volumeFactor:(hardWithin48h||volumeSpike)? .85:1};
}

