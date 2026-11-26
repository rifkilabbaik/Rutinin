import { h, icon, sheet, field, z, HARI, BULAN, unduh, toast } from './util.js';
import { bagikan } from './send.js';

const RASIO = [['3:4', 3 / 4], ['1:1', 1], ['9:16', 9 / 16]];

const stampTanggal = d => `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()} ${z(d.getHours())}.${z(d.getMinutes())}`;
const simpanKv = (k, v) => { try { localStorage.setItem('rutinin.cam.' + k, JSON.stringify(v)); } catch {} };
const ambilKv = (k, def) => { try { return JSON.parse(localStorage.getItem('rutinin.cam.' + k)) ?? def; } catch { return def; } };

function gambarStamp(ctx, W, H, baris) {
  const dasar = Math.min(W, H);
  const m = dasar * 0.045, fs = dasar * 0.042;
  ctx.save();
  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `600 ${fs}px Nunito, Roboto, Arial, sans-serif`;
  const maks = W - m * 2, out = [];
  for (const l of baris) {
    if (ctx.measureText(l).width <= maks) { out.push(l); continue; }
    let kini = '';
    for (const w of l.split(' ')) {
      const t = kini ? kini + ' ' + w : w;
      if (ctx.measureText(t).width > maks && kini) { out.push(kini); kini = w; } else kini = t;
    }
    if (kini) out.push(kini);
  }
  const lh = fs * 1.2, y0 = H - m - (out.length - 1) * lh;
  ctx.shadowColor = 'rgba(0,0,0,.6)';
  ctx.shadowBlur = fs * 0.28;
  ctx.shadowOffsetY = fs * 0.05;
  out.forEach((l, i) => ctx.fillText(l, W - m, y0 + i * lh));
  ctx.restore();
}

const geoCache = new Map();
async function alamat(lat, lon) {
  const key = lat.toFixed(4) + ',' + lon.toFixed(4);
  if (geoCache.has(key)) return geoCache.get(key);
  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=id`, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('geo');
  const a = (await r.json()).address || {};
  const jalan = [a.road || a.pedestrian || a.residential || a.neighbourhood || a.suburb || a.village || '', a.house_number ? 'No. ' + a.house_number : ''].filter(Boolean).join(' ');
  const kota = a.city || a.town || a.municipality || a.county || a.regency || a.city_district || '';
  const prov = [a.state || a.region, a.postcode].filter(Boolean).join(' ');
  const out = [...new Set([jalan, kota, prov].filter(Boolean))];
  geoCache.set(key, out);
  return out;
}
const jarak = (a, b) => { const R = 6371e3, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

export function bukaKamera({ pilih = false } = {}) {
  return new Promise(selesai => {
    let hadap = ambilKv('hadap', 'environment'), manual = ambilKv('alamat', null), rasio = ambilKv('rasio', '3:4');
    const nilaiRasio = () => (RASIO.find(x => x[0] === rasio) || RASIO[0])[1];
    const potong = () => {
      const vw = vid.videoWidth || 720, vh = vid.videoHeight || 1280, r = nilaiRasio();
      const cw = vw / vh > r ? vh * r : vw, ch = vw / vh > r ? vh : vw / r;
      return { sx: (vw - cw) / 2, sy: (vh - ch) / 2, cw: Math.round(cw), ch: Math.round(ch) };
    };
    let stream = null, timer = null, watch = null, pos = null, geoDi = null, addr = null, sibuk = false, tutup = false;
    const vid = h('video', { playsinline: true, muted: true, autoplay: true });
    vid.muted = true;
    const ov = h('canvas', { class: 'cam-ov' });
    const frame = h('div', { class: 'cam-frame' }, vid, ov);
    const stage = h('div', { class: 'cam-stage' }, frame);
    const lok = h('button', { type: 'button', class: 'cam-loc' }, icon('pin'), 'Mencari lokasi');
    const root = h('div', { class: 'cam', role: 'dialog', 'aria-label': 'Kamera' }, stage,
      h('div', { class: 'cam-top' }, h('button', { type: 'button', class: 'cam-btn', 'aria-label': 'Tutup', onclick: () => akhiri(null) }, icon('x')), lok),
      h('div', { class: 'cam-rasio', role: 'group', 'aria-label': 'Rasio foto' }, RASIO.map(([k]) => {
        const b = h('button', { type: 'button', class: 'cam-r' + (k === rasio ? ' on' : ''), 'aria-pressed': String(k === rasio) }, k);
        b.addEventListener('click', () => { rasio = k; simpanKv('rasio', k); root.querySelectorAll('.cam-r').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); }); pas(); });
        return b;
      })),
      h('div', { class: 'cam-bar' }, h('span', { class: 'cam-gap' }), h('button', { type: 'button', class: 'shutter', 'aria-label': 'Ambil foto', onclick: jepret }),
        h('button', { type: 'button', class: 'cam-btn', 'aria-label': 'Balik kamera', onclick: () => { hadap = hadap === 'user' ? 'environment' : 'user'; simpanKv('hadap', hadap); mulai(); } }, icon('flip'))));
    document.body.append(root);

    const baris = (d = new Date()) => [stampTanggal(d), ...(manual || addr || (pos ? [`${pos.lat.toFixed(6)}, ${pos.lon.toFixed(6)}`] : []))];
    const tulisLok = () => { const l = manual || addr; lok.replaceChildren(icon('pin'), l ? l[0] : pos ? 'Mencari alamat' : 'Mencari lokasi'); };

    function pas() {
      const r = nilaiRasio(), { cw, ch } = potong();
      const W = stage.clientWidth, H = stage.clientHeight;
      let w = W, hh = W / r;
      if (hh > H) { hh = H; w = H * r; }
      frame.style.width = w + 'px';
      frame.style.height = hh + 'px';
      ov.width = cw;
      ov.height = ch;
      overlay();
    }
    function overlay() { const c = ov.getContext('2d'); c.clearRect(0, 0, ov.width, ov.height); gambarStamp(c, ov.width, ov.height, baris()); }

    async function mulai() {
      stream?.getTracks().forEach(t => t.stop());
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: hadap }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); }
      catch { lok.replaceChildren(icon('alert'), 'Kamera tidak bisa dibuka.'); return; }
      if (tutup) { stream.getTracks().forEach(t => t.stop()); return; }
      vid.srcObject = stream;
      vid.classList.toggle('mirror', hadap === 'user');
      await vid.play().catch(() => {});
      if (vid.readyState >= 1) pas(); else vid.onloadedmetadata = pas;
    }

    function mulaiGeo() {
      if (!navigator.geolocation) { lok.replaceChildren(icon('alert'), 'GPS tidak tersedia'); return; }
      watch = navigator.geolocation.watchPosition(async p => {
        pos = { lat: p.coords.latitude, lon: p.coords.longitude };
        if (!manual && (!geoDi || jarak(geoDi, pos) > 25)) {
          geoDi = pos;
          try { addr = await alamat(pos.lat, pos.lon); } catch {}
        }
        tulisLok();
        overlay();
      }, () => lok.replaceChildren(icon('alert'), 'Lokasi tidak diizinkan'), { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
    }

    async function jepret() {
      if (sibuk || !vid.videoWidth) return;
      sibuk = true;
      const d = new Date();
      const { sx, sy, cw, ch } = potong();
      const c = h('canvas', { width: cw, height: ch });
      const ctx = c.getContext('2d');
      if (hadap === 'user') { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(vid, sx, sy, cw, ch, 0, 0, cw, ch);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      gambarStamp(ctx, c.width, c.height, baris(d));
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
      sibuk = false;
      tinjau(blob, `Foto ${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}.${z(d.getMinutes())}.jpg`);
    }

    function tinjau(blob, nama) {
      const url = URL.createObjectURL(blob);
      const r = h('div', { class: 'cam-review' }, h('img', { src: url, alt: 'Hasil foto' }),
        h('div', { class: 'cam-review-bar' + (pilih ? '' : ' tiga') },
          h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => { URL.revokeObjectURL(url); r.remove(); } }, icon('cam'), 'Ulangi'),
          pilih ? null : h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => { unduh(blob, nama); toast('Foto tersimpan di folder Download'); } }, icon('save'), 'Simpan'),
          pilih
            ? h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { URL.revokeObjectURL(url); r.remove(); akhiri(blob); } }, icon('check'), 'Pakai')
            : h('button', { type: 'button', class: 'btn btn-primary', onclick: async () => { await bagikan(blob, nama); } }, icon('send'), 'Kirim')));
      root.append(r);
    }

    lok.addEventListener('click', () => {
      const ta = h('textarea', { rows: 4, maxlength: 200, value: (manual || addr || []).join('\n') });
      sheet({
        title: 'Alamat di foto', body: field('Satu baris per baris teks', ta),
        actions: [
          { label: 'Pakai GPS', onClick: c => { manual = null; simpanKv('alamat', null); tulisLok(); overlay(); c.close(); } },
          { label: 'Simpan', primary: true, onClick: c => { const l = ta.value.split('\n').map(t => t.trim()).filter(Boolean); manual = l.length ? l : null; simpanKv('alamat', manual); tulisLok(); overlay(); c.close(); } }
        ]
      });
    });

    function akhiri(hasil) {
      if (tutup) return;
      tutup = true;
      clearInterval(timer);
      window.removeEventListener('resize', pas);
      stream?.getTracks().forEach(t => t.stop());
      if (watch != null) navigator.geolocation.clearWatch(watch);
      root.remove();
      selesai(hasil);
    }
    root.akhiri = akhiri;

    window.addEventListener('resize', pas);
    timer = setInterval(overlay, 1000);
    if (manual) tulisLok();
    mulai();
    mulaiGeo();
  });
}

export function render() {
  bukaKamera({}).then(() => { if (location.hash.startsWith('#kamera')) history.length > 1 ? history.back() : (location.hash = 'beranda'); });
  return () => document.querySelector('.cam')?.akhiri?.(null);
}
