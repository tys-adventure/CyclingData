const $=s=>document.querySelector(s);
export function createCalendarSync({getClient,getUser,needUser}){
 let enabled=false,url='',error='',loading=false,generation=0;
 function render(){
  const panel=$('#calendar-sync-panel');
  panel.innerHTML='<div class="card-head"><div><h2>Apple Calendar</h2><p>Subscribe to your RideVector plans and races.</p></div><button class="secondary" id="calendar-sync-open">Calendar sync settings</button></div><p>Updates flow from RideVector to Apple Calendar on Apple’s refresh schedule. Make changes in RideVector. Events appear as all-day entries because plans have dates, not start times.</p>';
  $('#calendar-sync-open').onclick=()=>{if(!needUser())return;$('#calendar-sync-dialog').showModal();load();};
  $('#calendar-sync-state').textContent=error|| (loading?'Loading calendar settings…':enabled?'Your private subscription link is enabled.':'Your calendar subscription is off.');
  $('#calendar-feed-url').value=url;
  $('#calendar-link-details').hidden=!enabled;
  $('#calendar-link-enable').hidden=enabled;
  $('#calendar-link-disable').hidden=!enabled;
  $('#calendar-link-rotate').hidden=!enabled;
  $('#calendar-subscribe').href=url?url.replace(/^https:/,'webcal:'):'#';
  for(const id of ['calendar-link-enable','calendar-link-disable','calendar-link-rotate'])$('#'+id).disabled=loading;
 }
 async function request(action){
  const session=await getClient().auth.getSession(),token=session.data.session?.access_token;if(!token)throw Error('Sign in to manage calendar sync.');
  const response=await fetch('/api/calendar/link',{method:action?'POST':'GET',headers:{Authorization:'Bearer '+token,...(action?{'Content-Type':'application/json'}:{})},body:action?JSON.stringify({action}):undefined});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Calendar sync is unavailable.');return result;
 }
 async function load(action){
  if(!getUser()){reset();return;}const owner=getUser().id,token=++generation;loading=true;error='';render();
  try{const result=await request(action);if(token!==generation||getUser()?.id!==owner)return;enabled=result.enabled;url=result.url||'';}catch(e){if(token===generation)error=e.message;}finally{if(token===generation){loading=false;render();}}
 }
 function reset(){generation++;enabled=false;url='';error='';loading=false;$('#calendar-sync-dialog').close();render();}
 $('#calendar-link-enable').onclick=()=>load('enable');
 $('#calendar-link-disable').onclick=()=>load('disable');
 $('#calendar-link-rotate').onclick=()=>load('rotate');
 $('#calendar-link-copy').onclick=async()=>{try{await navigator.clipboard.writeText(url);$('#calendar-sync-state').textContent='Subscription link copied. In Apple Calendar, choose New Calendar Subscription and paste it.';}catch{$('#calendar-feed-url').focus();$('#calendar-feed-url').select();$('#calendar-sync-state').textContent='Select and copy the subscription URL, then paste it into Apple Calendar.';}};
 render();return {load,reset};
}
