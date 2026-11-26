import { h, icon, field, select, seg, sheet, toast, chip, kosong, memuat, baris, seksi, jamTampil, tgl, iso, pilihLainnya, konfirmasi } from './util.js';
import { S, api, jenisMaster } from './api.js';
import { STATUS_KEG, ambilHari, simpanLokal, payload, cekLaporan, barTanggal, statusBar, kotakCek, kolomHasil, ringkasHasil, statusKpi, ringkasan, tawaranOi, unggahFoto, daftarOiLaporan, OI_AKHIR } from './hari.js';
import { formKegiatan, formSupport, formDecision, kelolaFoto, tampilErr } from './form.js';
import { formOiBaru, formUbahOi } from './openitem.js';
import { judulOi } from './home.js';

const tglDari = arg => /^\d{4}-\d{2}-\d{2}$/.test(arg || '') ? arg : iso();

async function siapkan(v, arg, rute, gambarIsi) {
  const tanggal = tglDari(arg);
  const wadah = h('div', { class: 'stack' }, memuat());
  v.append(barTanggal(tanggal, rute), wadah);
  const st = { d: null, offline: false };
  const gambar = () => { const y = window.scrollY; wadah.replaceChildren(...gambarIsi(st, ubah, gambar).filter(Boolean)); window.scrollTo(0, y); };
  async function ubah(fn, ulang = true) {
    fn();
    st.d.laporanDirty = true;
    await simpanLokal(st.d);
    if (ulang) gambar();
  }
  const muat = async () => {
    try { ({ d: st.d, offline: st.offline } = await ambilHari(tanggal)); gambar(); }
    catch (e) { wadah.replaceChildren(kosong(e.message, 'Coba Lagi', muat)); }
  };
  st.muatUlang = async () => { ({ d: st.d, offline: st.offline } = await ambilHari(tanggal)); gambar(); };
  muat();
}

function inputHasil(k, nilai) {
  if (k.tipe === 'PILIH') { const s = select([['', 'Pilih'], ...k.opsi], nilai || ''); return { el: s, get value() { return s.value; } }; }
  if (k.tipe === 'YA/TIDAK') { let v = nilai || ''; return { el: seg(['Ya', 'Tidak'], v, x => { v = x; }), get value() { return v; } }; }
  if (k.tipe === 'STORE') return pilihLainnya(S.master.toko.map(t => t.nama), nilai || '', 80, 'Pilih store');
  if (k.tipe === 'JAM') { const i = h('input', { type: 'time', value: nilai || '' }); return { el: i, get value() { return i.value; } }; }
  if (k.tipe === 'OPENITEM') { const s = select([['', 'Pilih Open Item'], ...(S.oi || []).map(o => [o.caseId, `${o.caseId} ${o.deskripsi}`.slice(0, 60)]), ...(nilai && !(S.oi || []).some(o => o.caseId === nilai) ? [nilai] : [])], nilai || ''); return { el: s, get value() { return s.value; } }; }
  const i = h('input', { maxlength: 200, value: nilai || '' });
  return { el: i, get value() { return i.value.trim(); } };
}

function formHasil(d, item, { onSimpan }) {
  let status = item.status || '';
  const fotos = [...(item.fotos || [])];
  const kolom = kolomHasil(item.jenis).map(k => ({ k, inp: inputHasil(k, item.hasil?.[k.label]) }));
  const wajibFoto = jenisMaster(item.jenis)?.foto;
  const ambilKamera = async () => (await import('./camera.js')).bukaKamera({ pilih: true });
  const foto = kelolaFoto(fotos, d.date, ambilKamera);
  const alasan = pilihLainnya(S.master.alasan.filter(a => a !== 'Lainnya'), item.alasan || '', 150, 'Pilih alasan');
  const pindah = h('input', { type: 'date', value: item.pindah || '', min: d.date });
  const bHasil = h('div', { class: 'stack' }, kolom.map(({ k, inp }) => h('div', { class: 'field' }, h('span', null, k.label + (k.wajib ? '' : ' (opsional)')), inp.el)), h('div', { class: 'field' }, h('span', null, 'Foto bukti' + (wajibFoto ? '' : ' (opsional)')), foto.el));
  const bAlasan = h('div', { class: 'stack' }, h('div', { class: 'field' }, h('span', null, 'Alasan'), alasan.el));
  const bPindah = field('Dipindah ke', pindah);
  const segarkan = () => {
    bHasil.hidden = !(status === 'Selesai' || status === 'Sebagian');
    bAlasan.hidden = !(status === 'Sebagian' || status === 'Tidak Terlaksana' || status === 'Dipindah');
    bPindah.hidden = status !== 'Dipindah';
  };
  segarkan();
  const err = h('p', { class: 'form-err', role: 'alert', hidden: true });
  return sheet({
    title: item.judul,
    onClose: foto.bersih,
    body: h('div', { class: 'stack' },
      h('p', { class: 'muted small' }, `${jamTampil(item.mulai)} - ${jamTampil(item.selesai)} | ${item.store}`),
      seg(STATUS_KEG, status, s => { status = s; segarkan(); }, 'wrap'), bHasil, bAlasan, bPindah, err),
    actions: [{
      label: 'Simpan', primary: true, onClick: c => {
        if (!status) return tampilErr(err, 'Status wajib dipilih.');
        const hasil = {};
        kolom.forEach(({ k, inp }) => { if (inp.value) hasil[k.label] = inp.value; });
        if (status === 'Selesai' || status === 'Sebagian') {
          const kurang = kolom.find(({ k, inp }) => k.wajib && !inp.value);
          if (kurang) return tampilErr(err, kurang.k.label + ' wajib diisi.');
          if (wajibFoto && !fotos.length) return tampilErr(err, 'Foto bukti wajib.');
        }
        const al = status === 'Selesai' ? '' : alasan.value;
        if (status !== 'Selesai' && !al) return tampilErr(err, 'Alasan wajib diisi.');
        if (status === 'Dipindah' && !pindah.value) return tampilErr(err, 'Tanggal pindah wajib diisi.');
        onSimpan({ status, hasil: status === 'Selesai' || status === 'Sebagian' ? hasil : {}, alasan: al, pindah: status === 'Dipindah' ? pindah.value : '', fotos });
        c.close();
      }
    }]
  });
}

async function tawarkan(d, item) {
  if (item.tawaran) return;
  const t = tawaranOi(item, d.date);
  if (!t) return;
  item.tawaran = true;
  await simpanLokal(d);
  if (!(await konfirmasi('Buat Open Item?', `[${t.jenis.toUpperCase()}] ${t.deskripsi}`, 'Buat'))) return;
  try {
    const oi = await api('simpanOpenItem', { item: { ...t, pic: t.pic || [S.profil.nama], status: t.status || 'Rencana', progress: 'Dibuat dari laporan ' + tgl(d.date) } });
    if (!OI_AKHIR.includes(oi.status)) S.oi = [...(S.oi || []), oi];
    toast('Open Item ' + oi.caseId + ' dibuat');
  } catch (e) { toast(e.message); }
}

function isiLaporan(st, ubah, gambar) {
  const d = st.d;
  const out = [statusBar(d, 'laporan', st.offline)];
  if (d.ket !== 'Kerja') {
    out.push(h('div', { class: 'card center' }, h('span', { class: 'big-word' }, d.ket), d.catatan ? h('p', { class: 'muted' }, d.catatan) : null));
    out.push(...tombol(st, gambar));
    return out;
  }
  if (!d.items.length) {
    out.push(kosong('Agenda tanggal ini belum dibuat.', 'Buat Agenda', '#agenda/' + d.date));
    return out;
  }
  const rows = [...d.items].sort((a, b) => a.mulai.localeCompare(b.mulai)).map(i => baris({
    badge: h('span', { class: 'badge time tone-sky' }, jamTampil(i.mulai), h('small', null, jamTampil(i.selesai))),
    title: `[${i.jenis}] ${i.judul}`,
    sub: [i.store, i.status === 'Selesai' || i.status === 'Sebagian' ? ringkasHasil(i) : i.alasan, (i.fotos || []).length ? i.fotos.length + ' foto' : ''].filter(Boolean).join(' | '),
    right: h('span', { class: 'chips col' }, i.status ? chip(i.status) : chip('Isi hasil', 'orange'), i.tak ? chip('Tak Terencana', 'purple') : null),
    onclick: () => formHasil(d, i, {
      onSimpan: async x => {
        await ubah(() => {
          Object.assign(i, x);
          if (i.caseId && (x.status === 'Selesai' || x.status === 'Sebagian')) {
            const u = d.oiUpd[i.caseId] || {};
            d.oiUpd[i.caseId] = { ...u, progress: u.progress || ringkasHasil(i) };
          }
        });
        tawarkan(d, i);
      }
    })
  }));
  out.push(seksi('Kegiatan', [...rows, h('div', { class: 'grid-2' },
    h('button', { type: 'button', class: 'btn', onclick: () => ubah(() => d.items.forEach(i => { if (!i.status) i.status = 'Selesai'; })) }, icon('check'), 'Semua Selesai'),
    h('button', { type: 'button', class: 'btn', onclick: () => formKegiatan(d, null, { tak: true, onSimpan: x => ubah(() => d.items.push({ ...x, tak: true })) }) }, icon('plus'), 'Tak Terencana'))]));
  const pd = d.pendukung.filter(p => p.pilih);
  if (pd.length) out.push(seksi('Pekerjaan pendukung', pd.map(p => h('button', { type: 'button', class: 'check-row' + (p.cek ? ' on' : ''), 'aria-pressed': String(p.cek), onclick: () => ubah(() => { p.cek = !p.cek; }) }, h('span', { class: 'check-box' }, icon('check')), p.teks))));
  out.push(h('a', { class: 'btn btn-primary btn-block', href: '#cek-laporan/' + d.date }, 'Cek Laporan', icon('next')));
  return out;
}

function tombol(st, gambar) {
  const d = st.d;
  const cek = cekLaporan(d);
  const simpan = async e => {
    const b = e.currentTarget;
    const c = cekLaporan(d);
    if (c.galat.length) return toast(c.galat[0]);
    b.disabled = true;
    try {
      if (!d.summary.length && d.ket === 'Kerja') d.summary = ringkasan(d);
      d.oiLap = daftarOiLaporan(d).map(({ upd, ...o }) => o);
      await unggahFoto(d);
      const oi = Object.entries(d.oiUpd).map(([caseId, u]) => {
        const o = daftarOiLaporan(d).find(x => x.caseId === caseId) || {};
        return { caseId, progress: u.progress || '', kendala: u.kendala || '', status: u.status || o.status || 'Proses', target: u.target || o.target || '', alasanTarget: u.alasanTarget || '', pic: u.pic || [], tglTinjau: u.tglTinjau || '', alasanBatal: u.alasanBatal || '' };
      });
      await api('simpanLaporan', { hari: payload(d), oi, laporan: { summary: d.summary.map(x => x.trim()).filter(Boolean), refleksi: d.refleksi } });
      d.laporanDirty = false;
      await simpanLokal(d);
      await st.muatUlang();
      toast('Laporan tersimpan');
    } catch (x) { toast(x.message); b.disabled = false; }
  };
  const kirim = async () => {
    const { kirimLaporan } = await import('./send.js');
    await kirimLaporan(d, async r => { d.laporan = { ...d.laporan, kirim: r.jam, jumlah: r.nomor }; await simpanLokal(d); gambar(); });
  };
  return [kotakCek(cek), h('div', { class: 'actions' },
    h('button', { type: 'button', class: 'btn btn-primary', onclick: simpan }, icon('save'), 'Simpan'),
    h('button', { type: 'button', class: 'btn btn-outline', disabled: d.laporanDirty || !d.laporan?.simpan, onclick: kirim }, icon('send'), 'Kirim'))];
}

function isiCek(st, ubah, gambar) {
  const d = st.d;
  const out = [statusBar(d, 'laporan', st.offline)];
  if (d.ket !== 'Kerja') return [...out, kosong('Hari ini ' + d.ket + '.', 'Buka Laporan', '#laporan/' + d.date)];
  const kpi = statusKpi(d);
  out.push(seksi('Status KPI', kpi.length ? kpi.map(k => baris({ badge: h('span', { class: 'badge tone-mint' }, icon('check')), title: k.nama, sub: k.kegiatan.join(', '), right: chip(k.status) })) : kosong('Tidak ada KPI terkait hari ini.')));
  const oi = daftarOiLaporan(d);
  out.push(seksi('Open Item', [...oi.map(o => baris({
    badge: h('span', { class: 'badge tone-lilac' }, icon('list')), title: judulOi(o),
    sub: [o.caseId, o.upd?.progress ? 'Progress: ' + o.upd.progress : 'Progress belum diisi'].join(' | '),
    right: chip(o.upd?.status || o.status),
    onclick: () => formUbahOi(o, { awal: o.upd || {}, simpanLangsung: false, onSimpan: x => ubah(() => { d.oiUpd[o.caseId] = x; }) })
  })), oi.length ? null : kosong('Tidak ada Open Item.'),
  h('button', { type: 'button', class: 'btn btn-block', onclick: () => formOiBaru(o => { if (!OI_AKHIR.includes(o.status)) S.oi = [...(S.oi || []), o]; gambar(); }) }, icon('plus'), 'Tambah Open Item')]));
  const minta = (jenis, kunci, form) => seksi('Need ' + jenis, [
    ...d[kunci].map(p => baris({ title: p.isi, sub: 'Batas ' + tgl(p.batas) + (p.jawaban ? ' | Jawaban: ' + p.jawaban : ''), right: chip(p.status || 'Menunggu'), onclick: () => form(p, { d, laporan: true, onSimpan: x => ubah(() => Object.assign(p, x)), onHapus: () => ubah(() => { d[kunci] = d[kunci].filter(y => y !== p); }) }) })),
    ...d.lalu.filter(p => p.jenis === jenis).map(p => baris({ title: p.isi, sub: 'Dari ' + tgl(p.tanggal) + (p.jawaban ? ' | Jawaban: ' + p.jawaban : ''), right: chip(p.status || 'Menunggu') })),
    h('button', { type: 'button', class: 'btn btn-block', onclick: () => form(null, { d, laporan: true, onSimpan: x => ubah(() => d[kunci].push(x)) }) }, icon('plus'), 'Tambah Need ' + jenis)]);
  out.push(minta('Support', 'support', formSupport), minta('Decision', 'decision', formDecision));
  if (!d.summary.length) d.summary = ringkasan(d);
  out.push(seksi('Executive Summary', [
    ...d.summary.map((s, i) => {
      const inp = h('input', { maxlength: 200, value: s, 'aria-label': 'Poin ' + (i + 1) });
      inp.addEventListener('input', () => ubah(() => { d.summary[i] = inp.value; }, false));
      return h('div', { class: 'inline' }, inp, h('button', { type: 'button', class: 'icon-btn flat', 'aria-label': 'Hapus poin', onclick: () => ubah(() => d.summary.splice(i, 1)) }, icon('x')));
    }),
    h('div', { class: 'grid-2' },
      h('button', { type: 'button', class: 'btn', disabled: d.summary.length >= 5, onclick: () => ubah(() => d.summary.push('')) }, icon('plus'), 'Tambah Poin'),
      h('button', { type: 'button', class: 'btn', onclick: () => ubah(() => { d.summary = ringkasan(d); }) }, icon('refresh'), 'Buat Ulang'))]));
  const tanya = ['Pencapaian terbaik hari ini', 'Kendala terbesar', 'Rencana besok'];
  out.push(seksi('Refleksi', tanya.map((t, i) => {
    const ta = h('textarea', { maxlength: 150, rows: 2, value: d.refleksi[i] || '' });
    ta.addEventListener('input', () => ubah(() => { d.refleksi[i] = ta.value; }, false));
    return field(t, ta);
  })));
  out.push(...tombol(st, gambar));
  return out;
}

export function laporan(v, arg) {
  return siapkan(v, arg, 'laporan', isiLaporan);
}

export function cek(v, arg) {
  return siapkan(v, arg, 'cek-laporan', isiCek);
}
