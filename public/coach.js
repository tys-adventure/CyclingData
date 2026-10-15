import {monday} from './rides.js';
import {dateKey,calendarDate,addDays,validCalendarDate} from './planner.js';
import {miles,metersFromMiles} from './units.js';
const DAY_MS=86400000;
const dayNumber=value=>{const d=typeof value==='string'?calendarDate(value):value;return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/DAY_MS;};
export const COACH_DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export function validateCoachProfile(input){
 const experience=String(input.experience),available_days=(input.available_days||[]).map(Number).sort((a,b)=>a-b);
 if(!['beginner','returning','intermediate','experienced'].includes(experience))throw Error('Choose your riding experience.');
 if(!available_days.length||available_days.length>6||new Set(available_days).size!==available_days.length||available_days.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error('Choose 1–6 riding days, leaving at least one day free.');
 const weekly_minutes=Number(input.weekly_minutes),long_minutes=Number(input.long_minutes),long_day=Number(input.long_day),planning_mph=Number(input.planning_mph),baseline_miles=input.baseline_miles==null?null:Number(input.baseline_miles);
 if(!Number.isInteger(weekly_minutes)||weekly_minutes<30||weekly_minutes>1800)throw Error('Set a weekly time budget from 0.5 to 30 hours.');
 if(!Number.isInteger(long_minutes)||long_minutes<15||long_minutes>480||long_minutes>weekly_minutes)throw Error('Your longest session must be 15 minutes–8 hours and fit your weekly budget.');
 if(!available_days.includes(long_day))throw Error('Your longer-ride day must be one of your available days.');
 if(!Number.isFinite(planning_mph)||planning_mph<5||planning_mph>30)throw Error('Use a realistic planning pace from 5 to 30 mph.');
 if(baseline_miles!==null&&(!Number.isFinite(baseline_miles)||baseline_miles<=0||baseline_miles>1000))throw Error('Enter typical weekly mileage between 1 and 1,000, or leave it blank.');
 if(!validCalendarDate(input.started_week)||calendarDate(input.started_week).getDay()!==1)throw Error('Coach start week must begin on Monday.');
 return {experience,available_days,weekly_minutes,long_minutes,long_day,planning_mph,baseline_miles,target_race_id:input.target_race_id||null,started_week:input.started_week};
}
export function validateCheckin(input,profile){
 if(!validCalendarDate(input.week_start)||calendarDate(input.week_start).getDay()!==1)throw Error('Choose a Monday-starting week.');
 if(!['fresh','normal','tired'].includes(input.recovery))throw Error('Choose how recovered you feel.');
 const value=input.override_distance_m==null?null:Number(input.override_distance_m),capacity=metersFromMiles(profile.weekly_minutes/60*profile.planning_mph);
 if(value!==null&&(!Number.isFinite(value)||value<0||value>capacity+.1))throw Error('Your edited mileage must fit your weekly time budget at your planning pace. Lower it or adjust your setup.');
 return {week_start:input.week_start,recovery:input.recovery,override_distance_m:value};
}
function rideTotals(rides,start,end){return rides.filter(r=>new Date(r.started_at)>=start&&new Date(r.started_at)<end).reduce((a,r)=>({distance:a.distance+(Number(r.distance_m)||0),minutes:a.minutes+(Number(r.duration_s)||0)/60,count:a.count+1}),{distance:0,minutes:0,count:0});}
export function coachBaseline(profile,rides,now=new Date()){
 const start=monday(now),recent=rides.filter(r=>new Date(r.started_at)>=addDays(start,-28)&&new Date(r.started_at)<start),totals=rideTotals(recent,addDays(start,-28),start),last=rideTotals(recent,addDays(start,-7),start);
 return {miles:profile.baseline_miles==null?miles(totals.distance)/4:Number(profile.baseline_miles),source:profile.baseline_miles==null?'history':'your baseline',lastWeekMiles:miles(last.distance),recordedRides:recent.length,activeWeeks:new Set(recent.map(r=>dateKey(monday(new Date(r.started_at))))).size,longestMinutes:Math.max(0,...recent.map(r=>(Number(r.duration_s)||0)/60))};
}
function distribute(total,days,longDay,cap){
 const result=new Map(days.map(d=>[d,0])),ordered=[...days].sort((a,b)=>(b===longDay)-(a===longDay)||a-b);
 // Allocate a fixed full-week budget first. Missed days are never redistributed.
 let left=Math.floor(total/5)*5;
 while(left>=5){let progress=false;for(const day of ordered){const weight=day===longDay?2:1;for(let i=0;i<weight&&left>=5;i++){if(result.get(day)+5<=cap){result.set(day,result.get(day)+5);left-=5;progress=true;}}}if(!progress)break;}
 for(const [day,value]of result)if(value<15)result.set(day,0);
 return result;
}
export function buildCoachWeek({profile,races,rides,sessions=[],checkin=null,week=monday(new Date()),now=new Date()}){
 if(!profile)return {state:'setup'};
 const today=dateKey(now),start=monday(week),end=addDays(start,7),weekKey=dateKey(start),currentWeek=monday(now);
 const eligible=races.filter(r=>!r.archived).sort((a,b)=>a.race_date.localeCompare(b.race_date)||a.id.localeCompare(b.id));
 const race=profile.target_race_id?eligible.find(r=>r.id===profile.target_race_id):eligible.find(r=>(r.race_end_date||r.race_date)>=today);
 if(!race)return {state:'race'};
 const baseline=coachBaseline(profile,rides,now);
 if(baseline.miles<=0)return {state:'baseline',race,baseline};
 const raceStart=calendarDate(race.race_date),raceEnd=calendarDate(race.race_end_date||race.race_date),until=dayNumber(raceStart)-dayNumber(start),after=dayNumber(start)-dayNumber(raceEnd),cycle=Math.max(0,Math.round((dayNumber(start)-dayNumber(profile.started_week))/7));
 let phase=until>=56?'Base':until>=14?'Build':'Taper';
 if(raceStart<end&&raceEnd>=start)phase='Race week';
 else if(after>0&&after<=7)phase='Recovery';
 else if(after>7)return {state:'finished',race};
 else if((cycle+1)%4===0&&until>=14)phase='Recovery';
 const reasons=[],growth={beginner:0,returning:0,intermediate:.03,experienced:.05}[profile.experience];
 const ahead=Math.max(0,Math.min(4,Math.round((dayNumber(start)-dayNumber(currentWeek))/7)));
 let base=baseline.miles;
 if(baseline.source==='history'&&baseline.lastWeekMiles<base*.7){base=Math.min(base,baseline.lastWeekMiles>0?baseline.lastWeekMiles:base*.5);reasons.push('Recent recorded volume dropped, so this draft starts lower instead of making up missed mileage.');}
 let targetMinutes=base/profile.planning_mph*60*(1+growth)**ahead;
 if(profile.experience==='returning'&&cycle<2){targetMinutes*=.75;reasons.push('Returning-rider setup starts with a reduced draft for the first two coach weeks.');}
  if(phase==='Recovery')targetMinutes*=.75;
 if(phase==='Taper')targetMinutes*=.65;
 if(phase==='Race week')targetMinutes*=.4;
 if(checkin?.recovery==='tired'){targetMinutes*=.7;reasons.push('Your tired check-in lowers the suggested volume and keeps riding easy.');}
 if(checkin?.override_distance_m!=null){targetMinutes=miles(checkin.override_distance_m)/profile.planning_mph*60;reasons.push('This week starts from your edited mileage target; session limits and five-minute rounding still apply.');}
 const raceOn=key=>eligible.some(r=>r.race_date<=key&&(r.race_end_date||r.race_date)>=key);
 const available=profile.available_days.filter(day=>!raceOn(dateKey(addDays(start,day))));
 let cap=Math.min(profile.long_minutes,profile.weekly_minutes);
 if(baseline.source==='history'&&baseline.longestMinutes>0)cap=Math.min(cap,Math.max(15,Math.floor(baseline.longestMinutes*1.1/5)*5));
 targetMinutes=Math.max(0,Math.min(targetMinutes,profile.weekly_minutes,available.length*cap));
 const allocation=distribute(targetMinutes,available,profile.long_day,cap),plannedMinutes=[...allocation.values()].reduce((a,b)=>a+b,0),targetMiles=plannedMinutes/60*profile.planning_mph;
 reasons.unshift(`Baseline: ${Math.round(baseline.miles)} mi/week from ${baseline.source==='history'?'the previous four complete weeks (including zero-ride weeks)': 'your setup'}.`);
 reasons.push(`Targets fit your ${profile.weekly_minutes/60}-hour weekly budget and ${profile.long_minutes/60}-hour session limit. Distance uses your ${profile.planning_mph} mph planning pace.`);
 const actualRides=rides.filter(r=>new Date(r.started_at)<=now),actual=rideTotals(actualRides,start,end),focus={road:'Practice predictable group riding and controlled pacing with an experienced group.',gravel:'Practice handling on similar surfaces and test your repair/resupply setup.',mtb:'Practice familiar technical skills and controlled line choice on similar terrain.',tt:'Rehearse sustainable, even pacing and a familiar riding position.',crit:'Practice cornering and predictable pack skills in a supervised setting.',sportive:'Practice steady endurance pacing and your familiar food and drink routine.'}[race.race_type]||'Practice the demands of your event on familiar rides.';
 const priorPlans=sessions.filter(s=>!s.archived&&s.status==='planned'&&s.session_date>=today&&s.session_date>=weekKey&&s.session_date<dateKey(end));
  const committedMinutes=priorPlans.reduce((sum,s)=>sum+(Number(s.duration_min)||((Number(s.distance_m)||0)/1609.344/profile.planning_mph*60)),0);
  let remainingBudget=Math.max(0,Math.min(plannedMinutes-actual.minutes,(targetMiles-miles(actual.distance))/profile.planning_mph*60)-committedMinutes);
  const remainingAllocation=new Map();
  const priority=[...available].sort((a,b)=>(b===profile.long_day)-(a===profile.long_day)||a-b);
  for(const day of priority){const date=dateKey(addDays(start,day));if(date<today||actualRides.some(r=>dateKey(r.started_at)===date)||sessions.some(s=>s.session_date===date&&!s.archived)||sessions.some(s=>s.coach_key===`coach:${weekKey}:${date}`))continue;let minutes=Math.floor(Math.min(allocation.get(day)||0,remainingBudget)/5)*5;if(minutes<15)minutes=0;remainingAllocation.set(day,minutes);remainingBudget-=minutes;}
  const days=Array.from({length:7},(_,day)=>{
  const date=dateKey(addDays(start,day)),minutes=remainingAllocation.get(day)||0,raceDay=raceOn(date),recorded=actualRides.some(r=>dateKey(r.started_at)===date),existing=sessions.some(s=>s.session_date===date&&!s.archived),key=`coach:${weekKey}:${date}`,wasAdded=sessions.some(s=>s.coach_key===key),isPast=date<today;
  let type=minutes?day===profile.long_day?'endurance':'easy':'rest';
  if(checkin?.recovery==='tired'||phase==='Recovery'||phase==='Taper'||phase==='Race week')type=minutes?'easy':'rest';
  const kind=raceDay?'race':recorded?'recorded':existing||wasAdded?'existing':isPast?'past':minutes?'suggestion':'rest';
  return {date,kind,title:raceDay?'Race day':kind==='recorded'?'Recorded riding counts toward your target':kind==='existing'?'Keep your existing calendar entry':kind==='past'?'No extra session added for a missed day':minutes?(day===profile.long_day?'Steady endurance ride':'Easy consistency ride'):'Rest / free day',session_type:type,duration_min:minutes||null,distance_m:minutes?Math.round(metersFromMiles(minutes/60*profile.planning_mph)*100)/100:null,coach_key:key,notes:`Coach draft · ${phase}. ${minutes?'Keep the planned session size; missed rides do not need to be made up. '+focus:'Use this as a day away from scheduled riding.'}`,status:'planned'};
 });
 const stageDays=dayNumber(raceEnd)-dayNumber(raceStart)+1;
 return {state:'ready',race,start,end,weekKey,phase,baseline,targetMiles,targetMinutes:plannedMinutes,rangeLow:targetMiles*.9,rangeHigh:Math.min(targetMiles*1.05,profile.weekly_minutes/60*profile.planning_mph,available.length*cap/60*profile.planning_mph),actual,days,reasons,focus,stageDays,averageStageMiles:race.distance_m?miles(race.distance_m)/stageDays:null,remainingMiles:Math.max(0,targetMiles-miles(actual.distance)),reviewCalendar:committedMinutes>Math.max(0,Math.min(plannedMinutes-actual.minutes,(targetMiles-miles(actual.distance))/profile.planning_mph*60)),suggestions:days.filter(d=>d.kind==='suggestion'||d.kind==='rest')};
}
