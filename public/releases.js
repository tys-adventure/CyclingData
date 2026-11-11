import {filterReleases} from './release-utils.js';
const $=selector=>document.querySelector(selector),all=selector=>[...document.querySelectorAll(selector)];
const params=new URLSearchParams(location.search);
let type=['all','new','improved','fixed'].includes(params.get('type'))?params.get('type'):'all',releases=[],toastTimer;
function toast(message){clearTimeout(toastTimer);$('#release-toast').textContent=message;$('#release-toast').hidden=false;toastTimer=setTimeout(()=>{$('#release-toast').hidden=true;},3500);}
function applyFilters(){
 const query=$('#release-search').value;
 const visible=new Set(filterReleases(releases,query,type).map(r=>r.id));
 all('[data-release-id]').forEach(entry=>{entry.hidden=!visible.has(entry.dataset.releaseId);});
 all('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===type)));
 $('#release-results').textContent=`${visible.size} ${visible.size===1?'update':'updates'}${query.trim()?' matching your search':''} · newest first`;
 $('#release-empty').hidden=visible.size!==0;
 const url=new URL(location.href);query.trim()?url.searchParams.set('q',query.trim()):url.searchParams.delete('q');type==='all'?url.searchParams.delete('type'):url.searchParams.set('type',type);history.replaceState(null,'',url.pathname+url.search+url.hash);
}
function openRelease(id){
 const entry=document.getElementById(id);if(!entry?.matches('[data-release-id]'))return;
 if(entry.hidden){type='all';$('#release-search').value='';applyFilters();}
 entry.querySelector('details').open=true;
 entry.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 entry.querySelector('h2').focus({preventScroll:true});
}
try{
 const response=await fetch('/releases.json');if(!response.ok)throw Error('Release search is unavailable.');releases=await response.json();
 document.body.classList.add('js');
 $('#release-search').value=params.get('q')||'';
 $('#release-search').addEventListener('input',applyFilters);
 all('[data-filter]').forEach(button=>button.addEventListener('click',()=>{type=button.dataset.filter;applyFilters();}));
 $('#release-reset').addEventListener('click',()=>{type='all';$('#release-search').value='';applyFilters();$('#release-search').focus();});
 $('#release-jump').addEventListener('change',event=>{if(!event.target.value)return;const id=event.target.value;if(location.hash==='#'+id)openRelease(id);else location.hash=id;});
 window.addEventListener('hashchange',()=>openRelease(location.hash.slice(1)));
 all('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{const url=location.origin+'/releases#'+button.dataset.copy;try{await navigator.clipboard.writeText(url);toast('Release link copied.');}catch{toast('Direct link: '+url);}}));
 applyFilters();if(location.hash)openRelease(location.hash.slice(1));
}catch{document.body.classList.remove('js');$('#release-results').textContent='All published updates · newest first';}
all('[data-demo-grouping]').forEach(toggle=>toggle.addEventListener('change',event=>{const demo=toggle.closest('.release-art');demo.querySelector('[data-demo-distance]').innerHTML=(event.target.checked?'25':'75')+' <span>mi</span>';demo.querySelector('[data-demo-copy-count]').textContent=event.target.checked?'3 copies':'3 entries';}));
all('[data-recovery]').forEach(button=>button.addEventListener('click',()=>{const tired=button.dataset.recovery==='tired',demo=button.closest('.release-art');demo.querySelectorAll('[data-recovery]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));demo.querySelector('[data-demo-thursday]').textContent=tired?'45′':'60′';demo.querySelector('[data-demo-saturday]').textContent=tired?'75′':'90′';demo.querySelector('[data-demo-recovery-note]').textContent=tired?'A gentler example week. This illustration is not a training recommendation.':'A sample week, with space to ride and recover.';}));
