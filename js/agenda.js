import { h, icon, field, seg, sheet, toast, chip, kosong, memuat, baris, seksi, jamTampil, tgl, iso, dariMenit, menit, uid } from './util.js';

const JENIS_DARI_OI = { 'Komplain': 'KOMP', 'Temuan SOP': 'SOP', 'Follow Up Proposal': 'PROP', 'Event': 'EVENT', 'Lead Catering': 'GCOM' };
import { S, api } from './api.js';
import { KET, ambilHari, simpanLokal, payload, cekAgenda, saranUntuk, jamDefault, barTanggal, statusBar, kotakCek, urutWaktu, lewat } from './hari.js';
import { formKegiatan, formSupport, formDecision } from './form.js';
import { formOiBaru } from './openitem.js';
import { judulOi } from './home.js';

export async function render(v, arg) {
  const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(arg || '') ? arg : iso();
  const wadah = h('div', { class: 'stack' }, memuat());
  v.append(barTanggal(tanggal, 'agenda'), wadah);
  let d, offline;
  const muat = async () => {
    try { ({ d, offline } = await ambilHari(tanggal)); gambar(); }
    catch (e) { wadah.replaceChildren(kosong(e.message, 'Coba Lagi', muat)); }
  };

  async function ubah(fn, ulang = true) {
    fn();
    d.agendaDirty = true;
    await simpanLokal(d);
    if (ulang) gambar();
  }

  function gambar() {
    const y = window.scrollY;
    wadah.replaceChildren(...isi().filter(Boolean));
    window.scrollTo(0, y);
  }

  function kartuJam() {
    const mulai = h('input', { type: 'time', value: d.jam.mulai, 'aria-label': 'Jam mulai custom' });
    mulai.addEventListener('change', () => ubah(() => {
      d.jam = { mode: 'custom', mulai: mulai.value, selesai: dariMenit(menit(mulai.value) + 540) };
      d.saran = saranUntuk(d.jam);
    }));
    return h('div', { class: 'card' },
      h('div', { class: 'sec-head' }, h('h3', { class: 'h-sm' }, 'Jam kerja'), chip(`${jamTampil(d.jam.mulai)} - ${jamTampil(d.jam.selesai)}`, 'orange')),
      seg([['default', 'Default'], ['custom', 'Custom 9 jam']], d.jam.mode, m => ubah(() => {
        d.jam = m === 'custom' ? { mode: 'custom', mulai: d.jam.mulai, selesai: dariMenit(menit(d.jam.mulai) + 540) } : { ...jamDefault(d.date), mode: 'default' };
        d.saran = saranUntuk(d.jam);
      })),
      d.jam.mode === 'custom' ? field('Jam mulai', mulai) : null);
  }

  function masukkanOi(o) {
    const kode = JENIS_DARI_OI[o.jenis];
    const jenis = S.master.kegiatan.some(k => k.kode === kode) ? kode : (S.master.kegiatan.find(k => k.kode === 'ADM') || S.master.kegiatan[0]).kode;
    const m = Math.max(menit(d.jam.mulai), ...d.items.map(i => menit(i.selesai)));
    d.items.push({
      id: uid(), jenis, judul: o.deskripsi.slice(0, 60), store: o.store || '-', mulai: dariMenit(m), selesai: dariMenit(Math.min(m + 60, 1439)),
      prio: false, label: '', target: '', sumber: 'Open Item', oi: false, caseId: o.caseId, jadwal: '', tak: false, status: '', hasil: {}, alasan: '', pindah: '', fotos: []
    });
  }

  function seksiOi() {
    const oi = [...(S.oi || [])].sort((a, b) => (lewat(b) - lewat(a)) || ((b.target === d.date) - (a.target === d.date)));
    const isi = oi.map(o => {
      const masuk = d.items.some(i => i.caseId === o.caseId);
      return h('div', { class: 'card oi-card' + (lewat(o) ? ' late' : '') },
        h('div', { class: 'sec-head' }, h('b', null, o.caseId), lewat(o) ? chip('Lewat target') : chip(o.status)),
        h('p', { class: 'oi-desc' }, judulOi(o)),
        h('p', { class: 'muted small' }, 'Target ' + tgl(o.target)),
        masuk ? chip('Sudah di agenda', 'green') : h('button', { type: 'button', class: 'btn btn-sm', onclick: () => ubah(() => masukkanOi(o)) }, icon('plus'), 'Masukkan ke agenda'));
    });
    return seksi('Open Item aktif', [...(isi.length ? isi : [kosong('Tidak ada Open Item aktif.')]), h('button', { type: 'button', class: 'btn btn-block', onclick: () => formOiBaru(o => { S.oi = [...(S.oi || []), o]; gambar(); }) }, icon('plus'), 'Tambah Open Item')]);
  }

  function timeline() {
    const rows = urutWaktu(d).map(({ t, i }) => t === 'k'
      ? baris({
        badge: h('span', { class: 'badge time tone-sky' }, jamTampil(i.mulai), h('small', null, jamTampil(i.selesai))),
        title: `[${i.jenis}] ${i.judul}`, sub: [i.store, i.caseId].filter(Boolean).join(' | '),
        right: h('span', { class: 'chips col' }, i.prio ? chip(i.label) : null, i.oi && !i.caseId ? chip('Open Item', 'purple') : null),
        onclick: () => formKegiatan(d, i, { onSimpan: x => ubah(() => Object.assign(i, x)), onHapus: () => ubah(() => { d.items = d.items.filter(y => y !== i); }) })
      })
      : baris({
        cls: 'saran', badge: h('span', { class: 'badge time tone-gray' }, jamTampil(i.mulai), h('small', null, jamTampil(i.selesai))),
        title: i.nama, right: chip('Saran'), onclick: () => ubahSaran(i)
      }));
    return [...(rows.length ? rows : [kosong('Belum ada kegiatan.')]),
      h('button', { type: 'button', class: 'btn btn-block', onclick: () => formKegiatan(d, null, { onSimpan: x => ubah(() => d.items.push(x)) }) }, icon('plus'), 'Tambah Kegiatan')];
  }

  function ubahSaran(s) {
    const m = h('input', { type: 'time', value: s.mulai }), e = h('input', { type: 'time', value: s.selesai });
    sheet({
      title: s.nama, body: h('div', { class: 'grid-2' }, field('Mulai', m), field('Selesai', e)),
      actions: [
        { label: 'Hapus', danger: true, onClick: c => { ubah(() => { d.saran = d.saran.filter(x => x !== s); }); c.close(); } },
        { label: 'Simpan', primary: true, onClick: c => { if (m.value && e.value && e.value > m.value) { ubah(() => { s.mulai = m.value; s.selesai = e.value; }); c.close(); } } }
      ]
    });
  }

  function pendukung() {
    const inp = h('input', { maxlength: 60, placeholder: 'Pekerjaan lain', 'aria-label': 'Tambah pekerjaan pendukung' });
    const tambah = () => { const t = inp.value.trim(); if (t && !d.pendukung.some(p => p.teks.toLowerCase() === t.toLowerCase())) ubah(() => d.pendukung.push({ teks: t, pilih: true, cek: false })); };
    return [
      ...d.pendukung.map(p => h('button', { type: 'button', class: 'check-row' + (p.pilih ? ' on' : ''), 'aria-pressed': String(p.pilih), onclick: () => ubah(() => { p.pilih = !p.pilih; }) }, h('span', { class: 'check-box' }, icon('check')), p.teks)),
      h('div', { class: 'inline' }, inp, h('button', { type: 'button', class: 'btn btn-sm', onclick: tambah }, icon('plus'), 'Tambah'))
    ];
  }

  function barisMinta(p, onclick, lalu) {
    return baris({
      badge: h('span', { class: 'badge tone-' + (p.jenis === 'Support' ? 'sky' : 'butter') }, icon(p.jenis === 'Support' ? 'send' : 'alert')),
      title: p.isi, sub: [p.tujuan ? 'Ke ' + p.tujuan : '', 'Batas ' + tgl(p.batas), lalu ? 'Dari ' + tgl(p.tanggal) : '', p.jawaban ? 'Jawaban: ' + p.jawaban : ''].filter(Boolean).join(' | '),
      right: chip(p.status || 'Menunggu'), onclick
    });
  }

  function permintaan(jenis) {
    const kunci = jenis === 'Support' ? 'support' : 'decision';
    const form = jenis === 'Support' ? formSupport : formDecision;
    return [
      ...d[kunci].map(p => barisMinta(p, () => form(p, { d, onSimpan: x => ubah(() => Object.assign(p, x)), onHapus: () => ubah(() => { d[kunci] = d[kunci].filter(y => y !== p); }) }))),
      ...d.lalu.filter(p => p.jenis === jenis).map(p => barisMinta(p, null, true)),
      h('button', { type: 'button', class: 'btn btn-block', onclick: () => form(null, { d, onSimpan: x => ubah(() => d[kunci].push(x)) }) }, icon('plus'), 'Tambah Need ' + jenis)
    ];
  }

  async function simpan(e) {
    const b = e.currentTarget;
    const cek = cekAgenda(d);
    if (cek.galat.length) return toast(cek.galat[0]);
    b.disabled = true;
    try {
      await api('simpanAgenda', { hari: payload(d) });
      d.agendaDirty = false;
      await simpanLokal(d);
      ({ d, offline } = await ambilHari(tanggal));
      toast('Agenda tersimpan');
      gambar();
    } catch (x) { toast(x.message); b.disabled = false; }
  }

  async function kirim() {
    const { kirimAgenda } = await import('./send.js');
    await kirimAgenda(d, async r => {
      d.agenda = { ...d.agenda, kirim: r.jam, jumlah: r.nomor };
      await simpanLokal(d);
      gambar();
    });
  }

  function isi() {
    const out = [statusBar(d, 'agenda', offline)];
    out.push(h('div', { class: 'chips scroll' }, KET.map(k => h('button', { type: 'button', class: 'chip-btn' + (d.ket === k ? ' on' : ''), 'aria-pressed': String(d.ket === k), onclick: () => ubah(() => { d.ket = k; }) }, k))));
    if (d.ket !== 'Kerja') {
      const cat = h('textarea', { maxlength: 300, rows: 3, value: d.catatan });
      cat.addEventListener('input', () => ubah(() => { d.catatan = cat.value; }, false));
      out.push(h('div', { class: 'card' }, field('Catatan', cat)));
    } else {
      out.push(kartuJam(), seksiOi(), seksi('Kegiatan', timeline()), seksi('Pekerjaan pendukung', pendukung()), seksi('Need Support', permintaan('Support')), seksi('Need Decision', permintaan('Decision')));
    }
    out.push(kotakCek(cekAgenda(d)));
    out.push(h('div', { class: 'actions' },
      h('button', { type: 'button', class: 'btn btn-primary', onclick: simpan }, icon('save'), 'Simpan'),
      h('button', { type: 'button', class: 'btn btn-outline', disabled: d.agendaDirty || !d.agenda, onclick: kirim }, icon('send'), 'Kirim')));
    return out;
  }

  muat();
}

