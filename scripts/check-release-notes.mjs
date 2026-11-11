import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {validateReleases} from '../lib/release-notes.mjs';
export function requiresReleaseNotes(paths){return paths.some(path=>/^(public\/|api\/|lib\/|ios\/|supabase\/migrations\/|package(?:-lock)?\.json$|vercel\.json$)/.test(path)&&!['public/releases.json','public/releases.html'].includes(path)&&! /\.(md|txt)$/i.test(path));}
export function checkReleaseDelta(paths,current,previous){
 if(!requiresReleaseNotes(paths))return;
 if(!paths.includes('public/releases.json')||JSON.stringify(current[0])===JSON.stringify(previous?.[0]))throw Error('Product changes need a release-note update. Add a new entry or describe the change in the newest entry in public/releases.json, then rebuild the release page.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const root=new URL('../',import.meta.url),current=validateReleases(JSON.parse(fs.readFileSync(new URL('public/releases.json',root),'utf8')));
 const argument=name=>{const index=process.argv.indexOf(name);return index<0?null:process.argv[index+1];};
 const base=argument('--base'),head=argument('--head')||'HEAD';
 if(base&&!/^0+$/.test(base)){
  for(const ref of [base,head])if(!/^(?:[a-f0-9]{7,40}|HEAD)$/.test(ref))throw Error('Use a commit SHA or HEAD for release checks.');
  const git=args=>{const result=spawnSync('git',args,{cwd:root,encoding:'utf8'});if(result.status!==0)throw Error(result.stderr||'Git release comparison failed.');return result.stdout;};
  const paths=git(['diff','--name-only',base,head]).trim().split('\n').filter(Boolean);
  const prior=spawnSync('git',['show',base+':public/releases.json'],{cwd:root,encoding:'utf8'});
  let previous=[];if(prior.status===0)previous=JSON.parse(prior.stdout);
  checkReleaseDelta(paths,current,previous);
 }
 console.log('Release notes validated'+(base?' against the product changes.':'.'));
}
