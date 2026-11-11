export function wahooResultMessage(result){return ({connected:'Wahoo connected. Choose Import latest rides to bring in your cycling history.',denied:'Wahoo connection canceled. Your files and other connections are still available.',browser_session:'Wahoo could not verify this browser session. Connect again in the same browser; try Safari or Chrome if needed.',expired:'The Wahoo connection link expired or was already used. Please connect again.',token_exchange:'Wahoo did not complete authorization or grant the required read permissions. Please reconnect.',profile:'Wahoo could not verify your account. Please reconnect.',connection_save:'Your Wahoo connection could not be saved. Check whether this Wahoo account is already linked to another RideVector account, then retry.'})[result]||'Wahoo could not connect. Please try again from Connections.';}
export function wahooImportMessage(out){
 const skipped=out.skipped||{},invalid=Object.entries(skipped).filter(([key])=>key.startsWith('invalid_')).reduce((n,[,count])=>n+count,0);
 const reasons=[skipped.incomplete?skipped.incomplete+' without completed results':null,skipped.noncycling?skipped.noncycling+' non-cycling':null,invalid?invalid+' with missing or invalid ride fields':null].filter(Boolean);
 return out.imported+' Wahoo cycling recordings saved or updated from '+out.examined+' workouts checked. Matching source copies count once.'+(reasons.length?' Skipped: '+reasons.join('; ')+'.':'')+(out.hasMore?' More history is available with Import older rides.':!out.imported?' No importable cycling recordings were available. Original FIT files are an alternative.':'');
}
export function createWahooUI({needUser,notify,loadRides,getUser,getClient,busy}){
 const $=id=>document.getElementById(id);let owner=null;
 async function api(path,method='GET'){
  const account=getUser()?.id;if(!account)throw Error('Sign in before connecting Wahoo.');
  const {data}=await getClient().auth.getSession();
  const response=await fetch('/api/wahoo/'+path,{method,headers:{Authorization:'Bearer '+data.session?.access_token}});
  const result=await response.json();if(getUser()?.id!==account)throw Error('Your account changed. Please retry.');
  if(!response.ok)throw Error(result.error||'Wahoo connection request failed.');return result;
 }
 function reset(){owner=null;$('wahoo-status').textContent='Not connected';$('connect-wahoo').hidden=false;for(const id of ['sync-wahoo','older-wahoo','disconnect-wahoo'])$(id).hidden=true;$('wahoo-message').textContent='';}
 async function load(){const account=getUser()?.id;if(!account){reset();return;}owner=account;try{
  const c=await api('status');if(owner!==account)return;
  $('wahoo-status').textContent=c.connected?'Connected to Wahoo':c.configured?'Ready to connect':'Setup required';
  $('connect-wahoo').hidden=c.connected;$('sync-wahoo').hidden=!c.connected;$('older-wahoo').hidden=!c.connected||!c.hasMore;$('disconnect-wahoo').hidden=!c.connected;
  $('wahoo-message').textContent=c.connected?(c.lastSynced?'Last imported '+new Date(c.lastSynced).toLocaleString()+'. Imported rides stay saved if you disconnect.':'Ready for your first import.'):(c.configured?'':'Wahoo is being configured. You can still upload FIT files.');
 }catch(e){if(owner===account)$('wahoo-message').textContent=e.message;}}
 $('connect-wahoo').onclick=async()=>{if(!needUser())return;await busy($('connect-wahoo'),async()=>{try{const {url}=await api('start','POST');location.assign(url);}catch(e){notify(e.message,true);}});};
 async function sync(button,older=false){await busy(button,async()=>{try{const out=await api('sync'+(older?'?older=1':''),'POST');await loadRides();await load();notify(wahooImportMessage(out));}catch(e){await loadRides();notify(e.message+' Any saved recordings are safe to reimport.',true);}});}
 $('sync-wahoo').onclick=()=>sync($('sync-wahoo'));
 $('older-wahoo').onclick=()=>sync($('older-wahoo'),true);
 $('disconnect-wahoo').onclick=async()=>{if(!confirm('Revoke RideVector’s Wahoo access? Previously imported rides will stay saved. You can remove them individually in My rides.'))return;await busy($('disconnect-wahoo'),async()=>{try{await api('disconnect','POST');await load();notify('Wahoo disconnected. Previously imported rides are still saved.');}catch(e){notify(e.message,true);}});};
 return {load,reset};
}
