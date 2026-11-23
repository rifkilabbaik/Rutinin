import { $, $$, esc, icon, iso, tglPanjang, tglPendek, toast, sheet, chips, debounce, nowHM } from './util.js';
import { getSettings, saveSettings, getDay, saveDay, dayState, activeOpenItems, profileReady, STATUS, OFF_TYPES } from './store.js';
import * as sync from './sync.js';

const ROUTES = {
  beranda: { title: 'Rutinin', tab: 'beranda', render: renderBeranda },
  foto: { title: 'Foto Absen', tab: 'foto', load: () => import('./camera.js') },
  agenda: { title: 'Agenda', tab: 'agenda', load: () => import('./agenda.js') },
  laporan: { title: 'Laporan', tab: 'laporan', load: () => import('./laporan.js') },
  rekap: { title: 'Rekap', tab: 'beranda', back: true, load: () => import('./rekap.js') },
  pengaturan: { title: 'Pengaturan', tab: 'beranda', back: true, load: () => import('./settings.js') },
  setup: { title: 'Siapkan Rutinin', tab: 'beranda', render: renderSetup },
};

let cleanup = null;
export function go(name, params = {}) {
  const q = new URLSearchParams(params).toString();
  location.hash = `#/${name}${q ? '?' + q : ''}`;
}

async function route() {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  const name = ROUTES[path] ? path : 'beranda';
  const r = ROUTES[name];
  try { cleanup?.(); } catch {}
  cleanup = null;
  $$('.sheet, .cam-review, .absen').forEach(x => x.remove());
  document.body.classList.remove('has-sheet', 'immersive');
  $('#pageTitle').textContent = r.title;
  $('#btnBack').hidden = !r.back;
  $('#topLogo').hidden = !!r.back || name !== 'beranda';
  $('#topActions').innerHTML = '';
  $$('#tabbar button, #sidenav button').forEach(b => b.classList.toggle('on', b.dataset.go === (r.back ? name : r.tab)));
  const view = $('#view');
  view.innerHTML = '<div class="loading"><div class="dots"><i></i><i></i><i></i></div></div>';
  window.scrollTo(0, 0);
  try {
    const fn = r.render || (await r.load()).render;
    const v = document.createElement('div');
    v.className = 'view';
    view.replaceChildren(v);
    cleanup = (await fn(v, new URLSearchParams(qs || ''), { go, topActions: $('#topActions') })) || null;
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="card"><div class="empty-state"><span>${icon('alert')}</span>Gagal membuka halaman.<br><small>${esc(e?.message || e)}</small></div></div>`;
  }
}

// ---------- Tema (sama dengan keluarga -in) ----------
export function applyTheme() {
  const p = localStorage.getItem('rutinin.palette') || 'orange';
  const t = localStorage.getItem('rutinin.theme') || 'auto';
  const mode = t === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t;
  document.documentElement.setAttribute('data-palette', p);
  document.documentElement.setAttribute('data-mode', mode);
  requestAnimationFrame(() => $('meta[name="theme-color"]').setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#FFF8F3'));
}

// ---------- Absen di dalam aplikasi ----------
export async function openAbsen() {
  const s = await getSettings();
  if (!s.links.absen) { toast('Isi link absen di Pengaturan'); go('pengaturan'); return; }
  const w = document.createElement('div');
  w.className = 'absen';
  w.innerHTML = `<div class="absen-bar"><button class="icon-btn flat sm" data-x aria-label="Tutup">${icon('x')}</button><b>Absen</b><span class="spacer"></span>
      <button class="icon-btn flat sm" data-r aria-label="Muat ulang">${icon('sync')}</button></div>
    <iframe src="${esc(s.links.absen)}" allow="camera; microphone; geolocation" referrerpolicy="no-referrer-when-downgrade"></iframe>
    <button class="absen-alt" data-w>Halaman tidak tampil? Buka di jendela</button>`;
  document.body.appendChild(w);
  w.onclick = e => {
    if (e.target.closest('[data-x]')) w.remove();
    if (e.target.closest('[data-r]')) $('iframe', w).src = s.links.absen;
    if (e.target.closest('[data-w]')) window.open(s.links.absen, '_blank', 'noopener');
  };
}

// ---------- Beranda ----------
const STATE_PT = {
  none: '<span class="pt mute">Belum</span>', draft: '<span class="pt sun">Draf</span>',
  ready: '<span class="pt info">Siap kirim</span>', sent: '<span class="pt ok">Terkirim</span>', off: '<span class="pt mute">Libur</span>',
};
async function renderBeranda(v, params, { topActions }) {
  topActions.innerHTML = `<a class="icon-btn" href="#/pengaturan" aria-label="Pengaturan">${icon('gear')}</a>`;
  const s = await getSettings();
  const today = iso();
  const day = await getDay(today);
  const st = dayState(day);
  const ois = await activeOpenItems(today);
  const first = (s.nama || '').split(' ')[0];
  v.innerHTML = `
    ${!profileReady(s) ? `<a class="card warn" href="#/pengaturan"><div class="card-head">${icon('user')}<h2>Lengkapi profil</h2></div></a>` : ''}
    <section class="hero"><span class="bubble b1"></span><span class="bubble b2"></span>
      <div class="hero-label">${esc(tglPanjang(today))}</div>
      <div class="hero-big">Halo${first ? ', ' + esc(first) : ''} 👋</div>
      <div class="btns"><button class="btn btn-ghost" data-act="absen">${icon('absen')}Absen</button><button class="btn btn-ghost" data-act="off">${icon('umbrella')}${day.type !== 'kerja' ? esc(day.off) : 'Libur / Cuti'}</button></div>
    </section>
    <section class="card"><div class="card-head"><h2>Hari ini</h2></div><div class="list">
      <a class="row" href="#/agenda"><span class="av">${icon('agenda')}</span><span class="row-main"><span class="row-t">Agenda Kerja</span>${day.agenda?.sentAt ? `<span class="row-s">Dikirim ${esc(day.agenda.sentAt)}</span>` : ''}</span>${STATE_PT[st.agenda]}</a>
      <a class="row" href="#/laporan"><span class="av ok">${icon('laporan')}</span><span class="row-main"><span class="row-t">Laporan Kerja</span>${day.laporan?.sentAt ? `<span class="row-s">Dikirim ${esc(day.laporan.sentAt)}</span>` : ''}</span>${STATE_PT[st.laporan]}</a>
    </div></section>
    ${ois.length ? `<section class="card"><div class="card-head"><h2>Open Item</h2><span class="sub">${ois.length}</span></div><div class="list">
      ${ois.slice(0, 5).map(o => `<div class="row"><span class="av info" style="font-size:15px">${STATUS[o.status].e}</span><span class="row-main"><span class="row-t">${esc(o.desc)}</span><span class="row-s">${esc(o.caseId)} · ${esc(tglPendek(o.target))}</span></span></div>`).join('')}</div></section>` : ''}
    <a class="link" href="#/rekap">${icon('chart')}Rekap per tanggal</a>`;
  v.onclick = e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'absen') openAbsen();
    if (b.dataset.act === 'off') dayOffFlow(today);
  };
}

// ---------- Day Off / Cuti / Sakit ----------
export async function dayOffFlow(date) {
  const s = await getSettings();
  const day = await getDay(date);
  let type = day.type !== 'kerja' ? day.off : 'Day Off';
  const sh = sheet({
    title: 'Libur / Cuti / Sakit',
    html: `<div class="chips" id="offc"></div>
      <div class="field">${icon('calendar')}<input type="date" id="offd" value="${date}"></div>
      <div class="field"><input id="offn" placeholder="Catatan (opsional)" value="${esc(day.note || '')}"></div>`,
    actions: [
      ...(day.type !== 'kerja' ? [{ label: 'Batal libur', cls: 'btn-danger', onClick: async x => { day.type = 'kerja'; day.off = ''; await saveDay(day); x.close(); route(); } }] : []),
      { label: 'Kirim', primary: true, onClick: async x => {
        const d = await getDay($('#offd', x.el).value);
        d.type = 'off'; d.off = type; d.note = $('#offn', x.el).value.trim();
        await saveDay(d); x.close();
        const { offBlocks } = await import('./docs.js');
        const { sendDoc } = await import('./send.js');
        await sendDoc({ kind: 'agenda', blocks: offBlocks('agenda', s, d), s, day: d, onSent: async () => {
          d.offAgendaSent = nowHM(); await saveDay(d);
          await sendDoc({ kind: 'laporan', blocks: offBlocks('laporan', s, d), s, day: d, onSent: async () => { d.offLaporanSent = nowHM(); await saveDay(d); toast('Terkirim ✓'); route(); } });
        } });
      } },
    ],
  });
  chips($('#offc', sh.el), { options: OFF_TYPES, selected: [type], allowAdd: false, onChange: x => type = x[0] || 'Day Off' });
}

// ---------- Setup lewat link ----------
async function renderSetup(v, params) {
  let data;
  try { data = JSON.parse(decodeURIComponent(escape(atob((params.get('d') || '').replace(/-/g, '+').replace(/_/g, '/'))))); }
  catch { v.innerHTML = `<div class="card"><div class="empty-state"><span>${icon('alert')}</span>Link setup tidak valid.</div></div>`; return; }
  v.innerHTML = `<section class="card"><div class="list">
      ${['nama', 'jabatan', 'atasan', 'unit', 'casePrefix'].filter(k => data[k]).map(k => `<div class="row"><span class="row-main"><span class="row-s">${k === 'casePrefix' ? 'Kode Case ID' : k[0].toUpperCase() + k.slice(1)}</span><span class="row-t">${esc(data[k])}</span></span></div>`).join('')}
    </div><button class="btn btn-primary btn-big" id="apply">${icon('check')}Pakai pengaturan ini</button></section>`;
  $('#apply', v).onclick = async () => {
    const cur = await getSettings();
    await saveSettings({ ...data, links: { ...cur.links, absen: data.links?.absen || cur.links.absen } });
    toast('Pengaturan tersimpan ✓');
    history.replaceState(null, '', location.pathname + '#/beranda');
    route();
  };
}

// ---------- Mulai ----------
function boot() {
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
  $$('#tabbar button, #sidenav button').forEach(b => b.onclick = () => go(b.dataset.go));
  $('#btnBack').onclick = () => (history.length > 1 ? history.back() : go('beranda'));
  window.addEventListener('hashchange', route);
  route();
  import('./ai.js').then(ai => ai.checkCrashGuard()).catch(() => {});
  navigator.storage?.persist?.();
  const later = debounce(() => sync.flush(), 4000);
  window.addEventListener('rutinin:dirty', later);
  window.addEventListener('online', () => sync.flush());
  setTimeout(() => sync.flush(), 3000);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            sheet({ title: 'Versi baru tersedia', actions: [{ label: 'Nanti', onClick: x => x.close() }, { label: 'Muat ulang', primary: true, onClick: () => nw.postMessage('skip') }] });
          }
        });
      });
    }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
  }
}
boot();
