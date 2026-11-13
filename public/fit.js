import FitParser from './vendor/fit-file-parser-6.2.7/parser.js';
import {validateRide,MAX_FILE_BYTES} from './rides.js';
import {normalizeStreams} from './telemetry.js';

const finite=(v,fallback=null)=>Number.isFinite(v)?v:fallback;
const date=v=>v instanceof Date?v.getTime():Date.parse(v);
const degrees=v=>finite(v);

export function ridesFromFITMessages(messages,filename='Imported ride.fit'){
  if(messages.fileIdMesgs?.[0]?.type!=='activity')throw Error('Choose a FIT activity recording, rather than a course or workout plan.');
  const sessions=messages.sessionMesgs||[],records=messages.recordMesgs||[];
  if(sessions.length>100||records.length>200000)throw Error('This FIT file contains too many sessions or samples.');
  const rides=[];
  for(const [index,s] of sessions.entries()){
    const indoor=['indoor_cycling','spin','virtual_activity',5,6,58].includes(s.subSport);
    if(s.sport!=='cycling'&&s.sport!==2&&!((s.sport==='fitness_equipment'||s.sport===4)&&indoor))continue;
    const start=date(s.startTime),end=date(s.timestamp);
    if(!Number.isFinite(start))throw Error('FIT session has no valid start time.');
    const samples=records.filter(r=>date(r.timestamp)>=start&&(!Number.isFinite(end)||date(r.timestamp)<=end));
    const elapsed=finite(s.totalElapsedTime,Number.isFinite(end)?(end-start)/1000:null);
    const duration=finite(s.totalTimerTime,elapsed);
    if(duration===null)throw Error('FIT session is missing its duration.');
    const distance=finite(s.totalDistance,finite(samples.findLast(r=>Number.isFinite(r.distance))?.distance,null));
    const raw={time:[],distance:[],latlng:[],altitude:[],velocity_smooth:[],heartrate:[],watts:[],cadence:[]};
    for(const r of samples){
      const lat=degrees(r.positionLat),lon=degrees(r.positionLong);
      raw.time.push((date(r.timestamp)-start)/1000);
      raw.distance.push(finite(r.distance));
      raw.latlng.push(lat===null||lon===null?null:[lat,lon]);
      raw.altitude.push(finite(r.enhancedAltitude,finite(r.altitude)));
      raw.velocity_smooth.push(finite(r.enhancedSpeed,finite(r.speed)));
      raw.cadence.push(finite(r.cadence));raw.heartrate.push(finite(r.heartRate));raw.watts.push(finite(r.power));
    }
    let ascent=finite(s.totalAscent);
    if(ascent===null){ascent=0;let base=null;for(const value of raw.altitude){if(value===null)continue;if(base===null)base=value;const change=value-base;if(Math.abs(change)>=3){ascent+=Math.max(0,change);base=value;}}}
    const name=filename.replace(/\.[^.]+$/,'').replace(/[_-]/g,' ').slice(0,145)+(sessions.length>1?' · '+(index+1):'');
    rides.push(validateRide({name,started_at:new Date(start).toISOString(),indoor,distance_m:distance,elevation_m:ascent,duration_s:duration,source:'fit',_details:{source:'fit',summary:{elapsed_s:elapsed,moving_s:null,timer_s:duration,moving_estimated:false,device_watts:null,average_cadence:finite(s.avgCadence),average_watts:finite(s.avgPower),max_watts:finite(s.maxPower),average_hr:finite(s.avgHeartRate),max_hr:finite(s.maxHeartRate),average_speed:finite(s.enhancedAvgSpeed,finite(s.avgSpeed))},streams:normalizeStreams(raw)}}));
  }
  if(!rides.length)throw Error('This FIT file has no recorded cycling sessions.');
  return rides;
}

export function parseFIT(buffer,filename){
  if(!(buffer instanceof ArrayBuffer)||buffer.byteLength>MAX_FILE_BYTES)throw Error('Choose a FIT file smaller than 10 MB.');
  const parser=new FitParser({force:false,strict:true,mode:'list',lengthUnit:'m',speedUnit:'m/s'});
  let parsed,failure;
  try {parser.parse(buffer,(error,data)=>{failure=error;parsed=data;});}
  catch {throw Error('This FIT file could not be decoded. Export the original activity again.');}
  if(failure||!parsed)throw Error('This FIT file is incomplete or damaged. Export the original activity again.');
  const camel=object=>Object.fromEntries(Object.entries(object).map(([key,value])=>[key.replace(/_([a-z])/g,(_,c)=>c.toUpperCase()),value]));
  return ridesFromFITMessages({fileIdMesgs:parsed.file_ids,sessionMesgs:(parsed.sessions||[]).map(camel),recordMesgs:(parsed.records||[]).map(camel)},filename);
}
