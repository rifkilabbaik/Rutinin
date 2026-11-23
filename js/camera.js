// Kamera timestamp: jam & tanggal + alamat di kanan bawah, hasil TIDAK mirror
import { $, esc, icon, toast, sheet, iso } from './util.js';
import { shareFile } from './send.js';
import { getSettings } from './store.js';
import { db } from './db.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const z = n => String(n).padStart(2, '0');
// "Saturday, November 21, 2026 07:41" (seperti contoh)
export const stampDate = d => `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${z(d.getHours())}:${z(d.getMinutes())}`;

// Gambar teks cap waktu (rata kanan, putih + bayangan)
export function drawStamp(ctx, W, H, lines) {
  const base = Math.min(W, H);
  const m = base * 0.045;
  let fs = base * 0.042;
  ctx.save();
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#FFFFFF';
  const font = s => `500 ${s}px Roboto, "Helvetica Neue", Arial, sans-serif`;
  ctx.font = font(fs);
  const maxW = W - m * 2;
  // pecah baris yang terlalu panjang
  const out = [];
  for (const l of lines) {
    if (ctx.measureText(l).width <= maxW) { out.push(l); continue; }
    let cur = '';
    for (const w of l.split(' ')) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t;
    }
    if (cur) out.push(cur);
  }
  const lh = fs * 1.2;
  const y0 = H - m - (out.length - 1) * lh;
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = fs * 0.28; ctx.shadowOffsetY = fs * 0.05;
  out.forEach((l, i) => ctx.fillText(l, W - m, y0 + i * lh));
  ctx.restore();
}

// Alamat dari GPS lewat OpenStreetMap (Nominatim)
const geoCache = new Map();
async function reverseGeocode(lat, lon) {
  const key = lat.toFixed(4) + ',' + lon.toFixed(4);
  if (geoCache.has(key)) return geoCache.get(key);
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=id`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('geocode ' + r.status);
  const a = (await r.json()).address || {};
  const road = a.road || a.pedestrian || a.footway || a.residential || a.neighbourhood || a.hamlet || a.suburb || a.village || '';
  const street = [road, a.house_number ? `No. ${a.house_number}` : ''].filter(Boolean).join(' ');
  const city = a.city || a.town || a.municipality || a.county || a.regency || a.city_district || '';
  const state = [a.state || a.region, a.postcode].filter(Boolean).join(' ');
  const lines = [...new Set([street, city, state, a.country].filter(Boolean))];
  geoCache.set(key, lines);
  return lines;
}
const dist = (a, b) => { const R = 6371e3, r = Math.PI / 180; const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

export async function render(v) {
  document.body.classList.add('immersive');
  const s = await getSettings();
  let facing = (await db.get('kv', 'cam.facing')) || 'user';
  let stream, timer, watchId, pos = null, geoAt = null, address = null, manual = (await db.get('kv', 'cam.manualAddr')) || null, lastBlob = null, busy = false;

  v.innerHTML = `
    <div class="cam">
      <div class="cam-stage" id="stage">
        <div class="cam-frame" id="frame"><video id="vid" playsinline muted autoplay></video><canvas id="ov"></canvas></div>
        <div class="cam-top">
          <a class="cam-btn" href="#/beranda" aria-label="Tutup">${icon('x')}</a>
          <button class="cam-loc" id="loc">${icon('pin')} Mencari lokasi…</button>
        </div>
      </div>
      <div class="cam-bar">
        <button class="thumb" id="thumb" aria-label="Foto terakhir"></button>
        <button class="shutter" id="shot" aria-label="Ambil foto"></button>
        <button class="cam-btn" id="flip" aria-label="Balik kamera" style="width:52px;height:52px">${icon('flip')}</button>
      </div>
    </div>`;
  const vid = $('#vid', v), ov = $('#ov', v), frame = $('#frame', v), stage = $('#stage', v);

  const lines = (d = new Date()) => [stampDate(d), ...(manual || address || (pos ? [`${pos.lat.toFixed(6)}, ${pos.lon.toFixed(6)}`] : []))];

  function fit() {
    const vw = vid.videoWidth || 720, vh = vid.videoHeight || 1280;
    const W = stage.clientWidth, H = stage.clientHeight;
    let w = W, h = W * vh / vw; if (h > H) { h = H; w = H * vw / vh; }
    frame.style.width = w + 'px'; frame.style.height = h + 'px';
    ov.width = vw; ov.height = vh;
    drawOverlay();
  }
  function drawOverlay() {
    const c = ov.getContext('2d'); c.clearRect(0, 0, ov.width, ov.height);
    drawStamp(c, ov.width, ov.height, lines());
  }

  async function start() {
    stream?.getTracks().forEach(t => t.stop());
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
    } catch (e) {
      $('#loc', v).textContent = 'Kamera tidak bisa dibuka: izinkan akses kamera.';
      return;
    }
    vid.srcObject = stream;
    vid.classList.toggle('mirror', facing === 'user'); // pratinjau seperti cermin; hasil foto tidak
    await vid.play().catch(() => {});
    if (vid.readyState >= 1) fit(); else vid.onloadedmetadata = fit;
  }

  function startGeo() {
    if (!navigator.geolocation) { $('#loc', v).textContent = 'GPS tidak tersedia'; return; }
    watchId = navigator.geolocation.watchPosition(async p => {
      pos = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy };
      if (manual) return;
      if (!geoAt || dist(geoAt, pos) > 25) {
        geoAt = pos;
        try { address = await reverseGeocode(pos.lat, pos.lon); }
        catch { if (!address) address = null; }
      }
      updLoc(); drawOverlay();
    }, err => { $('#loc', v).innerHTML = `${icon('alert')} Lokasi tidak diizinkan — tekan ✎ untuk isi alamat`; }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
  }
  const updLoc = () => {
    const l = manual || address;
    $('#loc', v).innerHTML = `${icon('pin')} ${l ? esc(l[0]) : pos ? `±${Math.round(pos.acc)} m · mencari alamat…` : 'Mencari lokasi…'}`;
  };

  async function shoot() {
    if (busy || !vid.videoWidth) return;
    busy = true;
    const d = new Date();
    const c = document.createElement('canvas'); c.width = vid.videoWidth; c.height = vid.videoHeight;
    const ctx = c.getContext('2d');
    // kamera depan: hasil mirror seperti di layar; teks cap waktu tetap terbaca normal
    if (facing === 'user') { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(vid, 0, 0, c.width, c.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawStamp(ctx, c.width, c.height, lines(d));
    const fl = document.createElement('div'); fl.className = 'flash'; document.body.appendChild(fl); setTimeout(() => fl.remove(), 400);
    lastBlob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
    lastBlob.name = `Foto Absen ${iso(d)} ${z(d.getHours())}.${z(d.getMinutes())}.jpg`;
    $('#thumb', v).style.backgroundImage = `url(${URL.createObjectURL(lastBlob)})`;
    busy = false;
    review(lastBlob);
  }

  function review(blob) {
    const url = URL.createObjectURL(blob);
    const r = document.createElement('div');
    r.className = 'cam-review';
    r.innerHTML = `<img src="${url}" alt="Hasil foto">
      <div class="bar">
        <div class="btns"><button class="btn" style="background:rgba(255,255,255,.14);color:#fff" data-r="again">${icon('camera')}Ulangi</button>
        <button class="btn btn-primary" data-r="send">${icon('send')}Kirim</button></div>
      </div>`;
    document.body.appendChild(r);
    r.onclick = async e => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      if (b.dataset.r === 'again') { r.remove(); return; }
      if (await shareFile(blob, blob.name)) r.remove();
    };
  }

  $('#shot', v).onclick = shoot;
  $('#thumb', v).onclick = () => lastBlob && review(lastBlob);
  $('#flip', v).onclick = async () => { facing = facing === 'user' ? 'environment' : 'user'; await db.put('kv', facing, 'cam.facing'); start(); };
  $('#loc', v).onclick = () => {
    const cur = (manual || address || []).join('\n');
    const sh = sheet({
      title: 'Alamat di foto',
      html: `<p class="muted">Satu baris per baris teks. Kosongkan untuk kembali ke alamat GPS otomatis.</p>
        <div class="field ta"><textarea id="addr" rows="4">${esc(cur)}</textarea></div>`,
      actions: [{ label: 'Pakai GPS', onClick: async x => { manual = null; await db.put('kv', null, 'cam.manualAddr'); updLoc(); drawOverlay(); x.close(); } },
        { label: 'Simpan', primary: true, onClick: async x => {
          const l = $('#addr', x.el).value.split('\n').map(t => t.trim()).filter(Boolean);
          manual = l.length ? l : null; await db.put('kv', manual, 'cam.manualAddr'); updLoc(); drawOverlay(); x.close();
        } }],
    });
  };
  window.addEventListener('resize', fit);
  timer = setInterval(drawOverlay, 1000);
  if (manual) updLoc();
  start(); startGeo();

  return () => {
    clearInterval(timer);
    window.removeEventListener('resize', fit);
    stream?.getTracks().forEach(t => t.stop());
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    document.querySelector('.cam-review')?.remove();
  };
}
