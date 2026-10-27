import {route,method,identify,json,error} from '../../lib/server.mjs';
import {calendarUser,calendarURL,calendarNonce} from '../../lib/calendar.mjs';
export default route(async(req,res)=>{
 method(req,['GET','POST']);const user=await identify(req),record=await calendarUser(user);
 let state=record.app_metadata?.ridevector_calendar;
 if(req.method==='POST'){
  const action=req.body?.action;if(!['enable','rotate','disable'].includes(action))throw error('Choose a calendar action.',400);
  state=action==='disable'?{enabled:false}:action==='enable'&&state?.enabled===true?state:{enabled:true,nonce:calendarNonce()};
  await calendarUser(user,{ridevector_calendar:state});
 }
 json(res,200,{enabled:state?.enabled===true,url:state?.enabled===true?calendarURL(user,state.nonce):null});
});
