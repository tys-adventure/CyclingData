export const POWER_NAMES=['Active recovery','Endurance','Tempo','Threshold','VO₂ max','Anaerobic','Neuromuscular'];
export const HR_NAMES=['Recovery','Easy endurance','Steady','Hard','Very hard'];
export function validateZones(input){
 const number=x=>x===''||x===null||x===undefined?null:Number(x);
 const ftp=number(input.ftp),hr=['hr_z2','hr_z3','hr_z4','hr_z5'].map(k=>number(input[k]));
 if(ftp!==null&&(!Number.isInteger(ftp)||ftp<30||ftp>1000))throw Error('FTP must be a whole number from 30 to 1000 watts, or blank.');
 if(hr.some(x=>x!==null)&&(!hr.every(x=>Number.isInteger(x)&&x>=30&&x<=300)||!hr.every((x,i)=>!i||x>hr[i-1])))throw Error('Enter all four heart-rate boundaries as increasing whole numbers from 30 to 300 bpm, or leave all four blank.');
 return {ftp,hr_z2:hr[0],hr_z3:hr[1],hr_z4:hr[2],hr_z5:hr[3]};
}
export function zoneDefinitions(settings,kind){
 if(!settings)return [];
 let edges,names,unit;
 if(kind==='power'){if(!settings.ftp)return [];edges=[.55,.75,.9,1.05,1.2,1.5].map(r=>Math.floor(settings.ftp*r)+1);names=POWER_NAMES;unit='W';}
 else {edges=['hr_z2','hr_z3','hr_z4','hr_z5'].map(k=>settings[k]);if(!edges.every(Number.isFinite))return [];names=HR_NAMES;unit='bpm';}
 return names.map((name,i)=>({name,lower:i?edges[i-1]:0,upper:i<edges.length?edges[i]-1:null,unit}));
}
export function classifyZone(value,definitions){return definitions.findIndex(z=>value>=z.lower&&(z.upper===null||value<z.upper+1));}
// Left sample represents its following interval. Never bridge gaps beyond two minutes.
export function timeInZones(streams,kind,settings){
 const definitions=zoneDefinitions(settings,kind),seconds=definitions.map(()=>0),time=streams?.time,values=streams?.[kind==='power'?'watts':'heartrate'];
 if(!definitions.length||!Array.isArray(time)||!Array.isArray(values))return {definitions,seconds,covered:0,skipped:0};
 let covered=0,skipped=0;
 for(let i=0;i<time.length-1;i++){
  const dt=time[i+1]-time[i],v=values[i];
  if(!Number.isFinite(time[i])||!Number.isFinite(time[i+1])||dt<=0)continue;
  if(dt>120||!Number.isFinite(v)||v<0||(kind!=='power'&&v===0)||v>(kind==='power'?5000:300)){skipped+=dt;continue;}
  const zone=classifyZone(v,definitions);if(zone<0){skipped+=dt;continue;}seconds[zone]+=dt;covered+=dt;
 }
 return {definitions,seconds,covered,skipped};
}
