// Service Worker avanzado para CoachMind Baloncesto PWA
const CACHE_NAME = 'coachmind-v3-gemini-live';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.jpg',
  '/icon-192.png',
  '/icon-512.png',
  '/screenshot-wide.png',
  '/screenshot-narrow.png'
];

// Instalación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache partial fallback:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activación y limpieza de cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Borrando caché antigua:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Peticiones Fetch (Network first, nunca cachear /api/)
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones a la API para que siempre vayan al servidor en vivo
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Ignorar peticiones que no sean GET o sean de extensiones
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clonar respuesta válida en caché
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
});

// Sincronización en segundo plano (Background Sync API)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-coachmind-data') {
    event.waitUntil(Promise.resolve());
  }
});

// Sincronización periódica (Periodic Background Sync API)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-drills-and-stats') {
    event.waitUntil(Promise.resolve());
  }
});

// Notificaciones Push (Web Push API)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'CoachMind Baloncesto', body: 'Tienes nuevas actualizaciones tácticas.' };
  const options = {
    body: data.body || 'Novedades en tu pizarra y entrenamientos.',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };
  event.waitUntil(self.registration.showNotification(data.title || 'CoachMind Baloncesto', options));
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
