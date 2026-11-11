import {uniqueRecordings} from './duplicates.js';
import {miles,feet} from './units.js';
const base={name:'The Sunday loop',started_at:'2026-11-01T09:00:00Z',distance_m:40233.6,duration_s:5400,elevation_m:425};
export const sampleBaseline=()=>[{...base,id:'sample-strava',source:'strava',source_id:'sample-strava-1'}];
export const sampleWahoo=()=>[{...base,id:'sample-wahoo-1',source:'wahoo',source_id:'sample-wahoo-1',_details:{summary:{timer_s:5400,average_watts:165,average_hr:132},streams:{}}},{id:'sample-wahoo-2',name:'Golden hour gravel',started_at:'2026-11-03T16:00:00Z',distance_m:28968.2,duration_s:4500,elevation_m:290,source:'wahoo',source_id:'sample-wahoo-2',_details:{summary:{timer_s:4500,average_watts:151,average_hr:126},streams:{}}}];
export function mergePreviewRecords(current,incoming){return [...new Map([...current,...incoming].map(r=>[r.source+':'+r.source_id,{...r,id:r.id||r.source+':'+r.source_id}])).values()];}
export function previewStats(records,group=true){const rides=group?uniqueRecordings(records):[...records].sort((a,b)=>Date.parse(b.started_at)-Date.parse(a.started_at));return {rides,recordings:records.length,copies:records.length-rides.length,distance:rides.reduce((n,r)=>n+Number(r.distance_m),0)};}
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function initPlayground(){
 const $=id=>document.getElementById(id);let records=sampleBaseline(),selected=records[0].id,generation=0;
 const number=(n,d=0)=>Number(n).toLocaleString(undefined,{maximumFractionDigits:d});
 function render(){
  const stats=previewStats(records,$('playground-group').checked);
  if(!stats.rides.some(r=>r.id===selected))selected=stats.rides[0]?.id;
  $('playground-stats').innerHTML=`<div><strong>${stats.rides.length}</strong><span>rides counted</span></div><div><strong>${number(miles(stats.distance),1)} <small>mi</small></strong><span>dashboard distance</span></div><div><strong>${stats.recordings}</strong><span>source recordings</span></div>`;
  $('playground-rides').innerHTML=`<div class="playground-table"><table><caption class="sr-only">Temporary ride preview. Select a ride to inspect it.</caption><thead><tr><th>Ride</th><th>Distance</th><th>Sources</th></tr></thead><tbody>${stats.rides.slice(0,8).map(r=>`<tr><td><button type="button" data-preview-ride="${escape(r.id)}" aria-pressed="${r.id===selected}">${escape(r.name)}</button></td><td>${number(miles(r.distance_m),1)} mi</td><td>${escape((r._copies||[r]).map(x=>x.source.toUpperCase()).join(' + '))}</td></tr>`).join('')}</tbody></table></div>${stats.rides.length>8?'<p class="muted">Showing the first 8 rides. Totals include every previewed ride.</p>':''}`;
  const ride=stats.rides.find(r=>r.id===selected)||stats.rides[0];if(!ride){$('playground-inspector').textContent='No rides to preview yet.';return;}selected=ride.id;
  const detail=ride._details,streams=detail?.streams||{};
  const parts=[number(ride.duration_s/60)+' min recorded duration',number(feet(ride.elevation_m))+' ft climbing'];
  if(Number.isFinite(detail?.summary?.average_watts))parts.push(number(detail.summary.average_watts)+' W average');
  if(Number.isFinite(detail?.summary?.average_hr))parts.push(number(detail.summary.average_hr)+' bpm average');
  const points=streams.latlng?.filter(Boolean).length||0,samples=streams.time?.length||0;
  if(points)parts.push(number(points)+' route points');if(samples)parts.push(number(samples)+' recording samples');
  $('playground-inspector').innerHTML=`<span class="eyebrow">INSIDE THIS RECORDING</span><h3>${escape(ride.name)}</h3><p>${parts.join(' · ')}</p><p>${stats.copies?stats.copies+' matching source '+(stats.copies===1?'copy is':'copies are')+' counted once. Original recordings stay in this preview.':$('playground-group').checked?'Uncertain matches and manual rides remain separate.':'Each source recording is counted separately.'}</p>`;
  for(const b of $('playground-rides').querySelectorAll('[data-preview-ride]'))b.addEventListener('click',()=>{selected=b.dataset.previewRide;render();Array.from($('playground-rides').querySelectorAll('[data-preview-ride]')).find(button=>button.dataset.previewRide===selected)?.focus({preventScroll:true});});
 }
 $('playground-import').addEventListener('click',()=>{const before=records.length;records=mergePreviewRecords(records,sampleWahoo());render();$('playground-status').textContent=records.length===before?'Already in this preview. Importing again keeps the same source recordings.':'Two sample Wahoo recordings added. Switch grouping off to see how counting every source changes the totals.';});
 $('playground-group').addEventListener('change',render);
 function reset(){generation++;for(const id of ['playground-files','playground-import','playground-reset'])$(id).disabled=false;records=sampleBaseline();selected=records[0].id;$('playground-files').value='';$('playground-group').checked=true;render();$('playground-status').textContent='Demo reset. Only the original sample Strava ride remains.';}
 $('playground-reset').addEventListener('click',reset);
 window.addEventListener('pagehide',reset);
 $('playground-files').addEventListener('change',async event=>{
  const files=Array.from(event.target.files);if(!files.length)return;const request=++generation;
  const controls=['playground-files','playground-import','playground-reset'];controls.forEach(id=>$(id).disabled=true);
  try{
   const {readRideFiles}=await import('./imports.js');
   const {items,failures}=await readRideFiles(files,(index,total)=>{if(request===generation)$('playground-status').textContent='Reading file '+index+' of '+total+' locally…';});
   if(request!==generation)return;
   const merged=mergePreviewRecords(records,items);if(merged.length>2000)throw Error('This preview holds up to 2,000 recordings. Reset it before trying another batch.');
   records=merged;selected=items[0]?items[0].source+':'+items[0].source_id:selected;render();
   $('playground-status').textContent=items.length+' file recordings read locally. Nothing was uploaded.'+(failures.length?' '+failures.map(f=>f.name+': '+f.message).join(' '):'');
  }catch(error){if(request===generation)$('playground-status').textContent=error.message;}finally{if(request===generation)controls.forEach(id=>$(id).disabled=false);}
 });
 render();
}
