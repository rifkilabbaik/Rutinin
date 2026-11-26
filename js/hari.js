import { h, icon, iso, parse, HARI, menit, dariMenit, uid, geser, tgl, tglPanjang, chip, jamDari, keBase64, tglFile } from './util.js';
import { S, api, jenisMaster } from './api.js';
import { db } from './db.js';
import { jamSetelan } from './profil.js';

export const KET = ['Kerja', 'Day Off', 'Cuti', 'Sakit', 'Izin'];
export const STATUS_KEG = ['Selesai', 'Sebagian', 'Tidak Terlaksana', 'Dipindah'];
export const OI_AKHIR = ['Selesai', 'Didelegasikan', 'Batal'];

export function jamDefault(tanggal) {
  const s = jamSetelan();
  if (s.mode === 'custom') return { mode: 'custom', mulai: s.mulai, selesai: dariMenit(menit(s.mulai) + 540) };
  const hari = HARI[parse(tanggal).getDay()];
  const j = S.master.jamKerja.find(x => x.hari.includes(hari)) || S.master.jamKerja[0] || { mulai: '08:00', selesai: '17:00' };
  return { mode: 'default', mulai: j.mulai, selesai: j.selesai };
}

export function saranUntuk(jam) {
  return S.master.saran.filter(s => menit(s.mulai) >= menit(jam.mulai) && menit(s.selesai) <= menit(jam.selesai)).map(s => ({ id: uid('s'), nama: s.nama, mulai: s.mulai, selesai: s.selesai }));
}

function kosongHari(tanggal) {
  const jam = jamDefault(tanggal);
  return {
    date: tanggal, ket: 'Kerja', catatan: '', jam, items: [], saran: saranUntuk(jam),
    pendukung: S.master.pendukung.map(t => ({ teks: t, pilih: false, cek: false })),
    support: [], decision: [], lalu: [], summary: [], refleksi: ['', '', ''], oiUpd: {}, oiLap: null,
    agenda: null, laporan: null, agendaDirty: false, laporanDirty: false
  };
}

function dariJadwal(j) {
  const m = jenisMaster(j.jenis);
  return {
    id: uid(), jenis: j.jenis, judul: (j.keterangan || m?.nama || j.jenis).slice(0, 60), store: j.store, mulai: j.jam,
    selesai: dariMenit(menit(j.jam) + 60), prio: false, label: '', target: '', sumber: 'Jadwal', oi: !!m?.oi, caseId: '',
    jadwal: j.id, tak: false, status: '', hasil: {}, alasan: '', pindah: '', fotos: []
  };
}

function tambahJadwal(d, jadwal) {
  let ada = false;
  (jadwal || []).forEach(j => {
    if (d.items.some(i => i.jadwal === j.id)) return;
    d.items.push(dariJadwal(j));
    ada = true;
  });
  return ada;
}

function dariServer(srv, tanggal, lokal) {
  const d = kosongHari(tanggal);
  const a = srv.agenda;
  if (a) {
    d.ket = a.ket || 'Kerja';
    d.catatan = a.catatan || '';
    d.jam = { mode: a.mode || 'default', mulai: a.mulai || d.jam.mulai, selesai: a.selesai || d.jam.selesai };
    d.saran = (a.saran || []).map(s => ({ id: uid('s'), ...s }));
    const p = (a.pendukung || []).map(x => ({ teks: x.teks, pilih: !!x.pilih, cek: !!x.cek }));
    S.master.pendukung.forEach(t => { if (!p.some(x => x.teks.toLowerCase() === t.toLowerCase())) p.push({ teks: t, pilih: false, cek: false }); });
    d.pendukung = p;
    d.agenda = { simpan: a.simpan, kirim: a.kirim, jumlah: a.jumlah };
  }
  d.items = srv.kegiatan.map(k => {
    const l = lokal?.items.find(x => x.id === k.id);
    const fotos = (k.foto || []).map(link => ({ link, id: l?.fotos?.find(f => f.link === link)?.id || '' }));
    (l?.fotos || []).forEach(f => { if (!f.link) fotos.push(f); });
    return { ...k, fotos, tawaran: !!l?.tawaran };
  });
  d.support = srv.permintaan.filter(p => p.jenis === 'Support' && p.tanggal === tanggal);
  d.decision = srv.permintaan.filter(p => p.jenis === 'Decision' && p.tanggal === tanggal);
  d.lalu = srv.permintaan.filter(p => p.tanggal < tanggal);
  const L = srv.laporan;
  if (L) {
    d.summary = L.summary || [];
    d.refleksi = [0, 1, 2].map(i => L.refleksi?.[i] || '');
    d.laporan = { simpan: L.simpan, kirim: L.kirim, jumlah: L.jumlah, review: L.review, catatan: L.catatan };
  }
  if (lokal) { d.oiUpd = lokal.oiUpd || {}; d.oiLap = lokal.oiLap || null; }
  if (!a || !srv.kegiatan.length) tambahJadwal(d, srv.jadwal);
  return d;
}

export async function simpanLokal(d) {
  await db.put('days', d).catch(() => {});
}

export async function ambilHari(tanggal) {
  const lokal = await db.get('days', tanggal).catch(() => null);
  let srv = null;
  try { srv = await api('hari', { tanggal }); S.oi = srv.openItem; } catch (e) { if (e.message === 'Sesi berakhir.') throw e; }
  let d;
  if (lokal && (lokal.agendaDirty || lokal.laporanDirty)) {
    d = lokal;
    if (srv) {
      d.lalu = srv.permintaan.filter(p => p.tanggal < tanggal);
      if (srv.agenda) d.agenda = { simpan: srv.agenda.simpan, kirim: srv.agenda.kirim, jumlah: srv.agenda.jumlah };
      if (srv.laporan) d.laporan = { ...d.laporan, simpan: srv.laporan.simpan, kirim: srv.laporan.kirim, jumlah: srv.laporan.jumlah };
    }
  } else if (srv) d = dariServer(srv, tanggal, lokal);
  else d = lokal || kosongHari(tanggal);
  await simpanLokal(d);
  return { d, offline: !srv };
}

export function kolomHasil(kode) {
  const m = jenisMaster(kode);
  if (!m || !m.hasil) return [];
  return m.hasil.split(';').map(s => s.trim()).filter(Boolean).map(s => {
    const [label, tipe = 'KETIK', opsi = ''] = s.split(':').map(x => x.trim());
    return { label, tipe: tipe.toUpperCase(), opsi: opsi ? opsi.split('|').map(x => x.trim()) : [], wajib: !/^(catatan|temuan)/i.test(label) };
  });
}

export const ringkasHasil = i => Object.entries(i.hasil || {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ').slice(0, 150) || `${i.judul} ${String(i.status).toLowerCase()}`;

export function payload(d) {
  return {
    date: d.date, ket: d.ket, catatan: d.catatan, jam: d.jam,
    items: d.ket === 'Kerja' ? d.items.map(i => ({
      id: i.id, jenis: i.jenis, judul: i.judul, store: i.store, mulai: i.mulai, selesai: i.selesai, prio: !!i.prio, label: i.label || '',
      target: i.target || '', sumber: i.sumber, oi: !!i.oi, caseId: i.caseId || '', jadwal: i.jadwal || '', tak: !!i.tak, status: i.status || '',
      hasil: i.hasil || {}, alasan: i.alasan || '', pindah: i.pindah || '', foto: (i.fotos || []).filter(f => f.link).map(f => f.link)
    })) : [],
    saran: d.saran.map(s => ({ nama: s.nama, mulai: s.mulai, selesai: s.selesai })),
    pendukung: d.pendukung.filter(p => p.pilih || S.master.pendukung.includes(p.teks)),
    support: d.support.map(p => ({ id: p.id, jenis: 'Support', isi: p.isi, tujuan: p.tujuan, batas: p.batas, terkait: p.terkait || '' })),
    decision: d.decision.map(p => ({ id: p.id, jenis: 'Decision', isi: p.isi, alasan: p.alasan, dampak: p.dampak || '', opsi: p.opsi || [], batas: p.batas, terkait: p.terkait || '' }))
  };
}

export const lewat = oi => oi.target && oi.target < iso() && !OI_AKHIR.includes(oi.status);

export function cekAgenda(d) {
  const galat = [], peringatan = [];
  if (d.ket === 'Kerja') {
    if (!d.items.length) galat.push('Minimal satu kegiatan.');
    if (d.items.filter(i => i.prio).length > 3) galat.push('Prioritas maksimal 3.');
    const urut = [...d.items].sort((a, b) => menit(a.mulai) - menit(b.mulai));
    urut.forEach((a, i) => urut.slice(i + 1).forEach(b => {
      if (menit(b.mulai) < menit(a.selesai) && menit(a.mulai) < menit(b.selesai)) peringatan.push(`${a.judul} bertabrakan dengan ${b.judul}.`);
    }));
    d.items.forEach(i => { if (menit(i.mulai) < menit(d.jam.mulai) || menit(i.selesai) > menit(d.jam.selesai)) peringatan.push(`${i.judul} di luar jam kerja.`); });
    (S.oi || []).filter(lewat).forEach(o => { if (!d.items.some(i => i.caseId === o.caseId)) peringatan.push(`Open Item ${o.caseId} lewat target.`); });
  }
  return { galat, peringatan };
}

export function daftarOiLaporan(d) {
  const peta = new Map();
  (d.oiLap || []).forEach(o => peta.set(o.caseId, o));
  (S.oi || []).forEach(o => peta.set(o.caseId, { ...peta.get(o.caseId), ...o }));
  return [...peta.values()].map(o => ({ ...o, upd: d.oiUpd[o.caseId] || null }));
}

export function cekLaporan(d) {
  const galat = [], peringatan = [];
  if (d.ket === 'Kerja') {
    if (!d.items.length) galat.push('Belum ada kegiatan.');
    d.items.forEach(i => {
      if (!i.status) return galat.push(`Status ${i.judul} belum diisi.`);
      if (i.status === 'Selesai' || i.status === 'Sebagian') {
        if (kolomHasil(i.jenis).some(k => k.wajib && !String(i.hasil?.[k.label] || '').trim())) galat.push(`Hasil ${i.judul} belum lengkap.`);
        if (jenisMaster(i.jenis)?.foto && !(i.fotos || []).length) galat.push(`Foto bukti ${i.judul} belum ada.`);
      } else if (!i.alasan) galat.push(`Alasan ${i.judul} belum diisi.`);
      if (i.status === 'Dipindah' && !i.pindah) galat.push(`Tanggal pindah ${i.judul} belum diisi.`);
    });
    daftarOiLaporan(d).forEach(o => {
      if (d.items.some(i => i.caseId === o.caseId && i.status) && !o.upd?.progress) galat.push(`Progress ${o.caseId} belum diisi.`);
    });
    d.decision.filter(x => !x.dampak).forEach(x => galat.push(`Dampak keputusan "${x.isi}" belum diisi.`));
  }
  if (!d.agenda?.jumlah) peringatan.push('Agenda hari ini belum dikirim.');
  return { galat, peringatan };
}

export function statusKpi(d) {
  const out = [];
  S.master.kpi.forEach(k => {
    const terkait = d.items.filter(i => (jenisMaster(i.jenis)?.kpi || []).includes(k.kode));
    if (!terkait.length) return;
    const selesai = terkait.filter(i => i.status === 'Selesai').length;
    const ada = terkait.filter(i => i.status === 'Selesai' || i.status === 'Sebagian').length;
    out.push({ nama: k.nama, status: selesai === terkait.length ? 'Tercapai' : ada ? 'Dalam Progress' : 'Belum Tercapai', kegiatan: terkait.map(i => i.judul) });
  });
  return out;
}

export function ringkasan(d) {
  const kata = { 'Selesai': 'selesai', 'Sebagian': 'sebagian selesai', 'Tidak Terlaksana': 'tidak terlaksana', 'Dipindah': 'dipindah' };
  const out = d.items.filter(i => i.status).map(i => {
    let s = `${i.judul} ${kata[i.status]}`;
    if (i.status === 'Dipindah' && i.pindah) s += ' ke ' + tgl(i.pindah);
    if (i.hasil?.['Saran utama']) s += ', saran utama: ' + i.hasil['Saran utama'];
    return s;
  });
  Object.entries(d.oiUpd).forEach(([cid, u]) => { if (u.status === 'Selesai') out.push(`Open Item ${cid} ditutup`); });
  if ([...d.decision, ...d.lalu.filter(p => p.jenis === 'Decision')].some(x => !x.status || x.status === 'Menunggu')) out.push('Ada keputusan yang menunggu persetujuan atasan');
  return out.slice(0, 5).map(s => s.slice(0, 200));
}

export function tawaranOi(i, tanggal) {
  const hs = i.hasil || {};
  if (i.status !== 'Selesai' && i.status !== 'Sebagian') return null;
  const target = geser(tanggal, 7);
  const potong = s => s.replace(/\s+/g, ' ').trim().slice(0, 120);
  if (i.jenis === 'FLD' && hs['Minat lanjutan'] && hs['Minat lanjutan'] !== 'Tidak')
    return { jenis: hs['Minat lanjutan'] === 'Catering' ? 'Lead Catering' : 'Lainnya', deskripsi: potong(`Lead FLD ${hs['Nama TK'] || i.judul}: follow up ${hs['Minat lanjutan']}`), referensi: 'Hasil FLD', store: hs['Store pelaksana'] || i.store, target };
  if (i.jenis === 'GCOM' && hs['Lead catering'] === 'Ya')
    return { jenis: 'Lead Catering', deskripsi: potong(`Lead catering ${hs['Nama komunitas'] || i.judul}`), referensi: 'Hasil GCOM', store: i.store, target };
  if (i.jenis === 'PROP')
    return { jenis: 'Follow Up Proposal', deskripsi: potong(`Follow up proposal ${hs['Jenis proposal'] || ''} ${hs['Nama tujuan'] || i.judul}`), referensi: 'KPI', store: i.store, target };
  if (i.jenis === 'SOP' && hs['Hasil'] === 'Ada temuan') {
    const st = hs['Store'] || i.store;
    return { jenis: 'Temuan SOP', deskripsi: potong(`Temuan SOP ${st}: ${hs['Temuan'] || '-'}`), referensi: 'Hasil SOP', store: st, pic: ['Store Leader ' + st].map(x => x.slice(0, 60)), status: 'Didelegasikan', target };
  }
  return null;
}

export async function unggahFoto(d) {
  for (const it of d.items) {
    for (const f of it.fotos || []) {
      if (f.link || !f.id) continue;
      const p = await db.get('photos', f.id);
      if (!p) continue;
      const r = await api('unggah', { jenis: 'foto', nama: `${it.judul} ${tglFile(d.date)}.jpg`, data: await keBase64(p.blob), tanggal: d.date, terkait: it.id });
      f.link = r.link;
      await simpanLokal(d);
    }
  }
}

export function barTanggal(tanggal, rute) {
  const inp = h('input', { type: 'date', class: 'date-input', value: tanggal, 'aria-label': 'Pilih tanggal' });
  inp.addEventListener('change', () => { if (inp.value) location.hash = rute + '/' + inp.value; });
  return h('div', { class: 'date-bar' },
    h('a', { class: 'icon-btn', href: `#${rute}/${geser(tanggal, -1)}`, 'aria-label': 'Hari sebelumnya' }, icon('back')),
    h('div', { class: 'date-mid' }, h('b', null, tglPanjang(tanggal)), inp),
    h('a', { class: 'icon-btn', href: `#${rute}/${geser(tanggal, 1)}`, 'aria-label': 'Hari berikutnya' }, icon('next')));
}

export function statusBar(d, jenis, offline) {
  const s = d[jenis];
  const kotor = d[jenis + 'Dirty'];
  return h('div', { class: 'chips' },
    kotor ? chip('Draf belum disimpan', 'yellow')
      : s?.jumlah ? chip(`Terkirim ${s.jumlah} kali, terakhir ${jamDari(s.kirim)}`, 'green')
        : s?.simpan ? chip('Tersimpan ' + jamDari(s.simpan), 'blue') : chip('Belum disimpan', 'gray'),
    offline ? chip('Offline', 'gray') : null);
}

export function kotakCek({ galat, peringatan }) {
  if (!galat.length && !peringatan.length) return null;
  return h('div', { class: 'warn-box' },
    galat.map(t => h('p', { class: 'warn err' }, icon('alert'), t)),
    peringatan.map(t => h('p', { class: 'warn' }, icon('alert'), t)));
}

export function urutWaktu(d) {
  return [...d.items.map(i => ({ t: 'k', i })), ...d.saran.map(s => ({ t: 's', i: s }))].sort((a, b) => menit(a.i.mulai) - menit(b.i.mulai));
}

export { iso };
