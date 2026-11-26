import { h, icon, tglPanjang, tgl, jamTampil, jamDari, chip, kosong, memuat, badgeTgl, baris, seksi } from './util.js';
import { S, api, namaJenis } from './api.js';
import { db } from './db.js';
import { lewat } from './hari.js';

let cache = null;

const MENU = [
  ['kamera', 'Kamera', 'cam', 'soft'], ['absen', 'Absen', 'absen', 'mint'], ['agenda', 'Agenda', 'agenda', 'sky'],
  ['laporan', 'Laporan', 'report', 'butter'], ['takbiran', 'Takbiran', 'sop', 'lilac']
];

function statusDok(srv, draf) {
  if (draf) return chip('Draf', 'yellow');
  if (!srv) return chip('Belum', 'gray');
  if (srv.jumlah) return chip('Terkirim ' + jamDari(srv.kirim), 'green');
  return chip('Tersimpan ' + jamDari(srv.simpan), 'blue');
}

export const judulOi = oi => `[${String(oi.jenis).toUpperCase()}] ${oi.deskripsi}`;

export function barisOi(oi, onclick) {
  return baris({
    badge: h('span', { class: 'badge tone-lilac' }, icon('list')),
    title: judulOi(oi), sub: `${oi.caseId} | Target ${tgl(oi.target)}`,
    right: lewat(oi) ? chip('Lewat target') : chip(oi.status), onclick, href: onclick ? null : '#openitem'
  });
}

export function barisJadwal(j, onclick) {
  return baris({
    badge: badgeTgl(j.tanggal, 'pink'), title: namaJenis(j.jenis),
    sub: [jamTampil(j.jam), j.store, j.nama].filter(Boolean).join(' | '),
    right: chip(j.status), onclick, href: onclick ? null : '#jadwal'
  });
}

export function barisKomplain(k) {
  return baris({
    badge: badgeTgl(k.tanggal, 'peach'), title: k.store,
    sub: [k.kategori, k.detail].filter(Boolean).join(': '),
    right: k.status ? chip(k.status, /close|selesai/i.test(k.status) ? 'green' : 'yellow') : null, cls: 'clamp'
  });
}

export function barisMinta(p) {
  return baris({
    badge: h('span', { class: 'badge tone-' + (p.jenis === 'Support' ? 'sky' : 'butter') }, icon(p.jenis === 'Support' ? 'send' : 'alert')),
    title: p.isi,
    sub: [p.tujuan ? 'Ke ' + p.tujuan : '', 'Batas ' + tgl(p.batas), p.jawaban ? 'Jawaban: ' + p.jawaban : ''].filter(Boolean).join(' | '),
    right: chip(p.status), href: '#agenda/' + p.tanggal
  });
}

function isi(d, draf) {
  const out = [];
  const hero = h('div', { class: 'hero' },
    h('div', { class: 'hero-label' }, 'Hari ini'),
    h('div', { class: 'hero-value' }, tglPanjang(d.hari).split(',')[0]),
    h('div', { class: 'hero-sub' }, tglPanjang(d.hari).split(', ')[1]),
    h('div', { class: 'hero-grid' },
      h('a', { class: 'mini', href: '#agenda' }, h('div', { class: 'mini-label' }, 'Agenda'), statusDok(d.agenda, draf?.agendaDirty)),
      h('a', { class: 'mini', href: '#laporan' }, h('div', { class: 'mini-label' }, 'Laporan'), statusDok(d.laporan, draf?.laporanDirty))));
  out.push(hero);
  out.push(seksi('Menu', h('div', { class: 'tool-grid' }, MENU.map(([r, l, ic, t]) => h('a', { class: 'tool', href: '#' + r }, h('span', { class: 'tool-ic tone-' + t }, icon(ic)), l)))));
  out.push(seksi('Jadwal minggu ini', d.jadwalMinggu.length ? d.jadwalMinggu.slice(0, 5).map(j => barisJadwal(j)) : kosong('Belum ada jadwal minggu ini.', 'Tambah Jadwal', '#jadwal/input'), ['Semua', '#jadwal']));
  out.push(seksi('Jadwal belum dikonfirmasi', d.jadwalBelum.length ? d.jadwalBelum.slice(0, 5).map(j => barisJadwal(j)) : kosong('Semua jadwal sudah dikonfirmasi.'), ['Semua', '#jadwal']));
  out.push(seksi('Komplain terbaru', d.komplain ? (d.komplain.length ? d.komplain.map(barisKomplain) : kosong('Belum ada komplain.')) : kosong(d.komplainGagal, 'Buka Komplain', '#komplain'), ['Semua', '#komplain']));
  const oi = [...d.openItem].sort((a, b) => (lewat(b) - lewat(a)) || String(a.target).localeCompare(String(b.target)));
  out.push(seksi('Open Item', oi.length ? oi.slice(0, 5).map(o => barisOi(o)) : kosong('Tidak ada Open Item aktif.', 'Tambah Open Item', '#openitem'), ['Semua', '#openitem']));
  const sup = d.permintaan.filter(p => p.jenis === 'Support');
  const dec = d.permintaan.filter(p => p.jenis === 'Decision');
  out.push(seksi('Need Support', sup.length ? sup.slice(0, 5).map(barisMinta) : kosong('Tidak ada permintaan dukungan.', 'Buka Agenda', '#agenda')));
  out.push(seksi('Need Decision', dec.length ? dec.slice(0, 5).map(barisMinta) : kosong('Tidak ada keputusan yang ditunggu.', 'Buka Agenda', '#agenda')));
  if (d.catatan.length) out.push(seksi('Catatan atasan', d.catatan.map(c => baris({ badge: badgeTgl(c.tanggal, 'mint'), title: c.catatan, sub: c.review || '', href: '#laporan/' + c.tanggal }))));
  return out;
}

export async function render(v) {
  const p = S.profil;
  v.append(h('div', { class: 'greet' }, h('h2', null, 'Halo, ' + p.nama.split(' ')[0]), h('div', { class: 'muted' }, [p.jabatan, p.region].filter(Boolean).join(' | '))));
  const wadah = h('div', { class: 'stack' }, cache ? isi(cache.d, cache.draf) : memuat());
  v.append(wadah);
  const muat = async () => {
    try {
      const d = await api('beranda');
      const draf = await db.get('days', d.hari).catch(() => null);
      wadah.replaceChildren(...isi(d, draf));
      cache = { d, draf };
    } catch (e) {
      if (!cache) wadah.replaceChildren(kosong(e.message, 'Coba Lagi', muat));
    }
  };
  muat();
}
