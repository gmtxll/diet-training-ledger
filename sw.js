const CACHE = 'diet-training-shell-v17';
const ASSETS = ['./','./index.html','./styles.css','./sync.css','./app.js?v=17','./manifest.webmanifest'];

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

// Prefer the network so a deployed repair is visible immediately; fall back only offline.
self.addEventListener('fetch', event => {
  const request=event.request;
  if(request.method!=='GET')return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(request,{cache:'no-cache'});
      if(response.ok&&new URL(request.url).origin===location.origin){
        const cache=await caches.open(CACHE);
        await cache.put(request.mode==='navigate'?'./index.html':request,response.clone());
      }
      return response;
    }catch{
      const cache=await caches.open(CACHE);
      return (await cache.match(request)) || (request.mode==='navigate'&&await cache.match('./index.html')) || Response.error();
    }
  })());
});
