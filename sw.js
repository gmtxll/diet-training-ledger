const CACHE = 'diet-training-shell-v12';
const ASSETS = ['./','./index.html','./styles.css','./sync.css','./app.js','./upgrades.js','./manifest.webmanifest'];

async function refreshAsset(cache, url){
  const response = await fetch(url, {cache:'reload'});
  if(response.ok)await cache.put(url, response.clone());
}

self.addEventListener('install', event => event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.all(ASSETS.map(url=>refreshAsset(cache,url)));
  await self.skipWaiting();
})()));

self.addEventListener('activate', event => event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));

// Cached files open instantly. A background conditional request refreshes only changed files.
self.addEventListener('fetch', event => {
  const request=event.request;
  if(request.method!=='GET')return;
  if(request.mode==='navigate'){
    const refresh=caches.open(CACHE).then(cache=>fetch(request,{cache:'no-cache'}).then(response=>{
      if(response.ok)cache.put('./index.html',response.clone());
      return response;
    }));
    event.waitUntil(refresh.catch(()=>{}));
    event.respondWith(caches.match('./index.html').then(cached=>cached||refresh));
    return;
  }
  const refresh=caches.open(CACHE).then(cache=>fetch(request,{cache:'no-cache'}).then(response=>{
    if(response.ok&&new URL(request.url).origin===location.origin)cache.put(request,response.clone());
    return response;
  }));
  event.waitUntil(refresh.catch(()=>{}));
  event.respondWith(caches.match(request).then(cached=>cached||refresh));
});
