import { h, icon, field, seg, sheet, toast, chip, kosong, memuat, baris, seksi, jamTampil, tgl, iso, dariMenit, menit, uid, geser, konfirmasi, muatLayar } from './util.js';

const JENIS_DARI_OI = { 'Komplain': 'KOMP', 'Temuan SOP': 'SOP', 'Follow Up Proposal': 'PROP', 'Event': 'EVENT', 'Lead Catering': 'GCOM' };
import { S, api } from './api.js';
import { KET, ambilHari, lokalHari, simpanLokal, payload, cekAgenda, saranUntuk, jamDefault, barTanggal, statusBar, kotakCek, lewat } from './hari.js';
import { formKegiatan, formSupport, formDecision } from './form.js';
import { formOiBaru } from './openitem.js';
import { judulOi } from './home.js';

export async function render(v, arg) {
  const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(arg || '') ? arg : iso();
  const wadah = h('div', { class: 'stack' }, memuat());
  v.append(barTanggal(tanggal, 'agenda'), wadah);
  let d, offline;
  const muat = async () => {
    const lokal = await lokalHari(tanggal);
    if (lokal && !d) { d = lokal; offline = false; gambar(); }
    try { ({ d, offline } = await ambilHari(tanggal)); gambar(); }
    catch (e) { if (d) toast(e.message); else wadah.replaceChildren(kosong(e.message, 'Coba Lagi', muat)); }
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
    const PX = 64;
    const awalGrid = Math.floor(Math.min(menit(d.jam.mulai), ...d.items.map(i => menit(i.mulai))) / 60) * 60;
    const akhirGrid = Math.ceil(Math.max(menit(d.jam.selesai), ...d.items.map(i => menit(i.selesai))) / 60) * 60;
    const y = m => (m - awalGrid) / 60 * PX;
    const grid = h('div', { class: 'tl-grid', style: { height: y(akhirGrid) + 'px' } });
    for (let m = awalGrid; m <= akhirGrid; m += 60) grid.append(h('div', { class: 'tl-jam', style: { top: y(m) + 'px' } }, h('span', null, jamTampil(dariMenit(m)))));
    const lajur = h('div', { class: 'tl-lajur' });
    const tempat = (el, a, b, k = 0, n = 1) => {
      Object.assign(el.style, { top: y(a) + 2 + 'px', height: Math.max(y(b) - y(a) - 4, 16) + 'px', left: k * 100 / n + '%', width: `calc(${100 / n}% - ${n > 1 ? 4 : 0}px)` });
      if (y(b) - y(a) < 44) el.classList.add('tipis');
      return el;
    };
    const sibuk = [...d.items, ...d.saran].map(i => [menit(i.mulai), menit(i.selesai)]).sort((p, q) => p[0] - q[0]);
    const akhirKerja = menit(d.jam.selesai);
    let t = menit(d.jam.mulai);
    const kosongan = [];
    sibuk.forEach(([a, b]) => { if (a > t) kosongan.push([t, Math.min(a, akhirKerja)]); t = Math.max(t, b); });
    if (t < akhirKerja) kosongan.push([t, akhirKerja]);
    kosongan.forEach(([a, b]) => {
      for (let m = a; m < b;) {
        const e = Math.min(b, (Math.floor(m / 60) + 1) * 60);
        if (e - m >= 30) {
          const mulai = dariMenit(m);
          lajur.append(tempat(h('button', { type: 'button', class: 'tl-slot', 'aria-label': 'Isi ' + jamTampil(mulai), onclick: () => formKegiatan(d, null, { mulai, onSimpan: x => ubah(() => d.items.push(x)) }) }, icon('plus'), jamTampil(mulai)), m, e));
        }
        m = e;
      }
    });
    const ev = [...d.items.map(i => ({ t: 'k', i, a: menit(i.mulai), b: Math.max(menit(i.selesai), menit(i.mulai) + 15) })), ...d.saran.map(s => ({ t: 's', i: s, a: menit(s.mulai), b: menit(s.selesai) }))].sort((p, q) => p.a - q.a || q.b - p.b);
    let klaster = [], ujung = -1;
    const tutup = () => {
      const lanes = [];
      klaster.forEach(e => { let k = lanes.findIndex(l => l <= e.a); if (k < 0) { k = lanes.length; lanes.push(0); } lanes[k] = e.b; e.k = k; });
      klaster.forEach(e => { e.n = lanes.length; });
      klaster = [];
    };
    ev.forEach(e => { if (klaster.length && e.a >= ujung) tutup(); klaster.push(e); ujung = Math.max(ujung, e.b); });
    if (klaster.length) tutup();
    const WARNA_JENIS = ['blue', 'green', 'yellow', 'purple', 'orange', 'pink'];
    ev.forEach(e => {
      const i = e.i;
      if (e.t === 's') return lajur.append(tempat(h('button', { type: 'button', class: 'tl-blk s', onclick: () => ubahSaran(i) }, h('b', null, i.nama), chip('Saran')), e.a, e.b, e.k, e.n));
      const w = WARNA_JENIS[Math.max(0, S.master.kegiatan.findIndex(k => k.kode === i.jenis)) % WARNA_JENIS.length];
      lajur.append(tempat(h('button', {
        type: 'button', class: 'tl-blk k c-' + w,
        onclick: () => formKegiatan(d, i, { onSimpan: x => ubah(() => Object.assign(i, x)), onHapus: () => ubah(() => { d.items = d.items.filter(y => y !== i); }) })
      }, h('b', null, `[${i.jenis}] ${i.judul}`), h('small', null, [`${jamTampil(i.mulai)} - ${jamTampil(i.selesai)}`, i.store, i.caseId].filter(Boolean).join(' | ')),
      h('span', { class: 'chips' }, i.prio ? chip(i.label) : null, i.oi && !i.caseId ? chip('Open Item', 'purple') : null)), e.a, e.b, e.k, e.n));
    });
    grid.append(lajur);
    return [grid, h('div', { class: 'grid-2' },
      h('button', { type: 'button', class: 'btn', onclick: () => formKegiatan(d, null, { onSimpan: x => ubah(() => d.items.push(x)) }) }, icon('plus'), 'Tambah'),
      h('button', { type: 'button', class: 'btn', onclick: salinKemarin }, icon('refresh'), 'Salin kemarin'))];
  }

  async function salinKemarin(e) {
    const b = e.currentTarget;
    b.disabled = true;
    const ml = muatLayar('Mengambil agenda sebelumnya');
    try {
      const r = await api('hariLalu', { tanggal });
      ml.tutup();
      if (!r) return toast('Tidak ada agenda kerja dalam 14 hari terakhir.');
      if (d.items.length && !(await konfirmasi('Salin kemarin', `Kegiatan dari ${tgl(r.tanggal)} ditambahkan ke agenda ini.`, 'Salin'))) return;
      await ubah(() => r.kegiatan.forEach(k => {
        let target = k.target || '';
        if (k.prio && k.label === 'Mulai Dikerjakan' && target <= tanggal) target = geser(tanggal, 1);
        else if (k.prio && target < tanggal) target = tanggal;
        d.items.push({
          id: uid(), jenis: k.jenis, judul: k.judul, store: k.store, mulai: k.mulai, selesai: k.selesai, prio: k.prio, label: k.prio ? k.label : '',
          target: k.prio ? target : '', sumber: k.sumber, oi: k.oi, caseId: k.caseId, jadwal: '', tak: false, status: '', hasil: {}, alasan: '', pindah: '', fotos: []
        });
      }));
      toast('Kegiatan dari ' + tgl(r.tanggal) + ' disalin');
    } catch (x) { toast(x.message); }
    finally { ml.tutup(); b.disabled = false; }
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
    const ml = muatLayar('Menyimpan agenda');
    try {
      await api('simpanAgenda', { hari: payload(d) });
      d.agendaDirty = false;
      await simpanLokal(d);
      ({ d, offline } = await ambilHari(tanggal));
      toast('Agenda tersimpan');
      gambar();
    } catch (x) { toast(x.message); b.disabled = false; }
    finally { ml.tutup(); }
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

