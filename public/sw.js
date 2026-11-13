// Build injects a content-based cache name and a fixed public-asset allowlist.
const CACHE="ridevector-public-643704a1ef80764c";
const PUBLIC_ASSETS=["/offline.html","/install.html","/privacy.html","/releases.html","/releases.json","/style.css","/pwa.css","/releases.css","/theme.js","/domain.js","/pwa.js","/install-prompt.js","/releases.js","/release-utils.js","/release-playground.js","/imports.js","/rides.js","/fit.js","/telemetry.js","/duplicates.js","/units.js","/vendor/fit-file-parser-6.2.7/parser.js","/icon.svg","/icons/icon-180.png","/icons/icon-192.png","/icons/icon-512.png","/manifest.webmanifest","/sample-rides.csv","/images/release-road.jpg"];
const publicPaths=new Set(PUBLIC_ASSETS);
const pageAliases={'/install':'/install.html','/releases':'/releases.html','/privacy':'/privacy.html'};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC_ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('ridevector-public-')&&key!==CACHE).map(key=>caches.delete(key))))));
// Updates activate only after a user explicitly chooses Reload in the app.
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||request.headers.has('Authorization')||url.pathname.startsWith('/api/'))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(async()=>{
   const cache=await caches.open(CACHE);
   // Never persist or replay callback URLs, query strings, or account HTML.
   const page=pageAliases[url.pathname]||url.pathname;
   if(!url.search&&['/install.html','/releases.html','/privacy.html','/offline.html'].includes(page))return (await cache.match(page))||cache.match('/offline.html');
   return cache.match('/offline.html');
  }));return;
 }
 // API, auth, ride, sensor, and third-party responses never enter this cache.
 if(url.search||!publicPaths.has(url.pathname))return;
 event.respondWith(fetch(request).catch(async()=>{const cached=await (await caches.open(CACHE)).match(url.pathname);return cached||Response.error();}));
});
