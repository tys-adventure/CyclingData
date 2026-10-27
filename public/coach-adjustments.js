import {monday} from './rides.js';
import {dateKey,calendarDate,addDays} from './planner.js';
export const adaptivePlan=s=>s?.coach_key?.startsWith('coach:')&&s.notes?.startsWith('Adaptive coach draft ·');
export const canonicalCoachKey=key=>String(key||'').replace(/^locked:/,'');
export function trainingAdjustment({profile,baseline,rides,sessions,checkin,now}){
 const today=dateKey(now),start=monday(now),lastStart=addDays(start,-7),last=rides.filter(r=>new Date(r.started_at)>=lastStart&&new Date(r.started_at)<start);
 const lastMinutes=last.reduce((sum,r)=>sum+Math.max(0,Number(r.duration_s)||0)/60,0),lastDays=new Set(last.map(r=>dateKey(r.started_at))).size;
 const due=sessions.filter(s=>!s.archived&&s.session_type!=='rest'&&s.session_date>=dateKey(addDays(now,-14))&&s.session_date<today);
 const days=[...new Set(due.map(s=>s.session_date))];
 let missedDays=0;
 for(const day of days){const plans=due.filter(s=>s.session_date===day);if(plans.some(s=>s.status==='completed'))continue;const actual=rides.filter(r=>new Date(r.started_at)<=now&&dateKey(r.started_at)===day).reduce((sum,r)=>sum+Math.max(0,Number(r.duration_s)||0)/60,0);const target=plans.reduce((sum,s)=>sum+(Number(s.duration_min)||15),0);if(actual<target*.5)missedDays++;}
 const dropAlreadyApplied=baseline.source==='history'&&lastMinutes<baseline.minutes*.7;
 if(!dropAlreadyApplied&&days.length>=2&&missedDays/days.length>=.5)return {factor:.8,kind:'missed',reason:'At least half of two or more due training days lack enough recorded riding or a completed-plan check-in. The default is reduced 20%; missed sessions are not stacked into later days.',missedDays,dueDays:days.length,lastDays,lastMinutes};
 if(baseline.source!=='history'&&baseline.recordedRides>=2&&lastMinutes<baseline.minutes*.7)return {factor:.8,kind:'lower-volume',reason:'Last week’s recorded time was below 70% of your manual baseline. The default is reduced 20%; confirm your imports are complete before interpreting the change.',missedDays,dueDays:days.length,lastDays,lastMinutes};
 const growth={beginner:0,returning:0,intermediate:.03,experienced:.05}[profile.experience]||0;
 if(growth&&baseline.activeWeeks>=3&&['fresh','normal'].includes(checkin?.recovery)&&lastDays>=baseline.daysPerWeek+1&&lastMinutes>baseline.minutes*1.05&&lastMinutes<=baseline.minutes*1.3)return {factor:1+growth,kind:'more-consistent',reason:'Last week contained more riding days and a modest increase in time, with a normal/fresh check-in. The default rises by '+Math.round(growth*100)+'% within your time and session caps.',missedDays,dueDays:days.length,lastDays,lastMinutes};
 return {factor:1,kind:'steady',reason:lastDays>baseline.daysPerWeek?'Riding frequency is higher, but that alone does not justify increasing workload. Recovery, recent time, and your limits still apply.':'Targets are recalculated from recorded training and due sessions when RideVector refreshes.',missedDays,dueDays:days.length,lastDays,lastMinutes};
}
export function missedAllocationMinutes({allocation,start,rides,sessions,now}){
 const today=dateKey(now);let expected=0,credit=0;
 for(let day=0;day<7;day++){
  const date=dateKey(addDays(start,day));if(date>=today)continue;
  const due=sessions.filter(s=>!s.archived&&s.session_type!=='rest'&&s.session_date===date);
  if(due.length)expected+=Math.min(allocation.get(day)||0,due.reduce((s,p)=>s+(Number(p.duration_min)||(allocation.get(day)||0)),0));
  const actual=rides.filter(r=>new Date(r.started_at)<=now&&dateKey(r.started_at)===date).reduce((s,r)=>s+Math.max(0,Number(r.duration_s)||0)/60,0);
  const completed=sessions.filter(s=>!s.archived&&s.status==='completed'&&s.session_type!=='rest'&&s.session_date===date).reduce((s,p)=>s+(Number(p.duration_min)||0),0);
  credit+=Math.max(actual,completed);
 }
 return Math.max(0,expected-credit);
}
