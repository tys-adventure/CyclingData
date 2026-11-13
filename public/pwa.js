import {setupInstallPrompt} from './install-prompt.js';
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
setupInstallPrompt(window,document,standalone());
let registration=null,lastUpdateCheck=Date.now();
document.querySelectorAll('[data-retry-connection]').forEach(button=>button.addEventListener('click',()=>location.reload()));

const offline=document.createElement('div');offline.className='connection-state';offline.role='status';offline.setAttribute('aria-live','polite');offline.hidden=navigator.onLine;
offline.textContent='You’re offline. Saving, sign-in, and ride imports need a connection. Your current form stays here.';document.body.append(offline);
function connectivity(){offline.hidden=navigator.onLine;document.documentElement.classList.toggle('is-offline',!navigator.onLine);}
window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity);connectivity();
// Avoid losing a form to a failed network submission. Nothing is queued silently.
document.addEventListener('submit',event=>{if(!navigator.onLine&&document.body.classList.contains('app-page')){event.preventDefault();event.stopImmediatePropagation();offline.hidden=false;}},true);

const update=document.createElement('section');update.className='app-update';update.setAttribute('aria-label','Application update');update.hidden=true;
update.innerHTML='<div><strong>A fresh RideVector is ready.</strong><p>Finish what you’re doing, then reload to update.</p><span data-update-status role="status"></span></div><div><button type="button" class="primary" data-apply-update>Reload & update</button><button type="button" class="text-button" data-later-update>Later</button></div>';
document.body.append(update);
function offerUpdate(){if(registration?.waiting)update.hidden=false;}
update.querySelector('[data-later-update]').addEventListener('click',()=>update.hidden=true);
update.querySelector('[data-apply-update]').addEventListener('click',()=>{
 const status=update.querySelector('[data-update-status]');
 if(!navigator.onLine){status.textContent='Reconnect before updating.';return;}
 if(document.querySelector('dialog[open],input[type="file"]:disabled')||document.documentElement.dataset.appBusy==='true'){
  status.textContent='Finish or close the current task first. Your work has not been reloaded.';return;
 }
 if(registration?.waiting){status.textContent='Updating…';registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});}
 else location.reload();
});
// A different tab may activate an update: prompt here rather than discarding forms.
let updatingHere=false;
update.querySelector('[data-apply-update]').addEventListener('click',()=>{updatingHere=Boolean(registration?.waiting)&&!document.querySelector('dialog[open],input[type="file"]:disabled')&&document.documentElement.dataset.appBusy!=='true'&&navigator.onLine;});
if('serviceWorker' in navigator&&location.hostname!=='cyclingdata.vercel.app'){
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updatingHere)location.reload();else{update.hidden=false;update.querySelector('[data-update-status]').textContent='An update is available. Reload when you’re ready.';}});
 navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(value=>{
  registration=value;offerUpdate();navigator.serviceWorker.ready.then(()=>{const message=document.querySelector('[data-offline-readiness]');if(message)message.textContent='Public offline guides are ready on this device. Private rides and saving still need a connection.';});
  registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)offerUpdate();});});
 }).catch(()=>{const message=document.querySelector('[data-offline-readiness]');if(message)message.textContent='Offline setup could not finish. Keep a connection available and reopen RideVector to retry.';});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&navigator.onLine&&Date.now()-lastUpdateCheck>30*60000){lastUpdateCheck=Date.now();registration?.update().catch(()=>{});offerUpdate();}});
}
const more=document.getElementById('mobile-more-dialog'),moreButton=document.getElementById('mobile-more');
moreButton?.addEventListener('click',()=>{more.showModal();moreButton.setAttribute('aria-expanded','true');});
more?.querySelector('[data-close-more]')?.addEventListener('click',()=>more.close());
more?.addEventListener('close',()=>moreButton.setAttribute('aria-expanded','false'));
more?.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>more.close()));
const bar=document.querySelector('.mobile-bottom-nav');
if(bar&&window.visualViewport){const adapt=()=>bar.classList.toggle('keyboard-open',window.visualViewport.height<window.innerHeight*.72&&/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''));window.visualViewport.addEventListener('resize',adapt);document.addEventListener('focusout',()=>setTimeout(adapt,100));}
