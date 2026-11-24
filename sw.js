/* Corbeau : mise en cache légère. Les données (Supabase) ne sont jamais mises en cache. */
var V = "corbeau-v1";
var SHELL = ["style.css", "config.js", "logo.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  if (r.mode === "navigate") {
    /* pages : toujours la version la plus récente, copie en secours si pas d'internet */
    e.respondWith(fetch(r).then(function (res) {
      var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); return res;
    }).catch(function () { return caches.match(r).then(function (m) { return m || caches.match("/"); }); }));
    return;
  }
  /* fichiers du site : version en cache tout de suite, mise à jour en arrière-plan */
  e.respondWith(caches.match(r).then(function (m) {
    var net = fetch(r).then(function (res) {
      if (res.ok) { var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); }
      return res;
    }).catch(function () { return m; });
    return m || net;
  }));
});
