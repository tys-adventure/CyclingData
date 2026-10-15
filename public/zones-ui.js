import {validateZones,zoneDefinitions,timeInZones} from './zones.js';
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const duration=s=>s<60?Math.round(s)+' sec':(s/60).toLocaleString(undefined,{maximumFractionDigits:1})+' min';
function zoneRows(defs,seconds=null,covered=0){
 return '<div class="zone-rows">'+defs.map((z,i)=>'<div class="zone-row"><div><strong>Z'+(i+1)+' · '+esc(z.name)+'</strong><span>'+z.lower+(z.upper===null?'+':'–'+z.upper)+' '+z.unit+'</span></div>'+(seconds?'<div class="zone-track"><i class="zone-color-'+i+'" style="width:'+(covered?seconds[i]/covered*100:0)+'%"></i></div><small>'+duration(seconds[i])+' · '+(covered?(seconds[i]/covered*100).toFixed(1):0)+'%</small>':'')+'</div>').join('')+'</div>';
}
export function renderRideZones(settings,payload={}){
 const content=['power','hr'].map(kind=>{
  const result=timeInZones(payload.streams,kind,settings),name=kind==='power'?'Power zones':'Heart-rate zones';
  let body=!result.definitions.length?'<p>Set '+(kind==='power'?'your FTP':'your heart-rate boundaries')+' in Training → Power & heart-rate zones.</p>':!result.covered?'<p>No usable '+(kind==='power'?'power':'heart-rate')+' time-series data for this ride. A ride average cannot show time in zones.</p>':zoneRows(result.definitions,result.seconds,result.covered)+'<p class="muted">'+duration(result.covered)+' of recorded intervals classified'+(result.skipped?' · '+duration(result.skipped)+' excluded for missing data or long gaps':'')+'.</p>';
  return '<section class="recording-card"><div class="recording-heading"><h3>'+name+(kind==='power'&&payload.summary?.device_watts===false?' · estimated power':'')+'</h3><p>Time in each zone using your current settings.</p></div>'+body+'</section>';
 }).join('');
 return '<section class="ride-zone-section"><div class="card-head"><div><h3>Ride intensity</h3><p>Time-weighted estimates over recorded elapsed intervals, including stops with sensor data. Downsampled recordings can affect results.</p></div><button class="secondary" data-edit-zones>Edit zones</button></div><div class="ride-recordings">'+content+'</div><p class="muted">Historical rides are recalculated with your current thresholds. These charts do not change Fitness, Fatigue, or coach targets.</p></section>';
}
export function createZones({getClient,getUser,needUser,onChange}){
 let settings=null,loaded=false,error='',generation=0;
 function render(){
  const panel=$('#zones-panel');if(!panel)return;
  panel.innerHTML='<div class="card-head"><div><h2>Power & heart-rate zones</h2><p>Your intensity reference for recorded rides.</p></div><button class="secondary" data-edit-zones>'+(settings?'Edit zones':'Set up zones')+'</button></div>';
  if(!getUser()){panel.innerHTML+='<p>Sign in to save your personal zones.</p>';return;}
  if(!loaded){panel.innerHTML+='<p role="status">'+esc(error||'Loading your zones…')+'</p>'+(error?'<button class="secondary" data-reload-zones>Retry</button>':'');return;}
  panel.innerHTML+='<div class="zones-reference">'+['power','hr'].map(kind=>{const defs=zoneDefinitions(settings,kind);return '<section><h3>'+(kind==='power'?'Power · '+(settings?.ftp?settings.ftp+' W FTP':'FTP not set'):'Heart rate · custom bpm')+'</h3>'+(defs.length?zoneRows(defs):'<p>'+(kind==='power'?'Enter your cycling FTP to calculate seven power zones.':'Enter four bpm boundaries to define five heart-rate zones.')+'</p>')+'</section>';}).join('')+'</div><p class="muted">Open a ride to see its time in each zone. Sensor streams are required. Zone names describe effort; they are not a prescribed workout.</p><details><summary>How zones work</summary><p>Power zones use Coggan-style boundaries at 55%, 75%, 90%, 105%, 120%, and 150% of FTP. FTP is your functional threshold power in watts; use a recent measured estimate rather than a guessed value. The top zone groups efforts above 150%; it is not a precise measure of neuromuscular capacity.</p><p>Heart-rate zones use your own whole-number bpm boundaries. The optional maximum-heart-rate preset starts zones 2–5 at 60%, 70%, 80%, and 90% of the maximum you enter. This is a general reference and differs from cycling threshold-heart-rate systems. No age-based maximum is assumed.</p><p><a href="https://www.trainingpeaks.com/blog/power-training-levels/" target="_blank" rel="noopener noreferrer">About power training levels</a></p></details>';
 }
 async function load(){
  const owner=getUser()?.id,token=++generation;settings=null;loaded=false;error='';render();
  if(!owner)return;
  try{const result=await getClient().from('rider_zones').select('ftp,hr_z2,hr_z3,hr_z4,hr_z5').eq('user_id',owner).maybeSingle();if(result.error)throw result.error;if(token!==generation||getUser()?.id!==owner)return;settings=result.data;loaded=true;}catch(e){if(token!==generation)return;error=e.message;}
  render();
 }
 function reset(){generation++;settings=null;loaded=false;error='';$('#zones-dialog').close();render();}
 function open(){
  if(!needUser())return;
  if(!loaded){error='Zone settings are not loaded. Retry before editing.';render();return;}
  const form=$('#zones-form');form.reset();for(const key of ['ftp','hr_z2','hr_z3','hr_z4','hr_z5'])form.elements[key].value=settings?.[key]??'';$('#zones-message').textContent='';$('#zones-dialog').showModal();
 }
 document.addEventListener('click',e=>{if(e.target.closest('[data-edit-zones]'))open();if(e.target.closest('[data-reload-zones]'))load();});
 $('#zones-preset').onclick=()=>{
  const form=$('#zones-form'),max=Number(form.elements.max_hr.value);if(!Number.isInteger(max)||max<80||max>250){$('#zones-message').textContent='Enter a known maximum heart rate from 80 to 250 bpm to use this preset.';return;}
  ['hr_z2','hr_z3','hr_z4','hr_z5'].forEach((key,i)=>form.elements[key].value=Math.round(max*(.6+i*.1)));$('#zones-message').textContent='Preset filled. Review the boundaries, then save.';
 };
 $('#zones-form').onsubmit=async e=>{
  e.preventDefault();const owner=getUser()?.id,token=generation;if(!owner)return;
  const button=$('#save-zones');button.disabled=true;
  try{const data=validateZones(Object.fromEntries(new FormData(e.target)));const result=await getClient().from('rider_zones').upsert({...data,user_id:owner}).select('ftp,hr_z2,hr_z3,hr_z4,hr_z5').single();if(result.error)throw result.error;if(token!==generation||getUser()?.id!==owner)return;settings=result.data;loaded=true;render();$('#zones-dialog').close();onChange?.();}
  catch(err){if(token===generation)$('#zones-message').textContent=err.message;}finally{button.disabled=false;}
 };
 render();return {load,reset,render,getSettings:()=>settings};
}
