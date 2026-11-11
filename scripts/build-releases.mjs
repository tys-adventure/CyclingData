import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {renderPage,validateReleases} from '../lib/release-notes.mjs';
const root=new URL('../',import.meta.url);
const releases=validateReleases(JSON.parse(fs.readFileSync(new URL('public/releases.json',root),'utf8')));
const output=renderPage(releases),destination=new URL('public/releases.html',root);
if(process.argv.includes('--check')){
 if(!fs.existsSync(destination)||fs.readFileSync(destination,'utf8')!==output)throw Error('Release page is stale. Run node scripts/build-releases.mjs and include the generated public/releases.html.');
 console.log('Release page matches its source data.');
}else{fs.writeFileSync(destination,output);console.log('Built '+fileURLToPath(destination)+' from '+releases.length+' releases.');}
