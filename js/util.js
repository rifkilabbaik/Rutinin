// Utilitas umum + komponen UI kecil (sheet, toast, chips)

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s = '') => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const clone = o => JSON.parse(JSON.stringify(o));
export const icon = (n, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const z = n => String(n).padStart(2, '0');

export function iso(d = new Date()) { return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; }
export function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
export function addDays(s, n) { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); }
export const hari = s => HARI[parseISO(s).getDay()];
// "Sabtu, 05 September 2026"
export function tglPanjang(s) { const d = parseISO(s); return `${HARI[d.getDay()]}, ${z(d.getDate())} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; }
// "05 September 2026"
export function tgl(s) { if (!s) return '-'; const d = parseISO(s); return `${z(d.getDate())} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; }
// "05 Sep"
export function tglPendek(s) { if (!s) return '-'; const d = parseISO(s); return `${z(d.getDate())} ${BULAN[d.getMonth()].slice(0, 3)}`; }
// "05-09-2026"
export function tglFile(s) { const [y, m, d] = s.split('-'); return `${d}-${m}-${y}`; }
export const jam = t => (t || '').replace(':', '.');
export const menit = t => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };
export const dariMenit = n => `${z(Math.floor(n / 60) % 24)}:${z(n % 60)}`;
export const nowHM = () => { const d = new Date(); return `${z(d.getHours())}.${z(d.getMinutes())}`; };

export const norm = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

export function debounce(fn, ms = 500) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

const scripts = {};
export function loadScript(src) {
  return scripts[src] ||= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => { delete scripts[src]; rej(new Error('Gagal memuat ' + src)); };
    document.head.appendChild(s);
  });
}

export function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch {}
    ta.remove(); return ok;
  }
}

export function openPortal(url) {
  if (!url) { toast('Link belum diatur. Buka Pengaturan → Link Portal.'); return false; }
  // Di PWA terpasang (Android), link luar terbuka sebagai jendela di atas aplikasi.
  window.open(url, '_blank', 'noopener');
  return true;
}

// ---------- Toast ----------
let toastTimer;
export function toast(msg, ms = 2600) {
  const el = $('#toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ---------- Bottom sheet ----------
export function sheet({ title = '', html = '', actions = [], onMount, full = false, dismissible = true } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet';
  wrap.innerHTML = `<div class="sheet-backdrop"></div>
    <div class="sheet-card ${full ? 'full' : ''}" role="dialog" aria-modal="true">
      <div class="grab"></div>
      ${title ? `<div class="sheet-head"><h2>${esc(title)}</h2>${dismissible ? `<button class="icon-btn flat sm" data-x aria-label="Tutup">${icon('x')}</button>` : ''}</div>` : ''}
      <div class="sheet-body">${html}</div>
      ${actions.length ? `<div class="sheet-actions">${actions.map((a, i) => `<button class="btn ${a.cls || (a.primary ? 'btn-primary' : 'btn-soft')}" data-a="${i}">${a.label}</button>`).join('')}</div>` : ''}
    </div>`;
  document.body.appendChild(wrap);
  document.body.classList.add('has-sheet');
  let closed = false;
  const api = {
    el: wrap, body: $('.sheet-body', wrap),
    close() {
      if (closed) return; closed = true;
      wrap.classList.add('closing');
      setTimeout(() => { wrap.remove(); if (!$('.sheet')) document.body.classList.remove('has-sheet'); }, 200);
      api.onClose?.();
    },
  };
  if (dismissible) {
    $('.sheet-backdrop', wrap).onclick = () => api.close();
    $('[data-x]', wrap) && ($('[data-x]', wrap).onclick = () => api.close());
  }
  $$('[data-a]', wrap).forEach(b => b.onclick = () => actions[+b.dataset.a].onClick?.(api));
  onMount?.(api);
  return api;
}

export function confirmBox(msg, { ok = 'Ya', cancel = 'Batal' } = {}) {
  return new Promise(res => {
    const s = sheet({
      title: 'Konfirmasi', html: `<p>${esc(msg)}</p>`,
      actions: [{ label: cancel, onClick: x => { x.close(); res(false); } }, { label: ok, primary: true, onClick: x => { x.close(); res(true); } }],
    });
    s.onClose = () => res(false);
  });
}

// ---------- Chips (pilihan cepat + tambah baru) ----------
// opts: {options:[], selected:[] , multi, allowAdd, addLabel, onChange(selectedArray)}
export function chips(el, { options = [], selected = [], multi = false, allowAdd = true, addLabel = '+ Lainnya', onChange } = {}) {
  let sel = [...selected];
  let opts = [...new Set([...options, ...selected].filter(Boolean))];
  const draw = () => {
    el.innerHTML = opts.map(o => `<button type="button" class="chip ${sel.includes(o) ? 'on' : ''}" data-v="${esc(o)}">${esc(o)}</button>`).join('')
      + (allowAdd ? `<button type="button" class="chip add" data-add>${esc(addLabel)}</button>` : '');
  };
  el.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-add')) {
      const v = prompt('Tulis pilihan baru:');
      if (v && v.trim()) { const t = v.trim(); if (!opts.includes(t)) opts.push(t); sel = multi ? [...new Set([...sel, t])] : [t]; draw(); onChange?.(sel); }
      return;
    }
    const v = b.dataset.v;
    if (multi) sel = sel.includes(v) ? sel.filter(x => x !== v) : [...sel, v];
    else sel = sel.includes(v) ? [] : [v];
    draw(); onChange?.(sel);
  };
  draw();
  return { get value() { return sel; }, set(v) { sel = [...v]; opts = [...new Set([...opts, ...v])]; draw(); } };
}

// Kompres foto → JPEG max 1600px
export async function compressImage(file, max = 1600, q = 0.85) {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(b => r(b || file), 'image/jpeg', q));
}

export function linesOf(text) { return String(text || '').split('\n').map(s => s.replace(/^[-•*\d.)\s]+/, '').trim()).filter(Boolean); }
export function sentence(s) { s = String(s || '').trim(); if (!s || /^[-–]+$/.test(s)) return s; s = s[0].toUpperCase() + s.slice(1); return /[.!?]$/.test(s) ? s : s + '.'; }
