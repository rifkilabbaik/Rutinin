export const $ = (s, r = document) => r.querySelector(s);

export function h(tag, a, ...kids) {
  const el = document.createElement(tag);
  let val;
  if (a) for (const [k, v] of Object.entries(a)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') val = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = true;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k instanceof Node ? k : String(k));
  if (val !== undefined) el.value = val;
  return el;
}

const NS = 'http://www.w3.org/2000/svg';
export function icon(name, cls = 'ic') {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('class', cls);
  s.setAttribute('aria-hidden', 'true');
  const u = document.createElementNS(NS, 'use');
  u.setAttribute('href', '#i-' + name);
  s.append(u);
  return s;
}

export const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const z = n => String(n).padStart(2, '0');
export const iso = (d = new Date()) => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
export const parse = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
export const tglPanjang = s => { const d = parse(s); return `${HARI[d.getDay()]}, ${z(d.getDate())} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };
export const tgl = s => { if (!s) return '-'; const d = parse(s); return isNaN(d) ? String(s) : `${z(d.getDate())} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };
export const tglPendek = s => { const d = parse(s); return isNaN(d) ? ['-', ''] : [String(d.getDate()), BULAN[d.getMonth()].slice(0, 3)]; };
export const tglFile = s => s.split('-').reverse().join('-');
export const jamTampil = t => (t || '').replace(':', '.');
export const jamDari = s => (String(s).split(' ')[1] || '').replace(':', '.');
export const menit = t => { const [a, b] = String(t || '0:0').split(':').map(Number); return a * 60 + b; };
export const dariMenit = m => `${z(Math.floor(m / 60) % 24)}:${z(m % 60)}`;
export const geser = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const uid = (p = 'k') => (p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 32);

let tt;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(tt);
  tt = setTimeout(() => { t.hidden = true; }, 2800);
}

export function sheet({ title, body, actions = [], full = false, onClose }) {
  let done = false;
  const close = () => { if (done) return; done = true; wrap.remove(); onClose?.(); };
  const ctl = { close };
  const wrap = h('div', { class: 'sheet-wrap' },
    h('div', { class: 'sheet-bg', onclick: close }),
    h('div', { class: 'sheet' + (full ? ' full' : ''), role: 'dialog', 'aria-label': title },
      h('div', { class: 'sheet-head' }, h('h2', null, title), h('button', { class: 'icon-btn flat', type: 'button', 'aria-label': 'Tutup', onclick: close }, icon('x'))),
      h('div', { class: 'sheet-body' }, body),
      actions.length ? h('div', { class: 'sheet-actions' }, actions.map(a => h('button', {
        class: 'btn' + (a.primary ? ' btn-primary' : '') + (a.danger ? ' btn-danger' : ''), type: 'button',
        onclick: async e => { const b = e.currentTarget; b.disabled = true; try { await a.onClick(ctl); } finally { b.disabled = false; } }
      }, a.label))) : null));
  ctl.el = wrap;
  document.body.append(wrap);
  return ctl;
}

export function konfirmasi(title, teks, ok = 'Ya') {
  return new Promise(res => {
    let hasil = false;
    sheet({
      title, body: h('p', { class: 'muted' }, teks), onClose: () => res(hasil),
      actions: [{ label: 'Batal', onClick: x => x.close() }, { label: ok, primary: true, onClick: x => { hasil = true; x.close(); } }]
    });
  });
}

export function field(label, input, extra) {
  if (input?.classList?.contains('dd') && !input.dataset.judul) input.dataset.judul = label;
  return h('label', { class: 'field' }, h('span', null, label), input, extra);
}

function bukaDaftar(judul, daftar, nilai, onPilih) {
  const cari = daftar.length > 8 ? h('input', { type: 'search', placeholder: 'Cari', 'aria-label': 'Cari ' + judul, maxlength: 60 }) : null;
  const list = h('div', { class: 'dd-list', role: 'listbox', 'aria-label': judul });
  let ctl;
  const gambar = () => {
    const q = (cari?.value || '').trim().toLowerCase();
    const isi = daftar.filter(o => !q || o.l.toLowerCase().includes(q));
    list.replaceChildren(...(isi.length ? isi.map(o => h('button', {
      type: 'button', class: 'dd-opt' + (o.v === nilai ? ' on' : ''), role: 'option', 'aria-selected': String(o.v === nilai),
      onclick: () => { ctl.close(); onPilih(o.v); }
    }, h('span', null, o.l), o.v === nilai ? icon('check') : null)) : [h('p', { class: 'muted small' }, 'Tidak ditemukan.')]));
  };
  cari?.addEventListener('input', gambar);
  gambar();
  ctl = sheet({ title: judul, body: h('div', { class: 'stack-sm' }, cari, list) });
  if (cari && window.matchMedia('(pointer: fine)').matches) cari.focus();
}

export function select(opsi, nilai, attrs = {}) {
  const semua = opsi.map(o => Array.isArray(o) ? { v: o[0], l: String(o[1]) } : { v: o, l: String(o) });
  const awal = semua.find(o => o.v === '');
  const placeholder = awal ? awal.l : 'Pilih';
  const daftar = semua.filter(o => o.v !== '' || !/^Pilih/.test(o.l));
  let v = semua.some(o => o.v === nilai) ? nilai : (awal ? '' : semua[0]?.v ?? '');
  const { required, ...sisa } = attrs;
  const teks = h('span', { class: 'dd-teks' });
  const btn = h('button', { ...sisa, type: 'button', class: 'dd', 'aria-haspopup': 'listbox' }, teks, icon('down'));
  const tulis = () => { const o = semua.find(x => x.v === v); teks.textContent = o ? o.l : placeholder; btn.classList.toggle('dd-kosong', v === ''); };
  Object.defineProperty(btn, 'value', { get: () => v, set: x => { v = x; tulis(); } });
  btn.addEventListener('click', e => {
    e.preventDefault();
    bukaDaftar(btn.dataset.judul || btn.getAttribute('aria-label') || placeholder, daftar, v, x => {
      v = x;
      tulis();
      btn.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  tulis();
  return btn;
}

export function seg(opsi, nilai, onPilih, cls = '') {
  const el = h('div', { class: ('seg ' + cls).trim(), role: 'group' });
  const btns = opsi.map(o => {
    const [v, l] = Array.isArray(o) ? o : [o, o];
    const b = h('button', { type: 'button', class: 'seg-btn' + (v === nilai ? ' on' : ''), 'aria-pressed': String(v === nilai) }, l);
    b.addEventListener('click', () => {
      btns.forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      onPilih(v);
    });
    return b;
  });
  el.append(...btns);
  return el;
}

export function toggle(label, nilai, onUbah) {
  const inp = h('input', { type: 'checkbox', checked: nilai, onchange: e => onUbah(e.target.checked) });
  return h('label', { class: 'toggle' }, inp, h('span', { class: 'toggle-ui' }), h('span', null, label));
}

export const WARNA = {
  'Rencana': 'blue', 'Proses': 'yellow', 'Selesai': 'green', 'Didelegasikan': 'purple', 'Ditunda': 'gray', 'Batal': 'red',
  'Sebagian': 'yellow', 'Tidak Terlaksana': 'red', 'Dipindah': 'gray',
  'Tercapai': 'green', 'Dalam Progress': 'yellow', 'Belum Tercapai': 'red',
  'Target Selesai': 'orange', 'Mulai Dikerjakan': 'blue',
  'Menunggu': 'yellow', 'Disetujui': 'green', 'Ditolak': 'red', 'Dialihkan': 'gray',
  'Belum dikonfirmasi': 'yellow', 'Terkonfirmasi': 'green', 'Lewat target': 'red', 'Saran': 'gray',
  'Sempurna': 'green', 'Sangat Baik': 'green', 'Baik': 'blue', 'Cukup': 'yellow', 'Buruk': 'red'
};
export const chip = (teks, warna) => h('span', { class: 'pill pill-' + (warna || WARNA[teks] || 'gray') }, teks || '-');

export function kosong(teks, tombol, aksi) {
  return h('div', { class: 'empty' }, h('p', null, teks), tombol ? (typeof aksi === 'string' ? h('a', { class: 'btn btn-sm', href: aksi }, tombol) : h('button', { class: 'btn btn-sm', type: 'button', onclick: aksi }, tombol)) : null);
}

export const memuat = () => h('div', { class: 'loading', role: 'status' }, h('i'), h('i'), h('i'));

export function badgeTgl(s, tone = 'soft') {
  const [d, m] = tglPendek(s);
  return h('span', { class: 'badge tone-' + tone }, d, h('small', null, m));
}

export function baris({ badge, title, sub, right, onclick, href, cls = '' }) {
  const isi = [badge, h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, title), sub ? h('span', { class: 'row-sub' }, sub) : null), right];
  if (href) return h('a', { class: 'row ' + cls, href }, isi);
  if (onclick) return h('button', { class: 'row ' + cls, type: 'button', onclick }, isi);
  return h('div', { class: 'row ' + cls }, isi);
}

export function seksi(judul, isi, link) {
  return h('section', { class: 'section' }, h('div', { class: 'sec-head' }, h('h3', { class: 'h' }, judul), link ? h('a', { class: 'link', href: link[1] }, link[0]) : null), isi);
}

export async function kompres(blob, max = 1600, q = 0.82) {
  const bmp = await createImageBitmap(blob);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = h('canvas', { width: Math.round(bmp.width * s), height: Math.round(bmp.height * s) });
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', q));
}

export const keDataUrl = blob => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = rej; f.readAsDataURL(blob); });
export const keBase64 = async blob => (await keDataUrl(blob)).split(',')[1];

export function pilihGaleri() {
  return new Promise(res => {
    const i = h('input', { type: 'file', accept: 'image/*', class: 'sr-only' });
    i.addEventListener('change', () => { res(i.files[0] || null); i.remove(); });
    document.body.append(i);
    i.click();
  });
}

export function unduh(blob, name) {
  const a = h('a', { href: URL.createObjectURL(blob), download: name, class: 'sr-only' });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

export async function salin(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
}

export function muatSkrip(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return res();
    const s = h('script', { src, 'data-src': src });
    s.onload = res;
    s.onerror = () => rej(new Error('Gagal memuat ' + src));
    document.head.append(s);
  });
}

export function pilihLainnya(opsi, nilai, maks = 80, kosongLabel = 'Pilih') {
  const ada = !nilai || opsi.includes(nilai);
  const sel = select([['', kosongLabel], ...opsi, ['__lain', 'Lainnya']], ada ? (nilai || '') : '__lain');
  const inp = h('input', { maxlength: maks, value: ada ? '' : nilai, 'aria-label': 'Tulis lainnya', hidden: ada });
  sel.addEventListener('change', () => { inp.hidden = sel.value !== '__lain'; if (!inp.hidden) inp.focus(); });
  return { el: h('div', { class: 'stack-sm' }, sel, inp), get value() { return sel.value === '__lain' ? inp.value.trim() : sel.value; } };
}

export function muatLayar(teks = 'Memuat') {
  const label = h('p', null, teks);
  const el = h('div', { class: 'muat-layar', role: 'status', 'aria-live': 'polite' }, h('div', { class: 'muat-kotak' }, h('span', { class: 'spinner' }), label));
  document.body.append(el);
  return { teks: t => { label.textContent = t; }, tutup: () => el.remove() };
}

export function lamaTeks(m) {
  const j = Math.floor(m / 60), r = m % 60;
  if (!j) return r + ' menit';
  if (r === 30) return j + ',5 jam';
  return j + ' jam' + (r ? ' ' + r + ' menit' : '');
}

export const nomorWa = p => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '62' + d.slice(1); return d; };
