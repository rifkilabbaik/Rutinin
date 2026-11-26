import { $, kosong, memuat } from './util.js';
import { S, sesi, muatMaster, masterLokal, profilLengkap } from './api.js';

const HAL = {
  beranda: { judul: 'Beranda', utama: true, muat: () => import('./home.js') },
  jadwal: { judul: 'Jadwal', utama: true, muat: () => import('./jadwal.js') },
  komplain: { judul: 'Komplain', utama: true, muat: () => import('./komplain.js') },
  profil: { judul: 'Profil', utama: true, muat: () => import('./profil.js'), fn: 'profil' },
  pengaturan: { judul: 'Pengaturan', muat: () => import('./profil.js'), fn: 'pengaturan' },
  agenda: { judul: 'Agenda Kerja', muat: () => import('./agenda.js') },
  laporan: { judul: 'Laporan Kerja', muat: () => import('./laporan.js'), fn: 'laporan' },
  'cek-laporan': { judul: 'Cek Laporan', muat: () => import('./laporan.js'), fn: 'cek' },
  openitem: { judul: 'Open Item', muat: () => import('./openitem.js') },
  takbiran: { judul: 'Takbiran', muat: () => import('./sop.js') },
  kamera: { judul: 'Kamera', penuh: true, muat: () => import('./camera.js') },
  absen: { judul: 'Absen', penuh: true, muat: () => import('./absen.js') },
  masuk: { judul: 'Masuk', publik: true, muat: () => import('./auth.js'), fn: 'masuk' },
  daftar: { judul: 'Daftar', publik: true, muat: () => import('./auth.js'), fn: 'daftar' },
  lengkapi: { judul: 'Lengkapi Data', muat: () => import('./auth.js'), fn: 'lengkapi' }
};

let bersih = null, nomor = 0, segar = false, induk = 'beranda';
const tumpukan = [];

async function tampil() {
  const [awal, arg] = decodeURIComponent(location.hash.slice(1)).split('/');
  let nama = HAL[awal] ? awal : 'beranda';
  if (!sesi.token && !HAL[nama].publik) nama = 'masuk';
  if (sesi.token && HAL[nama].publik) nama = 'beranda';
  const n = ++nomor;
  const kini = location.hash || '#beranda';
  if (tumpukan.length > 1 && tumpukan[tumpukan.length - 2] === kini) tumpukan.pop();
  else if (tumpukan[tumpukan.length - 1] !== kini) tumpukan.push(kini);
  induk = nama === 'cek-laporan' && arg ? 'laporan/' + arg : 'beranda';
  if (bersih) { try { bersih(); } catch {} bersih = null; }
  const p = HAL[nama];
  const view = $('#view');
  view.replaceChildren(memuat());
  document.body.classList.toggle('auth', !!p.publik || nama === 'lengkapi');
  document.body.classList.toggle('immersive', !!p.penuh);
  $('#brandTitle').hidden = !p.utama;
  $('#topLogo').hidden = !p.utama;
  $('#pageTitle').hidden = !!p.utama;
  $('#pageTitle').textContent = p.judul;
  $('#btnBack').hidden = !!p.utama || nama === 'lengkapi';
  $('#btnSetting').hidden = nama === 'pengaturan' || nama === 'lengkapi';
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === nama));
  document.title = p.utama ? 'Rutinin' : p.judul + ' | Rutinin';
  window.scrollTo(0, 0);

  if (sesi.token && !p.publik) {
    if (!S.master && !masterLokal()) {
      try { await muatMaster(); }
      catch (e) { if (n === nomor) view.replaceChildren(kosong(e.message, 'Coba Lagi', tampil)); return; }
    } else if (!segar) {
      segar = true;
      muatMaster().catch(() => {});
    }
    if (n !== nomor) return;
    if (!profilLengkap() && nama !== 'lengkapi') { location.replace('#lengkapi'); return; }
  }
  let mod;
  try { mod = await p.muat(); }
  catch { if (n === nomor) view.replaceChildren(kosong('Halaman gagal dimuat.', 'Coba Lagi', tampil)); return; }
  if (n !== nomor) return;
  view.replaceChildren();
  try { bersih = (await mod[p.fn || 'render'](view, arg)) || null; }
  catch (e) { if (n === nomor) view.replaceChildren(kosong(e.message || 'Terjadi kesalahan.', 'Coba Lagi', tampil)); }
}

$('#btnBack').addEventListener('click', () => {
  if (tumpukan.length > 1) history.back();
  else location.hash = induk;
});

window.addEventListener('hashchange', tampil);
tampil();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('service-worker.js').catch(() => {}); });
}
