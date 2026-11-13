import {normalizeStreams} from './telemetry.js';
import {metersFromMiles,metersFromFeet} from './units.js';
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export function distanceBetween(a,b){const rad=Math.PI/180, dlat=(b.lat-a.lat)*rad,dlon=(b.lon-a.lon)*rad;const h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));}
export function validateRide(r){
 if(!r.name?.trim()||r.name.length>160)throw Error('Ride names must be 1–160 characters.');
 if(!Number.isFinite(Date.parse(r.started_at)))throw Error('A ride needs a valid date and time.');
 if(r.indoor!==undefined&&typeof r.indoor!=='boolean')throw Error('Choose indoor or outdoor cycling.');
 const indoor=r.indoor===true,distance=indoor&&(r.distance_m==null||r.distance_m===0)?null:r.distance_m;
 if(distance===null&&!indoor)throw Error('Outdoor rides need a recorded distance.');
 for(const [key,max] of [['distance_m',10000000],['elevation_m',100000],['duration_s',604800]]){const value=key==='distance_m'?distance:r[key];if(key==='distance_m'&&value===null)continue;if(!Number.isFinite(value)||value<0||value>max)throw Error('Ride distance, elevation, or duration is outside the supported range.');}
 if(indoor&&Math.round(r.duration_s)<1)throw Error('Indoor rides need a positive duration.');
 return {...r,name:r.name.trim(),indoor,distance_m:distance,duration_s:Math.round(r.duration_s)};
}
export function manualRide(values){
 const indoor=values.kind==='indoor',optional=(value,max,label)=>{if(value==null||value==='')return null;const n=Number(value);if(!Number.isFinite(n)||n<0||n>max)throw Error('Enter a valid '+label+'.');return n;};
 const notes=String(values.notes||'').trim();if(notes.length>1000)throw Error('Keep ride notes under 1,000 characters.');
 const summary={average_hr:optional(values.heart_rate,300,'heart rate'),average_watts:optional(values.power,5000,'power'),average_cadence:optional(values.cadence,300,'cadence'),notes};
 return validateRide({name:values.name,started_at:values.started_at,indoor,distance_m:values.distance===''||values.distance==null?null:metersFromMiles(values.distance),elevation_m:metersFromFeet(values.elevation||0),duration_s:Number(values.duration)*60,source:'manual',source_id:values.source_id,_details:{source:'manual',summary:{...summary,timer_s:Number(values.duration)*60,elapsed_s:Number(values.duration)*60,moving_s:null},streams:{}}});
}
export function csvRows(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}else cell+=c;}if(quoted)throw Error('CSV contains an unclosed quoted field.');row.push(cell);if(row.some(v=>v.trim()))rows.push(row);return rows;}
export function parseCSV(text){
 const rows=csvRows(text.replace(/^\uFEFF/,'')),head=rows.shift()?.map(x=>x.trim().toLowerCase());
 if(!head||['name','date','duration_minutes'].some(k=>!head.includes(k)))throw Error('CSV needs name, date, and duration_minutes. Include distance_miles and elevation_ft for outdoor rides, or indoor=true.');
 if(!rows.length||rows.length>1000)throw Error('CSV must contain between 1 and 1,000 rides.');
 const distanceKey=head.includes('distance_miles')?'distance_miles':'distance_km',elevationKey=head.includes('elevation_ft')?'elevation_ft':'elevation_m';
 return rows.map((row,i)=>{const get=k=>row[head.indexOf(k)]?.trim(),flag=get('indoor')?.toLowerCase()||'';
 if(!['','true','false','1','0'].includes(flag))throw Error('CSV row '+(i+2)+' needs indoor=true or false.');
 const indoor=flag==='true'||flag==='1';if(['name','date','duration_minutes',...(!indoor?[distanceKey,elevationKey]:[])].some(k=>!get(k)))throw Error('CSV row '+(i+2)+' has a missing value.');
 return validateRide({name:get('name'),started_at:get('date'),indoor,distance_m:!get(distanceKey)?null:distanceKey==='distance_miles'?metersFromMiles(get(distanceKey)):Number(get(distanceKey))*1000,elevation_m:!get(elevationKey)?0:elevationKey==='elevation_ft'?metersFromFeet(get(elevationKey)):Number(get(elevationKey)),duration_s:Number(get('duration_minutes'))*60,source:'csv'});
 });
}
function nodes(el,name){return [...el.getElementsByTagNameNS('*',name)];}
function value(el,name){return nodes(el,name)[0]?.textContent?.trim();}
function numberValue(el,name){const s=value(el,name);return s===undefined||s===''?null:Number(s);}
export function summarizePoints(segments){let distance=0,elevation=0,duration=0,firstTime=null,totalPoints=0;for(const segment of segments){let previous=null,baseAltitude=null,first=null,last=null;for(const p of segment){totalPoints++;if(Number.isFinite(p.time)){firstTime=firstTime===null?p.time:Math.min(firstTime,p.time);first=first??p.time;last=p.time;}if(Number.isFinite(p.ele)){if(baseAltitude===null)baseAltitude=p.ele;const diff=p.ele-baseAltitude;if(Math.abs(diff)>=3){if(diff>0)elevation+=diff;baseAltitude=p.ele;}}if(Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180){if(previous)distance+=distanceBetween(previous,p);previous=p;}else previous=null;}if(first!==null&&last!==null)duration+=Math.max(0,last-first)/1000;}if(totalPoints>200000)throw Error('This ride contains too many track points.');if(firstTime===null)throw Error('This file has no recorded ride timestamp. Use manual entry instead.');return {started_at:new Date(firstTime).toISOString(),distance_m:distance,elevation_m:elevation,duration_s:duration};}
export function parseXML(text,source,filename){if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('XML declarations and entities are not supported.');const xml=new DOMParser().parseFromString(text,'application/xml');if(nodes(xml,'parsererror').length)throw Error('The ride file is not valid XML.');let summary;if(source==='gpx'){const segments=nodes(xml,'trkseg');if(!segments.length)throw Error('GPX needs recorded track points; routes without timestamps cannot be imported.');summary=summarizePoints(segments.map(seg=>nodes(seg,'trkpt').map(p=>({lat:p.hasAttribute('lat')?Number(p.getAttribute('lat')):null,lon:p.hasAttribute('lon')?Number(p.getAttribute('lon')):null,ele:numberValue(p,'ele'),time:Date.parse(value(p,'time'))}))));}else{const activities=nodes(xml,'Activity');if(activities.length!==1)throw Error('Import one TCX activity per file.');const activity=activities[0],laps=nodes(activity,'Lap'),tracks=nodes(activity,'Track'),points=tracks.map(seg=>nodes(seg,'Trackpoint').map(p=>({lat:numberValue(p,'LatitudeDegrees'),lon:numberValue(p,'LongitudeDegrees'),ele:numberValue(p,'AltitudeMeters'),time:Date.parse(value(p,'Time'))})));
 const hasGPS=points.flat().some(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));
 const lapDistances=laps.map(l=>numberValue(l,'DistanceMeters')),lapTimes=laps.map(l=>numberValue(l,'TotalTimeSeconds'));
 if(points.flat().some(p=>Number.isFinite(p.time)))summary=summarizePoints(points);
 else {const started=laps[0]?.getAttribute('StartTime')||value(activity,'Id');if(!Number.isFinite(Date.parse(started)))throw Error('This TCX has no recorded ride timestamp.');summary={started_at:new Date(started).toISOString(),duration_s:0,distance_m:null,elevation_m:0};}
 if(lapDistances.length&&lapDistances.every(Number.isFinite))summary.distance_m=lapDistances.reduce((s,n)=>s+n,0);
 else if(!hasGPS)summary.distance_m=null;
 if(lapTimes.length&&lapTimes.every(Number.isFinite))summary.duration_s=lapTimes.reduce((s,n)=>s+n,0);
 const cycling=/^(biking|cycling)$/i.test(activity.getAttribute('Sport')||'');
 if(!hasGPS&&cycling)summary.indoor=true;
 if(!hasGPS&&!cycling)throw Error('A TCX without GPS must identify a cycling activity.');
}

return [validateRide({...summary,name:value(xml,'name')||filename.replace(/\.[^.]+$/,'').replace(/[_-]/g,' '),source,_details:recordingsFromXML(xml,source,summary)})];}
export function monday(date){const d=new Date(date);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d;}
export function weekStats(rides,start){const end=new Date(start);end.setDate(end.getDate()+7);return rides.filter(r=>new Date(r.started_at)>=start&&new Date(r.started_at)<end).reduce((a,r)=>({distance:a.distance+Number(r.distance_m),elevation:a.elevation+Number(r.elevation_m),duration:a.duration+Number(r.duration_s),count:a.count+1}),{distance:0,elevation:0,duration:0,count:0});}

function recordingsFromXML(xml,source,summary){const first=Date.parse(summary.started_at),raw={time:[],distance:[],latlng:[],altitude:[],velocity_smooth:[],heartrate:[],watts:[],cadence:[],moving:[]};let totalDistance=0,totalMoving=0;const segments=source==='gpx'?nodes(xml,'trkseg'):nodes(xml,'Track');for(const segment of segments){let previous=null;for(const p of nodes(segment,source==='gpx'?'trkpt':'Trackpoint')){const timestamp=Date.parse(value(p,source==='gpx'?'time':'Time'));if(!Number.isFinite(timestamp))continue;const lat=source==='gpx'?(p.hasAttribute('lat')?Number(p.getAttribute('lat')):null):numberValue(p,'LatitudeDegrees'),lon=source==='gpx'?(p.hasAttribute('lon')?Number(p.getAttribute('lon')):null):numberValue(p,'LongitudeDegrees'),valid=Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;const elapsed=(timestamp-first)/1000;if(elapsed<0)continue;const delta=previous&&valid&&previous.valid?distanceBetween(previous,{lat,lon}):0,dt=previous?Math.max(0,(timestamp-previous.timestamp)/1000):0;totalDistance+=delta;const speed=dt>0?delta/dt:null,moving=dt>0&&speed>.5;if(moving)totalMoving+=dt;let hr=numberValue(p,'hr');if(source==='tcx'){const heartNode=nodes(p,'HeartRateBpm')[0];hr=heartNode?numberValue(heartNode,'Value'):null;}raw.time.push(elapsed);raw.distance.push(summary.distance_m==null||summary.distance_m===0?null:source==='tcx'?numberValue(p,'DistanceMeters')??(valid?totalDistance:null):totalDistance);raw.latlng.push(valid?[lat,lon]:null);raw.altitude.push(numberValue(p,source==='gpx'?'ele':'AltitudeMeters'));raw.velocity_smooth.push(valid?speed:null);raw.heartrate.push(hr);raw.watts.push(numberValue(p,source==='gpx'?'power':'Watts'));raw.cadence.push(numberValue(p,source==='gpx'?'cad':'Cadence'));raw.moving.push(moving);previous={lat,lon,valid,timestamp};}}const last=raw.time.at(-1),hasGPS=raw.latlng.some(p=>p);if(totalDistance>0&&summary.distance_m>0)raw.distance=raw.distance.map(d=>d/totalDistance*summary.distance_m);return {summary:{elapsed_s:Number.isFinite(last)?last:summary.duration_s,moving_s:hasGPS?Math.round(totalMoving):null,moving_estimated:hasGPS,device_watts:raw.watts.some(Number.isFinite)?true:null},streams:normalizeStreams(raw),source};}
