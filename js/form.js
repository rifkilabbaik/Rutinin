import { h, icon, field, select, seg, sheet, toggle, toast, chip, uid, menit, dariMenit, iso, geser, pilihLainnya, kompres, pilihGaleri, lamaTeks } from './util.js';
import { S, jenisMaster } from './api.js';
import { db } from './db.js';

const SUMBER = ['Jobdesk', 'KPI', 'Instruksi Atasan', 'Program Kerja', 'Open Item', 'Jadwal'];
const KUNCI_JUDUL = 'rutinin.judul';

function riwayatJudul(kode) {
  try { return (JSON.parse(localStorage.getItem(KUNCI_JUDUL) || '{}')[kode]) || []; } catch { return []; }
}

function catatJudul(kode, judul) {
  try {
    const r = JSON.parse(localStorage.getItem(KUNCI_JUDUL) || '{}');
    r[kode] = [judul, ...(r[kode] || []).filter(x => x !== judul)].slice(0, 10);
    localStorage.setItem(KUNCI_JUDUL, JSON.stringify(r));
  } catch {}
}

export const tampilErr = (el, pesan) => { el.textContent = pesan; el.hidden = !pesan; };

function slotBerikut(d) {
  const akhir = Math.max(menit(d.jam.mulai), ...d.items.map(i => menit(i.selesai)));
  return [dariMenit(akhir), dariMenit(Math.min(akhir + 60, 23 * 60 + 59))];
}

const DURASI = [[30, '30 menit'], [60, '1 jam'], [120, '2 jam'], [180, '3 jam']];

function pilihDurasi(awal, onUbah, kosongAwal) {
  const pecah = m => { const out = new Set(); let sisa = m; [180, 120, 60, 30].forEach(v => { if (sisa >= v) { out.add(v); sisa -= v; } }); return sisa ? new Set() : out; };
  let dipilih = kosongAwal ? new Set() : pecah(awal);
  const total = h('span', { class: 'durasi-total' });
  const tombol = DURASI.map(([v, l]) => {
    const b = h('button', { type: 'button', class: 'chip-btn' }, l);
    b.addEventListener('click', () => { dipilih.has(v) ? dipilih.delete(v) : dipilih.add(v); tulis(); onUbah([...dipilih].reduce((a, x) => a + x, 0)); });
    return [v, b];
  });
  let lama = awal;
  const tulis = () => {
    tombol.forEach(([v, b]) => { b.classList.toggle('on', dipilih.has(v)); b.setAttribute('aria-pressed', String(dipilih.has(v))); });
    const jml = [...dipilih].reduce((a, x) => a + x, 0) || lama;
    total.textContent = jml > 0 ? 'Total ' + lamaTeks(jml) : '';
  };
  tulis();
  return { el: h('div', { class: 'stack-sm' }, h('div', { class: 'chips' }, tombol.map(([, b]) => b)), total), set(m) { lama = m; dipilih = pecah(m); tulis(); } };
}

export function formKegiatan(d, item, { onSimpan, onHapus, tak = false, mulai: mulaiAwal } = {}) {
  const baru = !item;
  const [m0, s0] = mulaiAwal ? [mulaiAwal, dariMenit(Math.min(menit(mulaiAwal) + 60, 1439))] : slotBerikut(d);
  const x = item ? { ...item } : { id: uid(), jenis: '', judul: '', store: '', mulai: m0, selesai: s0, prio: false, label: 'Target Selesai', target: d.date, sumber: 'Jobdesk', oi: false, caseId: '', jadwal: '', tak, status: '', hasil: {}, alasan: '', pindah: '', fotos: [] };
  let judulManual = !baru;
  const daftar = h('datalist', { id: 'dl-judul' });
  const jenis = select([['', 'Pilih jenis'], ...S.master.kegiatan.map(k => [k.kode, k.nama])], x.jenis);
  const isiDaftar = () => daftar.replaceChildren(...riwayatJudul(jenis.value).map(t => h('option', { value: t })));
  const store = pilihLainnya(S.master.toko.map(t => t.nama), x.store, 80, 'Pilih store');
  const judul = h('input', { maxlength: 60, value: x.judul, list: 'dl-judul' });
  judul.addEventListener('input', () => { judulManual = true; });
  const isiJudul = () => { if (!judulManual) judul.value = [jenis.value, store.value].filter(Boolean).join(' ').slice(0, 60); };
  store.el.addEventListener('change', isiJudul);
  store.el.addEventListener('input', isiJudul);
  const mulai = h('input', { type: 'time', value: x.mulai });
  const selesai = h('input', { type: 'time', value: x.selesai });
  const lama = () => menit(selesai.value) - menit(mulai.value);
  const durasi = pilihDurasi(lama(), m => { if (m > 0) selesai.value = dariMenit(Math.min(menit(mulai.value) + m, 1439)); }, baru);
  mulai.addEventListener('change', () => { const l = Math.max(lama(), 30); selesai.value = dariMenit(Math.min(menit(mulai.value) + l, 1439)); durasi.set(lama()); });
  selesai.addEventListener('change', () => durasi.set(lama()));
  const sumber = select(SUMBER.includes(x.sumber) ? SUMBER : [...SUMBER, x.sumber], x.sumber);
  const target = h('input', { type: 'date', value: x.target || d.date });
  let label = x.label || 'Target Selesai';
  const wadahPrio = h('div', { class: 'stack-sm', hidden: !x.prio }, seg(['Target Selesai', 'Mulai Dikerjakan'], label, v => { label = v; }), field('Target selesai', target));
  const oiAktif = (S.oi || []).filter(o => !['Selesai', 'Didelegasikan', 'Batal'].includes(o.status));
  const caseSel = select([['', 'Tidak ada'], ...oiAktif.map(o => [o.caseId, `${o.caseId} ${o.deskripsi}`.slice(0, 60)]), ...(x.caseId && !oiAktif.some(o => o.caseId === x.caseId) ? [[x.caseId, x.caseId]] : [])], x.caseId);
  let oi = x.oi;
  const togOi = toggle('Jadikan Open Item', oi, v => { oi = v; });
  const wadahOi = h('div', { hidden: !!x.caseId }, togOi);
  caseSel.addEventListener('change', () => { wadahOi.hidden = !!caseSel.value; });
  jenis.addEventListener('change', () => {
    isiDaftar();
    isiJudul();
    if (baru && !caseSel.value) { oi = !!jenisMaster(jenis.value)?.oi; togOi.querySelector('input').checked = oi; }
  });
  isiDaftar();
  const detail = h('div', { class: 'stack', hidden: true },
    h('div', { class: 'grid-2' }, field('Jam mulai', mulai), field('Jam selesai', selesai)),
    field('Sumber', sumber),
    toggle('Prioritas', x.prio, v => { x.prio = v; wadahPrio.hidden = !v; }), wadahPrio,
    field('Case ID terkait', caseSel), wadahOi);
  const tDetail = h('button', { type: 'button', class: 'detail-btn', 'aria-expanded': 'false' }, h('span', null, 'Detail: jam, sumber, prioritas, Open Item'), icon('down'));
  tDetail.addEventListener('click', () => { detail.hidden = !detail.hidden; tDetail.setAttribute('aria-expanded', String(!detail.hidden)); tDetail.classList.toggle('buka', !detail.hidden); });
  const err = h('p', { class: 'form-err', role: 'alert', hidden: true });
  const body = h('div', { class: 'stack' },
    field('Jenis kegiatan', jenis),
    h('div', { class: 'field' }, h('span', null, 'Store'), store.el),
    h('div', { class: 'field' }, h('span', null, 'Durasi'), durasi.el),
    field('Judul', judul), daftar, tDetail, detail, err);
  const aksi = [];
  if (!baru && onHapus) aksi.push({ label: 'Hapus', danger: true, onClick: c => { onHapus(); c.close(); } });
  aksi.push({
    label: 'Simpan', primary: true, onClick: c => {
      const v = { jenis: jenis.value, judul: judul.value.trim(), store: store.value, mulai: mulai.value, selesai: selesai.value };
      if (!v.jenis) return tampilErr(err, 'Jenis kegiatan wajib dipilih.');
      if (!v.store) return tampilErr(err, 'Store wajib diisi.');
      if (!v.judul) return tampilErr(err, 'Judul wajib diisi.');
      if (!v.mulai || !v.selesai) return tampilErr(err, 'Jam wajib diisi.');
      if (menit(v.selesai) <= menit(v.mulai) && v.jenis !== 'PERJADIN') return tampilErr(err, 'Jam selesai harus setelah jam mulai.');
      if (x.prio) {
        if (!target.value) return tampilErr(err, 'Target selesai wajib diisi.');
        if (label === 'Mulai Dikerjakan' && target.value <= d.date) return tampilErr(err, 'Target harus setelah tanggal agenda.');
        if (d.items.filter(i => i.prio && i.id !== x.id).length >= 3) return tampilErr(err, 'Prioritas maksimal 3.');
      }
      Object.assign(x, v, { sumber: sumber.value, label: x.prio ? label : '', target: x.prio ? target.value : '', caseId: caseSel.value, oi: caseSel.value ? false : oi });
      catatJudul(v.jenis, v.judul);
      onSimpan(x);
      c.close();
    }
  });
  return sheet({ title: tak ? 'Kegiatan Tak Terencana' : baru ? 'Isi ' + mulai.value.replace(':', '.') : 'Ubah Kegiatan', body, actions: aksi });
}

export function formSupport(x, { onSimpan, onHapus, d }) {
  const baru = !x;
  x = x ? { ...x } : { id: uid('p'), jenis: 'Support', isi: '', tujuan: '', batas: geser(d.date, 1), terkait: '', status: 'Menunggu' };
  const isi = h('textarea', { maxlength: 150, rows: 3, value: x.isi });
  const tujuan = select([['', 'Pilih tujuan'], ...S.master.tujuan], x.tujuan);
  const batas = h('input', { type: 'date', value: x.batas });
  const terkait = select([['', 'Tidak ada'], ...d.items.map(i => [i.caseId || i.judul, i.caseId ? `${i.caseId} ${i.judul}` : i.judul])], x.terkait);
  const err = h('p', { class: 'form-err', role: 'alert', hidden: true });
  const aksi = [];
  if (!baru) aksi.push({ label: 'Hapus', danger: true, onClick: c => { onHapus(); c.close(); } });
  aksi.push({
    label: 'Simpan', primary: true, onClick: c => {
      if (!isi.value.trim()) return tampilErr(err, 'Dukungan wajib diisi.');
      if (!tujuan.value) return tampilErr(err, 'Tujuan wajib dipilih.');
      if (!batas.value) return tampilErr(err, 'Batas waktu wajib diisi.');
      onSimpan({ ...x, isi: isi.value.trim(), tujuan: tujuan.value, batas: batas.value, terkait: terkait.value.slice(0, 80) });
      c.close();
    }
  });
  return sheet({ title: 'Need Support', body: h('div', { class: 'stack' }, field('Dukungan yang dibutuhkan', isi), field('Ditujukan ke', tujuan), field('Batas waktu', batas), field('Kegiatan / Case ID terkait', terkait), err), actions: aksi });
}

export function formDecision(x, { onSimpan, onHapus, d, laporan = false }) {
  const baru = !x;
  x = x ? { ...x } : { id: uid('p'), jenis: 'Decision', isi: '', alasan: '', dampak: '', opsi: [], batas: geser(d.date, 1), terkait: '', status: 'Menunggu' };
  const isi = h('textarea', { maxlength: 150, rows: 3, value: x.isi });
  const alasan = h('textarea', { maxlength: 200, rows: 3, value: x.alasan });
  const dampak = h('textarea', { maxlength: 200, rows: 3, value: x.dampak || '' });
  const opsi = [0, 1, 2].map(i => h('input', { maxlength: 100, value: x.opsi?.[i] || '', 'aria-label': 'Opsi ' + (i + 1) }));
  const batas = h('input', { type: 'date', value: x.batas });
  const err = h('p', { class: 'form-err', role: 'alert', hidden: true });
  const aksi = [];
  if (!baru) aksi.push({ label: 'Hapus', danger: true, onClick: c => { onHapus(); c.close(); } });
  aksi.push({
    label: 'Simpan', primary: true, onClick: c => {
      if (!isi.value.trim()) return tampilErr(err, 'Keputusan wajib diisi.');
      if (!alasan.value.trim()) return tampilErr(err, 'Alasan wajib diisi.');
      if (laporan && !dampak.value.trim()) return tampilErr(err, 'Dampak wajib diisi.');
      if (!batas.value) return tampilErr(err, 'Batas waktu wajib diisi.');
      onSimpan({ ...x, isi: isi.value.trim(), alasan: alasan.value.trim(), dampak: dampak.value.trim(), opsi: opsi.map(o => o.value.trim()).filter(Boolean), batas: batas.value });
      c.close();
    }
  });
  return sheet({
    title: 'Need Decision',
    body: h('div', { class: 'stack' }, field('Keputusan yang dibutuhkan', isi), field('Alasan / dampak', alasan),
      laporan || x.dampak ? field('Dampak bila belum diputuskan', dampak) : null,
      h('div', { class: 'field' }, h('span', null, 'Opsi'), opsi), field('Batas waktu', batas), err),
    actions: aksi
  });
}

export function pilihPic(awal = []) {
  const dipilih = new Set(awal);
  const chips = h('div', { class: 'chips' });
  const lain = h('input', { maxlength: 60, placeholder: 'Nama lain', 'aria-label': 'Nama PIC lain' });
  const gambar = () => chips.replaceChildren(...[...new Set([...S.master.member, ...dipilih])].map(n => {
    const b = h('button', { type: 'button', class: 'chip-btn' + (dipilih.has(n) ? ' on' : ''), 'aria-pressed': String(dipilih.has(n)) }, n);
    b.addEventListener('click', () => { dipilih.has(n) ? dipilih.delete(n) : dipilih.add(n); gambar(); });
    return b;
  }));
  const tambah = h('button', { type: 'button', class: 'btn btn-sm' }, icon('plus'), 'Tambah');
  tambah.addEventListener('click', () => { const n = lain.value.trim(); if (n && dipilih.size < 5) { dipilih.add(n); lain.value = ''; gambar(); } });
  gambar();
  return { el: h('div', { class: 'stack-sm' }, chips, h('div', { class: 'inline' }, lain, tambah)), get value() { return [...dipilih].slice(0, 5); } };
}

export async function fotoDariBlob(blob, tanggal) {
  const id = uid('f');
  await db.put('photos', { id, blob, date: tanggal });
  return { id, link: '' };
}

export function kelolaFoto(fotos, tanggal, ambilKamera, onUbah) {
  const wadah = h('div', { class: 'photos' });
  const urls = [];
  async function gambar() {
    const isi = [];
    for (const [i, f] of fotos.entries()) {
      let thumb;
      const p = f.id ? await db.get('photos', f.id).catch(() => null) : null;
      if (p) { const u = URL.createObjectURL(p.blob); urls.push(u); thumb = h('img', { src: u, alt: 'Foto ' + (i + 1) }); }
      else thumb = h('span', { class: 'thumb-drive' }, icon('img'), 'Drive');
      isi.push(h('div', { class: 'thumb' }, thumb, h('button', { type: 'button', class: 'thumb-x', 'aria-label': 'Hapus foto', onclick: () => { fotos.splice(i, 1); onUbah?.(); gambar(); } }, icon('x'))));
    }
    const tKamera = h('button', { type: 'button', class: 'btn btn-sm' }, icon('cam'), 'Kamera');
    const tGaleri = h('button', { type: 'button', class: 'btn btn-sm' }, icon('img'), 'Galeri');
    tKamera.addEventListener('click', async () => { const b = await ambilKamera(); if (b) { fotos.push(await fotoDariBlob(b, tanggal)); onUbah?.(); gambar(); } });
    tGaleri.addEventListener('click', async () => {
      const f = await pilihGaleri();
      if (!f) return;
      try { fotos.push(await fotoDariBlob(await kompres(f), tanggal)); onUbah?.(); gambar(); } catch { toast('Foto tidak bisa dibaca.'); }
    });
    wadah.replaceChildren(h('div', { class: 'thumbs' }, isi), h('div', { class: 'inline' }, tKamera, tGaleri));
  }
  gambar();
  return { el: wadah, bersih: () => urls.forEach(u => URL.revokeObjectURL(u)) };
}

export { chip, iso };
