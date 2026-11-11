import {parseCSV,parseXML,MAX_FILE_BYTES} from './rides.js';
export const MAX_BATCH_FILES=100,MAX_BATCH_BYTES=50*1024*1024,MAX_BATCH_RIDES=2000;
export async function readRideFiles(files,onProgress=()=>{}){
  const list=Array.from(files);
  if(!list.length)throw Error('Choose at least one ride file.');
  if(list.length>MAX_BATCH_FILES)throw Error('Choose up to 100 files at a time.');
  if(list.reduce((sum,f)=>sum+f.size,0)>MAX_BATCH_BYTES)throw Error('Choose a batch smaller than 50 MB.');
  const items=[],failures=[];
  for(const [index,file] of list.entries()){
    onProgress(index+1,list.length,file.name);
    try{
      if(file.size>MAX_FILE_BYTES)throw Error('Choose a file smaller than 10 MB.');
      const source=file.name.split('.').pop().toLowerCase();
      if(!['fit','gpx','tcx','csv'].includes(source))throw Error('Use FIT, GPX, TCX, or CSV files.');
      const buffer=await file.arrayBuffer();
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),x=>x.toString(16).padStart(2,'0')).join('');
      const parsed=source==='fit'?(await import('./fit.js')).parseFIT(buffer,file.name):source==='csv'?parseCSV(new TextDecoder().decode(buffer)):parseXML(new TextDecoder().decode(buffer),source,file.name);
      if(items.length+parsed.length>MAX_BATCH_RIDES)throw Error('Batch exceeds 2,000 rides. Import the remaining files separately.');
      items.push(...parsed.map((r,i)=>({...r,source_id:hash+':'+i})));
    }catch(error){failures.push({name:file.name,message:error.message});}
  }
  return {items,failures};
}
