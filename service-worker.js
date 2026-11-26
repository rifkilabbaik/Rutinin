const CACHE_NAME = 'rutinin-v4';
const APP_SHELL = [
  './', './index.html', './manifest.json', './css/style.css',
  './js/app.js', './js/util.js', './js/config.js', './js/db.js', './js/api.js', './js/auth.js', './js/home.js',
  './js/jadwal.js', './js/komplain.js', './js/profil.js', './js/hari.js', './js/form.js', './js/agenda.js',
  './js/laporan.js', './js/openitem.js', './js/pdf.js', './js/docs.js', './js/send.js', './js/camera.js',
  './js/absen.js', './js/sop.js', './vendor/html2canvas.min.js', './vendor/jspdf.umd.min.js',
  './icons/logo.svg', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)));
});

self.addEventListener('message', e => {
  if (e.data === 'lewati') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
