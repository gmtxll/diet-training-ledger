const CACHE = 'diet-training-shell-v58';
const ASSETS = ['./','./index.html','./styles.css','./sync.css','./app.js?v=58','./manifest.webmanifest'];

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

// App shell must open immediately on mobile. Return the local shell first and
// refresh it in the background; network-first made Safari wait on slow DNS/VPN.
self.addEventListener('fetch', event => {
  const request=event.request;
  if(request.method!=='GET')return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cacheKey=request.mode==='navigate'?'./index.html':request;
    const cached=await cache.match(cacheKey);
    const refresh=fetch(request,{cache:'no-cache'}).then(async response=>{
      if(response.ok&&new URL(request.url).origin===location.origin){
        await cache.put(cacheKey,response.clone());
      }
      return response;
    });
    if(cached){
      event.waitUntil(refresh.catch(()=>{}));
      return cached;
    }
    try{
      return await refresh;
    }catch{
      return (await cache.match(cacheKey)) || Response.error();
    }
  })());
});
