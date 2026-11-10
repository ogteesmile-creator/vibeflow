const CACHE_NAME = "vibeflow-shell-v1";
const SHELL = ["./","./index.html","./styles.css","./app.js","./manifest.webmanifest","./icons/icon.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))));
self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET" || new URL(req.url).origin!==location.origin) return;
  event.respondWith(fetch(req).then(response=>{
    const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(req,copy)); return response;
  }).catch(()=>caches.match(req).then(hit=>hit||caches.match("./index.html"))));
});