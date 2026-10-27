const CACHE = 'riviera-shell-v1';
const APP_SHELL = ['/', '/manifest.webmanifest', '/favicon.svg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(hit => hit || caches.match('/'))));
});
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'Balcones de la Riviera', {
    body: data.body || 'Tenés una novedad en el portal.', icon: '/favicon.svg', badge: '/favicon.svg', data: { url: data.url || '/#mine' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const existing = list.find(client => 'focus' in client);
    return existing ? existing.focus() : clients.openWindow(event.notification.data?.url || '/#mine');
  }));
});
