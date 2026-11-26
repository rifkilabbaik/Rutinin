import { h, icon, field, select, seg, sheet, toast, chip, kosong, memuat, geser, iso, tgl, pilihLainnya, muatLayar } from './util.js';
import { S, api, simpanCache, ambilCache } from './api.js';
import { pilihPic, tampilErr } from './form.js';
import { barisOi, judulOi } from './home.js';
import { OI_AKHIR } from './hari.js';

const JENIS = ['Komplain', 'Temuan SOP', 'Lead Catering', 'Follow Up Proposal', 'Event', 'Instruksi Atasan', 'Lainnya'];
const STATUS = ['Rencana', 'Proses', 'Selesai', 'Didelegasikan', 'Ditunda', 'Batal'];

function syarat(status, el) {
  el.pic.hidden = status !== 'Didelegasikan';
  el.tinjau.hidden = status !== 'Ditunda';
  el.batal.hidden = status !== 'Batal';
}

export function formOiBaru(onSimpan, awal = {}) {
  const jenis = select([['', 'Pilih jenis'], ...JENIS], awal.jenis || '');
  const desk = h('textarea', { maxlength: 120, rows: 3, value: awal.deskripsi || '' });
  const ref = select([['', 'Pilih referensi'], ...S.master.referensi], awal.referensi || '');
  const store = pilihLainnya(S.master.toko.map(t => t.nama), awal.store || '', 80, 'Tidak ada');
  const pic = pilihPic(awal.pic || [S.profil.nama]);
  const target = h('input', { type: 'date', value: awal.target || geser(iso(), 7) });
  const status = select(STATUS, awal.status || 'Rencana');
  const tinjau = h('input', { type: 'date' });
  const batal = h('input', { maxlength: 150 });
  const el = { tinjau: field('Tanggal tinjau ulang', tinjau), batal: field('Alasan batal', batal) };
  status.addEventListener('change', () => { el.tinjau.hidden = status.value !== 'Ditunda'; el.batal.hidden = status.value !== 'Batal'; });
  el.tinjau.hidden = true;
  el.batal.hidden = true;
  const err = h('p', { class: 'form-err', role: 'alert', hidden: true });
  return sheet({
    title: 'Tambah Open Item',
    body: h('div', { class: 'stack' }, field('Jenis', jenis), field('Deskripsi', desk), field('Referensi', ref), h('div', { class: 'field' }, h('span', null, 'Store terkait'), store.el),
      h('div', { class: 'field' }, h('span', null, 'PIC'), pic.el), field('Target selesai', target), field('Status', status), el.tinjau, el.batal, err),
    actions: [{
      label: 'Simpan', primary: true, onClick: async c => {
        if (!jenis.value) return tampilErr(err, 'Jenis wajib dipilih.');
        if (!desk.value.trim()) return tampilErr(err, 'Deskripsi wajib diisi.');
        if (!ref.value) return tampilErr(err, 'Referensi wajib dipilih.');
        if (!pic.value.length) return tampilErr(err, 'PIC wajib dipilih.');
        if (!target.value) return tampilErr(err, 'Target wajib diisi.');
        const ml = muatLayar('Menyimpan Open Item');
        try {
          const oi = await api('simpanOpenItem', { item: { jenis: jenis.value, deskripsi: desk.value.trim(), referensi: ref.value, store: store.value, pic: pic.value, target: target.value, status: status.value, tglTinjau: tinjau.value, alasanBatal: batal.value.trim(), progress: awal.progress || '' } });
          toast('Open Item ' + oi.caseId + ' dibuat');
          c.close();
          onSimpan?.(oi);
        } catch (x) { tampilErr(err, x.message); }
        finally { ml.tutup(); }
      }
    }]
  });
}

export function formUbahOi(oi, { awal = {}, onSimpan, simpanLangsung = true } = {}) {
  const progress = h('textarea', { maxlength: 150, rows: 2, value: awal.progress || '' });
  const kendala = h('textarea', { maxlength: 150, rows: 2, value: awal.kendala || '' });
  const status = select(STATUS, awal.status || oi.status);
  const target = h('input', { type: 'date', value: awal.target || oi.target });
  const alasanTarget = h('input', { maxlength: 150, value: awal.alasanTarget || '' });
  const wadahAlasan = field('Alasan ubah target', alasanTarget);
  const pic = pilihPic(awal.pic?.length ? awal.pic : oi.pic);
  const tinjau = h('input', { type: 'date', value: awal.tglTinjau || oi.tglTinjau || '' });
  const batal = h('input', { maxlength: 150, value: awal.alasanBatal || oi.alasanBatal || '' });
  const el = { pic: h('div', { class: 'field' }, h('span', null, 'PIC baru'), pic.el), tinjau: field('Tanggal tinjau ulang', tinjau), batal: field('Alasan batal', batal) };
  const segarkan = () => { syarat(status.value, el); wadahAlasan.hidden = target.value === oi.target; };
  status.addEventListener('change', segarkan);
  target.addEventListener('change', segarkan);
  segarkan();
  const riwayat = h('div', { class: 'stack-sm' });
  if (simpanLangsung) {
    riwayat.append(memuat());
    api('riwayatOpenItem', { caseId: oi.caseId }).then(r => riwayat.replaceChildren(...(r.length ? r.map(l => h('div', { class: 'log' }, h('b', null, l.tanggal + ' ' + (l.oleh || '')), h('span', null, [l.status, l.progress, l.kendala ? 'Kendala: ' + l.kendala : '', l.target ? 'Target baru ' + tgl(l.target) : ''].filter(Boolean).join(' | ')))) : [h('p', { class: 'muted small' }, 'Belum ada riwayat.')]))).catch(e => riwayat.replaceChildren(h('p', { class: 'muted small' }, e.message)));
  }
  const err = h('p', { class: 'form-err', role: 'alert', hidden: true });
  return sheet({
    title: oi.caseId,
    body: h('div', { class: 'stack' },
      h('p', { class: 'oi-desc' }, judulOi(oi)),
      h('div', { class: 'chips' }, chip(oi.status), chip('Target ' + tgl(oi.target), 'gray'), oi.referensi ? chip(oi.referensi, 'blue') : null),
      field('Progress hari ini', progress), field('Kendala', kendala), field('Status baru', status), field('Target', target), wadahAlasan, el.pic, el.tinjau, el.batal, err,
      simpanLangsung ? h('div', { class: 'section' }, h('h3', { class: 'h-sm' }, 'Riwayat'), riwayat) : null),
    actions: [{
      label: 'Simpan', primary: true, onClick: async c => {
        const x = { caseId: oi.caseId, progress: progress.value.trim(), kendala: kendala.value.trim(), status: status.value, target: target.value, alasanTarget: alasanTarget.value.trim(), pic: status.value === 'Didelegasikan' ? pic.value : [], tglTinjau: tinjau.value, alasanBatal: batal.value.trim() };
        if (x.target !== oi.target && !x.alasanTarget) return tampilErr(err, 'Alasan ubah target wajib diisi.');
        if (x.status === 'Didelegasikan' && !x.pic.length) return tampilErr(err, 'PIC baru wajib dipilih.');
        if (x.status === 'Ditunda' && !x.tglTinjau) return tampilErr(err, 'Tanggal tinjau wajib diisi.');
        if (x.status === 'Batal' && !x.alasanBatal) return tampilErr(err, 'Alasan batal wajib diisi.');
        if (!simpanLangsung) { onSimpan?.(x); c.close(); return; }
        const ml = muatLayar('Menyimpan Open Item');
        try { const baru = await api('simpanOpenItem', { item: x }); toast('Open Item tersimpan'); c.close(); onSimpan?.(baru); }
        catch (e) { tampilErr(err, e.message); }
        finally { ml.tutup(); }
      }
    }]
  });
}

export async function render(v) {
  let tab = 'aktif', data = ambilCache('oi');
  const wadah = h('div', { class: 'section' }, memuat());
  v.append(seg([['aktif', 'Aktif'], ['tutup', 'Selesai']], tab, t => { tab = t; gambar(); }), wadah,
    h('button', { type: 'button', class: 'btn btn-primary btn-block', onclick: () => formOiBaru(() => muat()) }, icon('plus'), 'Tambah Open Item'));
  const gambar = () => {
    const isi = (data || []).filter(o => (tab === 'aktif') !== OI_AKHIR.includes(o.status));
    wadah.replaceChildren(...(isi.length ? isi.map(o => barisOi(o, () => formUbahOi(o, { onSimpan: () => muat() }))) : [kosong(tab === 'aktif' ? 'Tidak ada Open Item aktif.' : 'Belum ada Open Item selesai.')]));
  };
  const muat = async () => {
    if (!data) wadah.replaceChildren(memuat());
    try { data = await api('openItem'); simpanCache('oi', data); S.oi = data.filter(o => !OI_AKHIR.includes(o.status)); gambar(); }
    catch (e) { if (!data) wadah.replaceChildren(kosong(e.message, 'Coba Lagi', muat)); else toast(e.message); }
  };
  if (data) gambar();
  muat();
}
