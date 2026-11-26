import { h, tglPanjang, tgl, jamTampil, tglFile, menit, WARNA } from './util.js';
import { S } from './api.js';
import { statusKpi, daftarOiLaporan, urutWaktu, ringkasHasil } from './hari.js';
import { judulOi } from './home.js';

const blk = (cls, ...isi) => h('div', { class: ('blk ' + cls).trim() }, ...isi);
const sec = t => h('div', { class: 'blk d-sec', 'data-keep': 'next' }, h('h3', null, t));
const sub = t => h('div', { class: 'blk d-sub', 'data-keep': 'next' }, t);
const dash = t => blk('', h('p', { class: 'dash' }, t));
export const dchip = s => h('span', { class: 'dchip c-' + (WARNA[s] || 'gray') }, s || '-');
const kv = rows => h('table', null, rows.filter(Boolean).map(([k, v]) => h('tr', null, h('td', null, k), h('td', null, ':'), h('td', null, v))));
const urut = a => [...a].sort((x, y) => menit(x.mulai) - menit(y.mulai));

let nt = 0;
function tabel(kolom, rows) {
  const key = 't' + (++nt);
  const cg = () => h('colgroup', null, kolom.map(([, w]) => h('col', { class: w })));
  return [
    h('div', { class: 'tbl', 'data-th': key, 'data-keep': 'next' }, h('table', { class: 't' }, cg(), h('thead', null, h('tr', null, kolom.map(([t]) => h('th', null, t)))))),
    ...rows.map(r => h('div', { class: 'tbl', 'data-thead': key }, h('table', { class: 't rowt' }, cg(), h('tbody', null, h('tr', null, r.map(c => h('td', null, c)))))))
  ];
}

function kepala(judul, p, tanggal) {
  return [
    blk('d-title', h('h1', null, judul), h('h2', null, 'SEDJATI GROUP')),
    blk('d-head', kv([['Nama', p.nama], ['Jabatan', p.jabatan], ['Atasan', p.atasan.join(', ')], ['Unit Kerja', p.unit], ['Periode', 'Harian'], ['Tanggal', tglPanjang(tanggal)]]))
  ];
}

const libur = d => blk('off', h('b', null, d.ket), d.catatan ? h('p', null, d.catatan) : null);
const gabung = (d, jenis) => [...d[jenis === 'Support' ? 'support' : 'decision'], ...d.lalu.filter(x => x.jenis === jenis)];

export const namaPdf = (judul, tanggal) => `${judul} MCED-${S.profil.kode} ${tglFile(tanggal)}.pdf`;

export function caption(jenis, p, d) {
  const pad = l => l.padEnd(16, ' ');
  let t = `${jenis === 'Agenda' ? 'AGENDA KERJA' : 'LAPORAN KERJA'}\nSEDJATI GROUP\n${pad('Nama')}: ${p.nama}\n${pad('Jabatan')}: ${p.jabatan}\n${pad('Atasan')}: ${p.atasan.join(', ')}\n${pad('Unit Kerja')}: ${p.unit}\n${pad('Periode')}: Harian\n${pad('Tanggal')}: ${tglPanjang(d.date)}`;
  if (d.ket !== 'Kerja') t += `\n\n${d.ket}`;
  return t;
}

export function blokAgenda(d, p, oiAktif) {
  const B = kepala('AGENDA KERJA', p, d.date);
  if (d.ket !== 'Kerja') return [...B, libur(d)];
  B.push(sec('A. PRIORITAS'));
  const prio = urut(d.items.filter(i => i.prio));
  if (!prio.length) B.push(dash('-'));
  prio.forEach((i, n) => B.push(blk('', h('p', null, `${n + 1}. `, dchip(i.label), ' ', h('b', null, i.judul), '. Target selesai: ', tgl(i.target)))));
  B.push(sec('B. AGENDA / PEKERJAAN UTAMA'), sub('Timeline'));
  urutWaktu(d).forEach(({ t, i }) => B.push(t === 'k'
    ? blk('tl-blk', h('div', { class: 'd-time' }, `${jamTampil(i.mulai)} - ${jamTampil(i.selesai)}`), h('p', { class: 'd-act' }, `[${i.jenis}] ${i.judul}`), h('p', { class: 'd-store' }, [i.store, i.caseId].filter(Boolean).join(' | ')))
    : blk('tl-blk tetap', h('div', { class: 'd-time' }, `${jamTampil(i.mulai)} - ${jamTampil(i.selesai)}`), h('p', null, i.nama))));
  B.push(sub('Pekerjaan Pendukung'));
  const pd = d.pendukung.filter(x => x.pilih);
  B.push(pd.length ? blk('', h('ul', null, pd.map(x => h('li', null, x.teks)))) : dash('-'));
  B.push(sec('C. OPEN ITEM'));
  if (!oiAktif.length) B.push(dash('Tidak ada Open Item.'));
  oiAktif.forEach(o => B.push(blk('oi', kv([['Case ID', h('b', null, o.caseId)], ['Deskripsi', judulOi(o)], ['Referensi', o.referensi || '-'], ['PIC', (o.pic || []).join(', ') || '-'], ['Target', tgl(o.target)], ['Status', dchip(o.status)]]))));
  B.push(sec('D. NEED SUPPORT'));
  const sup = gabung(d, 'Support');
  B.push(...(sup.length ? tabel([['Dukungan', 'w50'], ['Ditujukan ke', 'w25'], ['Batas waktu', 'w25']], sup.map(x => [x.isi, x.tujuan, tgl(x.batas)])) : [dash('Tidak ada dukungan yang dibutuhkan.')]));
  B.push(sec('E. NEED DECISION'));
  const dec = gabung(d, 'Decision');
  if (!dec.length) B.push(dash('Tidak ada keputusan yang dibutuhkan.'));
  dec.forEach(x => B.push(blk('oi', kv([['Keputusan', h('b', null, x.isi)], ['Alasan / Dampak', x.alasan || '-'], x.opsi?.length ? ['Opsi', x.opsi.join('; ')] : null, ['Batas waktu', tgl(x.batas)]]))));
  return B;
}

export function blokLaporan(d, p) {
  const B = kepala('LAPORAN KERJA', p, d.date);
  if (d.ket !== 'Kerja') return [...B, libur(d)];
  B.push(sec('A. EXECUTIVE SUMMARY'));
  const sm = d.summary.filter(s => s.trim());
  B.push(sm.length ? blk('', h('ul', null, sm.map(s => h('li', null, s)))) : dash('-'));
  B.push(sec('B. KPI / PROGRESS'));
  B.push(...tabel([['Pekerjaan', 'w34'], ['Hasil', 'w46'], ['Status', 'w20']], urut(d.items).map(i => [
    h('span', null, `[${i.jenis}] ${i.judul}`, i.tak ? h('small', { class: 'muted-d block' }, 'Tak terencana') : null, i.caseId ? h('small', { class: 'muted-d block' }, i.caseId) : null),
    i.status === 'Selesai' || i.status === 'Sebagian' ? ringkasHasil(i) : [i.alasan || '-', i.pindah ? 'dipindah ke ' + tgl(i.pindah) : ''].filter(Boolean).join(', '),
    dchip(i.status)])));
  const kpi = statusKpi(d);
  if (kpi.length) {
    B.push(sub('Status KPI'));
    kpi.forEach(k => B.push(blk('kpi-row', dchip(k.status), ' ', h('b', null, k.nama), h('span', { class: 'muted-d' }, ' (' + k.kegiatan.join(', ') + ')'))));
  }
  B.push(sec('C. PROBLEM LOG / OPEN ITEM'));
  const oi = (d.oiLap || daftarOiLaporan(d)).map(o => ({ ...o, u: d.oiUpd[o.caseId] || {} }));
  B.push(...(oi.length ? tabel([['Case ID', 'w13'], ['Deskripsi', 'w17'], ['Referensi', 'w10'], ['Progress Hari Ini', 'w16'], ['Kendala', 'w12'], ['PIC', 'w10'], ['Target', 'w10'], ['Status', 'w12']],
    oi.map(o => [h('b', null, o.caseId), judulOi(o), o.referensi || '-', o.u.progress || '-', o.u.kendala || '-', ((o.u.pic?.length ? o.u.pic : o.pic) || []).join(', ') || '-', tglFile(o.u.target || o.target || ''), dchip(o.u.status || o.status)]))
    : [dash('Tidak ada Open Item.')]));
  B.push(sec('D. NEED SUPPORT'));
  const sup = gabung(d, 'Support');
  B.push(...(sup.length ? tabel([['Dukungan', 'w38'], ['Ditujukan ke', 'w20'], ['Batas waktu', 'w20'], ['Status', 'w22']], sup.map(x => [x.isi, x.tujuan, tgl(x.batas), dchip(x.status || 'Menunggu')])) : [dash('Tidak ada dukungan yang dibutuhkan.')]));
  B.push(sec('E. NEED DECISION'));
  const dec = gabung(d, 'Decision');
  if (!dec.length) B.push(dash('Tidak ada keputusan yang dibutuhkan.'));
  dec.forEach(x => B.push(blk('oi', kv([['Keputusan', h('b', null, x.isi)], ['Alasan', x.alasan || '-'], ['Dampak bila belum diputuskan', x.dampak || '-'], x.opsi?.length ? ['Opsi', x.opsi.join('; ')] : null, ['Status', h('span', null, dchip(x.status || 'Menunggu'), x.jawaban ? ' ' + x.jawaban : '')]]))));
  B.push(sec('F. REFLEKSI'));
  ['Pencapaian terbaik hari ini', 'Kendala terbesar', 'Rencana besok'].forEach((q, i) => B.push(blk('qa', h('p', { class: 'qq' }, `${i + 1}. ${q}`), h('p', { class: 'aa' }, d.refleksi[i] || '-'))));
  return B;
}

export function blokFoto(fotos) {
  if (!fotos.length) return [];
  const B = [sec('LAMPIRAN DOKUMENTASI')];
  for (let i = 0; i < fotos.length; i += 2) B.push(blk('ph-row', fotos.slice(i, i + 2).map(f => h('figure', null, h('img', { src: f.src, alt: '' }), h('figcaption', null, f.caption)))));
  return B;
}

export function blokSop(r, p) {
  const B = [
    blk('d-title', h('h1', null, 'PENILAIAN ' + r.judul.toUpperCase()), h('h2', null, 'SEDJATI GROUP')),
    blk('d-head', kv([['Nama Toko', r.store], [r.labelPetugas, r.petugas], ['Hari/Tanggal', tglPanjang(r.tanggal)], ['Jam', jamTampil(r.jam)], r.area ? ['Area', r.area] : null, ['Penilai', p.nama]])),
    blk('score', h('div', null, h('span', null, 'POIN'), h('b', null, r.poinTeks)), h('div', null, h('span', null, 'KATEGORI'), dchip(r.kategori)))
  ];
  r.bagian.forEach(b => {
    B.push(sub(b.nama));
    B.push(...tabel([['Item', 'w58'], ['Nilai', 'w12'], ['Keterangan', 'w30']], b.item.map(it => [it.nama, it.nilaiTeks, it.ket || '-'])));
  });
  return B;
}
