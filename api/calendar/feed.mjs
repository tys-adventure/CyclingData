import {route,method,db} from '../../lib/server.mjs';
import {authorizeCalendar} from '../../lib/calendar.mjs';
import {buildCalendarICS} from '../../lib/calendar-ics.mjs';
export default route(async(req,res)=>{
 method(req,['GET','HEAD']);const user=await authorizeCalendar(req.query);
 async function rows(table,order){const result=[];for(let offset=0;;offset+=500){const page=await db(table+'?user_id=eq.'+user+'&archived=eq.false&select=*&order='+order+'&limit=500&offset='+offset);result.push(...page);if(page.length<500)break;if(offset>=9500)throw Object.assign(new Error('Calendar is too large to export.'),{status:413});}return result;}
 const [sessions,races]=await Promise.all([rows('training_sessions','session_date,id'),rows('races','race_date,id')]);
 const ics=buildCalendarICS({sessions,races});
 res.setHeader('Content-Type','text/calendar; charset=utf-8');res.setHeader('Content-Disposition','inline; filename="ridevector.ics"');res.setHeader('Cache-Control','private, no-store');res.setHeader('Referrer-Policy','no-referrer');
 res.status(200).send(req.method==='HEAD'?'':ics);
});
