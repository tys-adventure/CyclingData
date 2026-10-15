import {monday} from './rides.js';
export const SESSION_TYPES={easy:'Easy ride',endurance:'Endurance',tempo:'Tempo',intervals:'Intervals',rest:'Rest day'};
export const dateKey=value=>{const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export const calendarDate=key=>new Date(`${key}T00:00:00`);
export const addDays=(value,days)=>{const d=new Date(value);d.setDate(d.getDate()+days);return d;};
export function validCalendarDate(key){const d=calendarDate(key);return /^\d{4}-\d{2}-\d{2}$/.test(key)&&Number.isFinite(d.getTime())&&dateKey(d)===key&&key>='2000-01-01'&&key<='2100-12-31';}
export function validateSession(input){
 const title=String(input.title||'').trim(),session_date=String(input.session_date||''),notes=String(input.notes||'').trim();
 if(!title||title.length>160)throw Error('Enter a session title of up to 160 characters.');
 if(!validCalendarDate(session_date))throw Error('Choose a valid date between 2000 and 2100.');
 if(!Object.hasOwn(SESSION_TYPES,input.session_type))throw Error('Choose a session type.');
 if(!['planned','completed','skipped'].includes(input.status))throw Error('Choose a session status.');
 if(notes.length>1000)throw Error('Keep notes under 1,000 characters.');
 const rest=input.session_type==='rest',duration_min=rest||input.duration_min==null?null:Number(input.duration_min),distance_m=rest||input.distance_m==null?null:Number(input.distance_m);
 if(duration_min!==null&&(!Number.isInteger(duration_min)||duration_min<1||duration_min>1440))throw Error('Enter a duration from 1 to 1,440 whole minutes.');
 if(distance_m!==null&&(!Number.isFinite(distance_m)||distance_m<=0||distance_m>10000000))throw Error('Enter a positive target distance.');
 return {title,session_date,session_type:input.session_type,duration_min,distance_m,notes,status:input.status};
}
function summarize(rides,start,end){
 const selected=rides.filter(r=>{const d=new Date(r.started_at);return d>=start&&d<end;});
 return selected.reduce((total,r)=>{total.distance+=Number(r.distance_m)||0;total.elevation+=Number(r.elevation_m)||0;total.duration+=Number(r.duration_s)||0;total.count++;total.days.add(dateKey(r.started_at));return total;},{distance:0,elevation:0,duration:0,count:0,days:new Set()});
}
export function weeklyRecap(rides,sessions,week,now=new Date()){
 const start=monday(week),fullEnd=addDays(start,7),today=calendarDate(dateKey(now)),end=new Date(Math.max(start.getTime(),Math.min(fullEnd.getTime(),addDays(today,1).getTime())));
 let dayCount=0;for(let d=new Date(start);d<end;d=addDays(d,1))dayCount++;
 const previousStart=addDays(start,-7),previousEnd=addDays(previousStart,dayCount);
 const planned=sessions.filter(s=>!s.archived&&s.session_type!=='rest'&&s.session_date>=dateKey(start)&&s.session_date<dateKey(end));
 return {start,end,fullEnd,partial:end<fullEnd,current:summarize(rides,start,end),previous:summarize(rides,previousStart,previousEnd),previousStart,previousEnd,planned:planned.length,completed:planned.filter(s=>s.status==='completed').length};
}
export function personalRecords(rides,now=new Date()){
 const valid=rides.filter(r=>Number.isFinite(Date.parse(r.started_at))&&new Date(r.started_at)<=now);
 const best=field=>valid.filter(r=>Number(r[field])>0).sort((a,b)=>Number(b[field])-Number(a[field])||Date.parse(a.started_at)-Date.parse(b.started_at)||String(a.id).localeCompare(String(b.id)))[0]||null;
 const weeks=new Map();for(const ride of valid){const key=dateKey(monday(new Date(ride.started_at)));const week=weeks.get(key)||{date:key,distance:0,count:0};week.distance+=Number(ride.distance_m)||0;week.count++;weeks.set(key,week);}
 const bestWeek=[...weeks.values()].sort((a,b)=>b.distance-a.distance||a.date.localeCompare(b.date))[0]||null;
 return {distance:best('distance_m'),elevation:best('elevation_m'),duration:best('duration_s'),week:bestWeek};
}
export function dayEvents(key,rides,races,sessions,includeArchived=false){
 return {
  rides:rides.filter(r=>dateKey(r.started_at)===key),
  races:races.filter(r=>!r.archived&&r.race_date<=key&&(r.race_end_date||r.race_date)>=key),
  sessions:sessions.filter(s=>s.session_date===key&&(includeArchived||!s.archived)).sort((a,b)=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id))
 };
}
export function monthCells(month){
 const first=new Date(month.getFullYear(),month.getMonth(),1),start=monday(first),last=new Date(month.getFullYear(),month.getMonth()+1,0);
 const count=Math.ceil((((first.getDay()+6)%7)+last.getDate())/7)*7;
 return Array.from({length:count},(_,i)=>addDays(start,i));
}
