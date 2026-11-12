import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../public/',import.meta.url);
function walk(directory,prefix=''){return fs.readdirSync(directory,{withFileTypes:true}).filter(entry=>!entry.name.startsWith('.')).flatMap(entry=>entry.isDirectory()?walk(new URL(entry.name+'/',directory),prefix+entry.name+'/'):[prefix+entry.name]);}
// Only public offline pages and their dependencies are precached. No account shell,
// sessions, API responses, provider tokens, or user records are stored here.
export const offlineAssets=['/offline.html','/install.html','/privacy.html','/releases.html','/releases.json','/style.css','/pwa.css','/releases.css','/theme.js','/domain.js','/pwa.js','/releases.js','/release-utils.js','/release-playground.js','/imports.js','/rides.js','/fit.js','/telemetry.js','/duplicates.js','/units.js','/vendor/fit-file-parser-6.2.7/parser.js','/icon.svg','/icons/icon-180.png','/icons/icon-192.png','/icons/icon-512.png','/manifest.webmanifest','/sample-rides.csv','/images/release-road.jpg'];
const hash=createHash('sha256');
for(const path of walk(root).filter(path=>path!=='sw.js').sort()){hash.update(path);hash.update(fs.readFileSync(new URL(path,root)));}
const template=fs.readFileSync(new URL('../lib/pwa-worker.js',import.meta.url),'utf8');hash.update(template);
const version=hash.digest('hex').slice(0,16),output=template.replace('__CACHE_NAME__',JSON.stringify('ridevector-public-'+version)).replace('__PUBLIC_ASSETS__',JSON.stringify(offlineAssets));
const target=new URL('sw.js',root);
if(process.argv.includes('--check')){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==output)throw Error('Service worker is stale. Run node scripts/build-pwa.mjs.');console.log('Service worker and public cache version verified.');}
else{fs.writeFileSync(target,output);console.log('Built public offline cache '+version+'.');}
