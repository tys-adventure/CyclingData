import {buildCoachWeek} from './coach.js';
import {adaptivePlan} from './coach-adjustments.js';
import {monday} from './rides.js';
import {dateKey,calendarDate} from './planner.js';
export function adaptiveSessionChanges({profile,races,rides,sessions,checkins=[],recordings={},zones,now=new Date()}){
 if(!profile)return [];
 const today=dateKey(now),horizon=new Date(now);horizon.setDate(horizon.getDate()+35);
 const candidates=sessions.filter(s=>adaptivePlan(s)&&!s.archived&&s.status==='planned'&&s.session_date>today&&s.session_date<=dateKey(horizon));
 const ids=new Set(candidates.map(s=>s.id)),kept=sessions.filter(s=>!ids.has(s.id)),weeks=new Map(),changes=[];
 for(const session of candidates){
  const week=monday(calendarDate(session.session_date)),key=dateKey(week);
  if(!weeks.has(key))weeks.set(key,buildCoachWeek({profile,races,rides,sessions:kept,checkin:checkins.find(c=>c.week_start===key),recordings,zones,week,now}));
  const draft=weeks.get(key);if(draft.state!=='ready')continue;
  const day=draft.days.find(d=>d.date===session.session_date);if(!day)continue;
  const ride=day.kind==='suggestion',desired={title:ride?day.title:'Recovery / no extra coach ride',session_type:ride?day.session_type:'rest',duration_min:ride?day.duration_min:null,distance_m:ride?day.distance_m:null,notes:ride?day.notes:'Adaptive coach draft · '+draft.phase+'. No additional coach riding is needed on this date. Review your current goal in Coach.'};
  if(Object.keys(desired).some(k=>k==='distance_m'?Math.abs(Number(desired[k]||0)-Number(session[k]||0))>.02:desired[k]!==session[k]))changes.push({session,values:desired});
 }
 return changes;
}
