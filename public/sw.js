/**
 * Co-op Maps - Service Worker
 * Provides offline support and caching
 */

const CACHE_NAME = 'coopmaps-v2';
const STATIC_CACHE = 'coopmaps-static-v2';
const DYNAMIC_CACHE = 'coopmaps-dynamic-v2';

// Files to cache for offline use
const STATIC_FILES = [
    '/',
    '/index.html',
    '/deluxe.html',
    '/express.html',
    '/tutorial.html',
    '/browse.html',
    '/version-selector.html',
    '/config.js',
    '/js/api.js',
    '/js/api-adapter.js',
    '/js/modules/canvas.js',
    '/js/modules/enterprises.js',
    '/js/modules/relationships.js',
    '/js/modules/shapes.js',
    '/js/modules/properties.js',
    '/js/modules/export.js',
    '/js/modules/symbolKey.js',
    '/js/modules/persistence.js',
    '/js/modules/manuals.js',
    '/js/modules/productInfo.js',
    '/js/modules/timeline.js',
    '/js/modules/groups.js',
    '/js/modules/layers.js',
    '/js/modules/statistics.js',
    '/js/modules/comparison.js',
    '/js/modules/reports.js',
    '/js/modules/dependency.js',
    '/js/modules/collaboration.js',
    '/js/modules/import.js',
    '/manifest.json'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('[SW] Static files cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Failed to cache static files:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            return name.startsWith('coopmaps-') &&
                                   name !== STATIC_CACHE &&
                                   name !== DYNAMIC_CACHE;
                        })
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Service worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip API requests - always go to network
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    // Skip external requests
    if (url.origin !== location.origin) {
        return;
    }

    // For HTML files, use network-first strategy (always get fresh content)
    if (event.request.headers.get('accept')?.includes('text/html') ||
        url.pathname.endsWith('.html') ||
        url.pathname === '/') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Cache the fresh response for offline use
                    const responseToCache = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                })
                .catch(() => {
                    // Offline fallback
                    return caches.match(event.request)
                        .then((cached) => cached || caches.match('/index.html'));
                })
        );
        return;
    }

    // For other assets, use cache-first with background update
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached response and update cache in background
                    fetchAndCache(event.request);
                    return cachedResponse;
                }

                // Not in cache, fetch from network
                return fetchAndCache(event.request);
            })
            .catch(() => {
                // Offline fallback for HTML pages
                if (event.request.headers.get('accept')?.includes('text/html')) {
                    return caches.match('/index.html');
                }
            })
    );
});

// Fetch and cache helper
function fetchAndCache(request) {
    return fetch(request)
        .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Add to dynamic cache
            caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                    cache.put(request, responseToCache);
                });

            return response;
        });
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((names) => {
            names.forEach((name) => {
                if (name.startsWith('coopmaps-')) {
                    caches.delete(name);
                }
            });
        });
    }
});

// Background sync for saving diagrams when back online
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-diagrams') {
        event.waitUntil(syncDiagrams());
    }
});

async function syncDiagrams() {
    // This could be used to sync locally saved diagrams to the server
    // when the connection is restored
    console.log('[SW] Syncing diagrams...');
}
