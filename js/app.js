import { $, $$, esc, icon, iso, tglPanjang, tglPendek, toast, sheet, chips, openPortal, debounce, nowHM } from './util.js';
import { getSettings, saveSettings, getDay, saveDay, dayState, activeOpenItems, pendingDecisions, profileReady, STATUS, OFF_TYPES } from './store.js';
import * as sync from './sync.js';

const ROUTES = {
  beranda: { title: 'Rutinin', tab: 'beranda', render: renderBeranda },
  foto: { title: 'Foto Absen', tab: 'foto', load: () => import('./camera.js') },
  agenda: { title: 'Agenda Kerja', tab: 'agenda', load: () => import('./agenda.js') },
  laporan: { title: 'Laporan Kerja', tab: 'laporan', load: () => import('./laporan.js') },
  portal: { title: 'Portal', tab: 'portal', render: renderPortal },
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
  const params = new URLSearchParams(qs || '');
  try { cleanup?.(); } catch {}
  cleanup = null;
  // tutup sheet/review yang masih terbuka saat pindah halaman
  $$('.sheet, .cam-review').forEach(x => x.remove());
  document.body.classList.remove('has-sheet');
  document.body.classList.remove('immersive');
  $('#pageTitle').textContent = r.title;
  $('#btnBack').hidden = !r.back;
  $('#topLogo').hidden = !!r.back;
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
    cleanup = (await fn(v, params, { go, topActions: $('#topActions') })) || null;
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="card"><div class="empty-state"><span>${icon('alert')}</span>Gagal membuka halaman.<br><small>${esc(e.message)}</small></div></div>`;
  }
}

// ---------- Tema (sama dengan keluarga -in) ----------
export function applyTheme() {
  const p = localStorage.getItem('rutinin.palette') || 'orange';
  const t = localStorage.getItem('rutinin.theme') || 'auto';
  const mode = t === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t;
  document.documentElement.setAttribute('data-palette', p);
  document.documentElement.setAttribute('data-mode', mode);
  requestAnimationFrame(() => {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    $('meta[name="theme-color"]').setAttribute('content', bg || '#FFF8F3');
  });
}

// ---------- Beranda ----------
const STATE_PT = {
  none: '<span class="pt mute">Belum dibuat</span>', draft: '<span class="pt sun">Draf</span>',
  ready: '<span class="pt info">Siap kirim</span>', sent: '<span class="pt ok">Terkirim</span>', off: '<span class="pt mute">Libur</span>',
};

async function renderBeranda(v, params, { topActions }) {
  topActions.innerHTML = `<a class="icon-btn" href="#/pengaturan" aria-label="Pengaturan">${icon('gear')}</a>`;
  const s = await getSettings();
  const today = iso();
  const day = await getDay(today);
  const st = dayState(day);
  const ois = await activeOpenItems(today);
  const decs = await pendingDecisions(today);
  const syncInfo = await sync.status();
  const first = (s.nama || '').split(' ')[0];
  const offLabel = day.type !== 'kerja' ? `<span class="pt sun">${esc(day.off)}</span>` : '';

  v.innerHTML = `
    ${!profileReady(s) ? `<div class="card warn"><div class="card-head">${icon('user')}<h2>Lengkapi profil dulu</h2></div>
      <p class="muted">Nama, jabatan, atasan & unit kerja dipakai di header Agenda dan Laporan.</p>
      <a class="btn btn-primary" href="#/pengaturan">Buka Pengaturan</a></div>` : ''}
    <section class="hero">
      <span class="bubble b1"></span><span class="bubble b2"></span>
      <div class="hero-label">${esc(tglPanjang(today))}</div>
      <div class="hero-big">Halo${first ? ', ' + esc(first) : ''} 👋</div>
      <div class="btns" style="margin-top:4px">
        <button class="btn btn-ghost btn-sm" data-act="absen">${icon('absen')}Absen</button>
        <button class="btn btn-ghost btn-sm" data-act="foto">${icon('camera')}Foto</button>
      </div>
    </section>

    <div class="quicks">
      <button class="quick" data-act="agenda"><span class="qi">${icon('agenda')}</span>Agenda</button>
      <button class="quick ok" data-act="laporan"><span class="qi">${icon('laporan')}</span>Laporan</button>
      <button class="quick sun" data-act="off"><span class="qi">${icon('umbrella')}</span>Libur / Cuti</button>
    </div>

    <section class="card">
      <div class="card-head"><h2>Hari ini</h2>${offLabel}</div>
      <div class="list">
        <button class="row" data-act="agenda"><span class="av">${icon('agenda')}</span>
          <span class="row-main"><span class="row-t">Agenda Kerja</span><span class="row-s">${day.agenda?.sentAt ? 'Dikirim ' + esc(day.agenda.sentAt) : 'Isi timeline, sisanya otomatis'}</span></span>${STATE_PT[st.agenda]}</button>
        <button class="row" data-act="laporan"><span class="av ok">${icon('laporan')}</span>
          <span class="row-main"><span class="row-t">Laporan Kerja</span><span class="row-s">${day.laporan?.sentAt ? 'Dikirim ' + esc(day.laporan.sentAt) : 'Tandai selesai / belum dari agenda'}</span></span>${STATE_PT[st.laporan]}</button>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2>Open Item berjalan</h2><span class="sub">${ois.length} item</span></div>
      ${ois.length ? `<div class="list">${ois.slice(0, 5).map(o => `
        <div class="row"><span class="av info" style="font-size:15px">${STATUS[o.status].e}</span>
          <span class="row-main"><span class="row-t">${esc(o.desc)}</span><span class="row-s">${esc(o.caseId)} · target ${esc(tglPendek(o.target))}</span></span></div>`).join('')}</div>`
        : `<div class="empty-state"><span>${icon('check')}</span>Tidak ada Open Item yang berjalan.</div>`}
    </section>

    ${decs.length ? `<section class="card"><div class="card-head"><h2>Menunggu keputusan</h2><span class="sub">${decs.length}</span></div>
      <div class="list">${decs.map(d => `<div class="row"><span class="av sun">${icon('flag')}</span><span class="row-main"><span class="row-t">${esc(d.what)}</span><span class="row-s">sejak ${esc(tglPendek(d.created))}</span></span></div>`).join('')}</div></section>` : ''}

    <section class="card">
      <div class="list">
        <a class="row" href="#/rekap"><span class="av">${icon('chart')}</span><span class="row-main"><span class="row-t">Rekap per tanggal</span><span class="row-s">Tarik data pekerjaan, unduh CSV</span></span><span class="row-end">${icon('chev')}</span></a>
        <button class="row" data-act="sync"><span class="av">${icon('sync')}</span><span class="row-main"><span class="row-t">Spreadsheet</span><span class="row-s">${esc(syncInfo.text)}</span></span><span class="row-end">${icon('chev')}</span></button>
      </div>
    </section>`;

  v.onclick = async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'absen') openPortal(s.links.absen);
    if (a === 'foto') go('foto');
    if (a === 'agenda') go('agenda');
    if (a === 'laporan') go('laporan');
    if (a === 'off') dayOffFlow(today);
    if (a === 'sync') {
      if (!s.scriptUrl) { go('pengaturan'); return; }
      toast('Menyinkronkan…');
      const r = await sync.flush(true);
      toast(r.ok ? 'Tersinkron ke Spreadsheet ✓' : 'Gagal sinkron: ' + r.error);
      route();
    }
  };
}

// ---------- Day Off / Cuti / Sakit ----------
export async function dayOffFlow(date) {
  const day = await getDay(date);
  let type = day.type !== 'kerja' ? day.off : 'Day Off';
  const sh = sheet({
    title: 'Libur / Cuti / Sakit',
    html: `<p class="q">Keterangan hari ini?</p>
      <div class="chips" id="offc"></div>
      <span class="label">Tanggal</span>
      <div class="field">${icon('calendar')}<input type="date" id="offd" value="${date}"></div>
      <span class="label">Catatan (opsional)</span>
      <div class="field ta"><textarea id="offn" rows="2" placeholder="mis. Surat dokter menyusul">${esc(day.note || '')}</textarea></div>
      <p class="hint">Agenda & Laporan hanya berisi header + keterangan. Open Item yang berjalan otomatis terbawa ke hari kerja berikutnya.</p>`,
    actions: [
      ...(day.type !== 'kerja' ? [{ label: 'Hapus libur', cls: 'btn-danger', onClick: async x => { const d = await getDay($('#offd', x.el).value); d.type = 'kerja'; d.off = ''; await saveDay(d); x.close(); toast('Kembali ke hari kerja'); route(); } }] : []),
      { label: 'Simpan', primary: true, onClick: async x => {
        const d = await getDay($('#offd', x.el).value);
        d.type = 'off'; d.off = type || 'Day Off'; d.note = $('#offn', x.el).value.trim();
        await saveDay(d); x.close(); route(); sendOff(d);
      } },
    ],
  });
  chips($('#offc', sh.el), { options: OFF_TYPES, selected: [type], allowAdd: false, onChange: v => type = v[0] || 'Day Off' });
}

export async function sendOff(day) {
  const s = await getSettings();
  const sh = sheet({
    title: `${day.off} · ${tglPendek(day.date)}`,
    html: `<p class="muted">Kirim keterangan ke kedua topik. Tekan satu per satu: PDF tersimpan, teks tersalin, lalu jendela Telegram terbuka.</p>
      <button class="btn btn-primary btn-big" data-k="agenda">${icon('agenda')}Agenda → Rencana Kerja</button>
      <button class="btn btn-soft btn-big" data-k="laporan">${icon('laporan')}Laporan → Laporan Kerja</button>`,
  });
  const { offBlocks, caption, pdfName } = await import('./docs.js');
  const { buildPdf } = await import('./pdf.js');
  const { sendNow } = await import('./send.js');
  const cache = {};
  const prep = async kind => cache[kind] ||= await buildPdf(offBlocks(kind, s, day), { title: kind === 'agenda' ? 'Agenda Kerja' : 'Laporan Kerja', filename: pdfName(kind, day.date) });
  // siapkan PDF lebih dulu agar klik langsung membuka jendela (tidak diblokir browser)
  prep('agenda').then(() => prep('laporan')).catch(e => toast('Gagal membuat PDF: ' + e.message));
  sh.el.addEventListener('click', async e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    const kind = b.dataset.k;
    if (!cache[kind]) { toast('PDF sedang disiapkan, coba lagi sebentar…'); return; }
    sendNow({ pdf: cache[kind], caption: caption(kind, s, day), link: kind === 'agenda' ? s.links.rencana : s.links.laporan });
    const d = await getDay(day.date);
    d[kind === 'agenda' ? 'offAgendaSent' : 'offLaporanSent'] = nowHM();
    await saveDay(d);
    b.classList.replace('btn-primary', 'btn-ok'); b.classList.replace('btn-soft', 'btn-ok');
    b.innerHTML = `${icon('check')}${kind === 'agenda' ? 'Agenda' : 'Laporan'} disiapkan`;
  });
}

// ---------- Portal ----------
async function renderPortal(v) {
  const s = await getSettings();
  const items = [
    ['absen', 'absen', 'Absen Kehadiran', 'attendr · login cukup sekali'],
    ['grooming', 'camera', 'Grup Grooming', 'Kirim foto absen'],
    ['rencana', 'agenda', 'Topik Rencana Kerja', 'Kirim Agenda Kerja'],
    ['laporan', 'laporan', 'Topik Laporan Kerja', 'Kirim Laporan Kerja'],
  ];
  v.innerHTML = `
    <section class="hero"><span class="bubble b1"></span><span class="bubble b2"></span>
      <div class="hero-big">Portal</div>
      <div class="hero-label">Absen & Telegram terbuka sebagai jendela di atas Rutinin. Tekan ✕ di pojok untuk kembali.</div></section>
    <section class="card"><div class="list">
      ${items.map(([k, ic, t, sub]) => `<button class="row" data-k="${k}"><span class="av">${icon(ic)}</span>
        <span class="row-main"><span class="row-t">${t}</span><span class="row-s">${s.links[k] ? esc(sub) : 'Link belum diatur'}</span></span><span class="row-end">${icon('open')}</span></button>`).join('')}
    </div></section>
    <section class="card soft"><p class="muted">Cara kirim PDF: tekan <b>Kirim</b> di Agenda/Laporan → PDF tersimpan & teks tersalin → di Telegram tekan 📎 → <b>File</b> → pilih PDF terbaru → tempel teks → kirim.</p>
      <a class="btn btn-soft" href="#/pengaturan">${icon('edit')}Atur link portal</a></section>`;
  v.onclick = e => { const b = e.target.closest('[data-k]'); if (b) openPortal(s.links[b.dataset.k]); };
}

// ---------- Setup lewat link ----------
async function renderSetup(v, params) {
  let data;
  try {
    const raw = params.get('d') || '';
    const json = decodeURIComponent(escape(atob(raw.replace(/-/g, '+').replace(/_/g, '/'))));
    data = JSON.parse(json);
  } catch { v.innerHTML = `<div class="card"><div class="empty-state"><span>${icon('alert')}</span>Link setup tidak valid.</div></div>`; return; }
  v.innerHTML = `<section class="hero"><span class="bubble b1"></span><span class="bubble b2"></span>
      <div class="hero-big">Siapkan Rutinin</div><div class="hero-label">Profil & link akan diisi otomatis.</div></section>
    <section class="card"><div class="list">
      ${['nama', 'jabatan', 'atasan', 'unit', 'casePrefix'].filter(k => data[k]).map(k => `<div class="row"><span class="row-main"><span class="row-s">${k === 'casePrefix' ? 'Kode Case ID' : k[0].toUpperCase() + k.slice(1)}</span><span class="row-t">${esc(data[k])}</span></span></div>`).join('')}
      ${data.routine ? `<div class="row"><span class="row-main"><span class="row-s">Blok rutin/tetap</span><span class="row-t">${data.routine.map(r => esc(r.title)).join(', ')}</span></span></div>` : ''}
    </div>
    <button class="btn btn-primary btn-big" id="apply">${icon('check')}Pakai pengaturan ini</button></section>`;
  $('#apply', v).onclick = async () => {
    const cur = await getSettings();
    await saveSettings({ ...data, links: { ...cur.links, ...(data.links || {}) } });
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
            sheet({ title: 'Versi baru tersedia', html: '<p class="muted">Muat ulang untuk memakai versi terbaru Rutinin.</p>',
              actions: [{ label: 'Nanti' , onClick: x => x.close() }, { label: 'Muat ulang', primary: true, onClick: () => { nw.postMessage('skip'); } }] });
          }
        });
      });
    }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
  }
}
boot();
