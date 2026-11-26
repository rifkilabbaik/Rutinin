import { h, icon, field, select, seg, sheet, toast, chip, kosong, iso, z, HARI, BULAN, parse, jamTampil, tglFile, keBase64, keDataUrl, muatLayar } from './util.js';
import { S, api } from './api.js';
import { db } from './db.js';
import { kelolaFoto, tampilErr } from './form.js';

const JENIS = [
  { kode: '7langkah', judul: '7 Langkah Pelayanan', petugas: 'Nama Kasir', ic: 'chat', tone: 'sky' },
  { kode: 'doublecheck', judul: 'Double Check Order', petugas: 'Nama Kasir/Server', ic: 'check', tone: 'mint' },
  { kode: 'kebersihan', judul: 'Kebersihan', petugas: '', ic: 'sop', tone: 'lilac' }
];
const kategori = p => p >= 100 ? 'Sempurna' : p >= 90 ? 'Sangat Baik' : p >= 80 ? 'Baik' : p >= 75 ? 'Cukup' : 'Buruk';
const pct = v => { const r = Math.round(v * 100) / 100; return (Number.isInteger(r) ? r : r.toFixed(2)) + '%'; };
const hariTgl = s => { const d = parse(s); return `${HARI[d.getDay()]}, ${z(d.getDate())}/${BULAN[d.getMonth()]}/${d.getFullYear()}`; };

let st = null;

function baru() {
  const n = new Date();
  return { langkah: 'jenis', jenis: '', store: '', petugas: '', tanggal: iso(n), jam: `${z(n.getHours())}:${z(n.getMinutes())}`, area: [], nilai: {}, ket: {}, foto: {}, simpan: null };
}

const info = () => JENIS.find(j => j.kode === st.jenis);
const semuaArea = () => [...new Set(S.master.sop.filter(x => x.jenis === 'kebersihan').map(x => x.bagian))];

function bagian() {
  const out = [];
  S.master.sop.filter(x => x.jenis === st.jenis).forEach((x, i) => {
    if (st.jenis === 'kebersihan' && !st.area.includes(x.bagian)) return;
    let b = out.find(y => y.nama === x.bagian);
    if (!b) out.push(b = { nama: x.bagian, item: [] });
    b.item.push({ ...x, key: st.jenis + ':' + i });
  });
  return out;
}

function hitung() {
  const bag = bagian();
  let total = 0, maks = 0;
  bag.flatMap(b => b.item).forEach(x => {
    if (st.jenis === 'kebersihan') { maks += x.bobot; if (st.nilai[x.key] === 'Ya') total += x.bobot; }
    else { const b = st.jenis === 'doublecheck' ? 1 : x.bobot; maks += b; total += (Number(st.nilai[x.key]) || 0) / 5 * b; }
  });
  const poin = maks ? total / maks * 100 : 0;
  return { bag, poin, kategori: kategori(poin) };
}

const simpanSt = () => db.put('kv', st, 'sop').catch(() => {});

function teks() {
  const J = info(), { bag, poin, kategori: k } = hitung(), pad = l => l.padEnd(13);
  let t = `PENILAIAN ${J.judul.toUpperCase()}\n\n${pad('Nama Toko')}: ${st.store}\n${J.petugas ? `${pad(J.petugas)}: ${st.petugas}\n` : ''}${pad('Hari/Tanggal')}: ${hariTgl(st.tanggal)}\n${pad('Jam')}: ${jamTampil(st.jam)}\n`;
  if (st.jenis === 'kebersihan') t += `${pad('Area')}: ${teksArea()}\n`;
  bag.forEach(b => {
    t += `\n${b.nama.toUpperCase()}\n`;
    b.item.forEach(x => {
      t += st.jenis === 'kebersihan' ? `[${st.nilai[x.key]}] ${x.item}\n` : `- ${x.item} : ${st.nilai[x.key]}\n`;
      if (st.ket[x.key]) t += `"${st.ket[x.key]}"\n`;
    });
  });
  return t + `\n\nPOIN      : ${pct(poin)}\nKATEGORI  : ${k}`;
}

const teksArea = () => st.area.length === semuaArea().length ? 'Semua Area' : st.area.join(', ');

export async function render(v) {
  if (!st) st = (await db.get('kv', 'sop').catch(() => null)) || baru();
  const wadah = h('div', { class: 'stack' });
  v.append(wadah);
  const bersih = [];
  const gambar = () => {
    const y = window.scrollY;
    bersih.splice(0).forEach(f => f());
    wadah.replaceChildren(...({ jenis: lJenis, form: lForm, nilai: lNilai, hasil: lHasil }[st.langkah] || lJenis)().filter(Boolean));
    window.scrollTo(0, y);
  };
  const ke = l => { st.langkah = l; simpanSt(); window.scrollTo(0, 0); gambar(); };

  function lJenis() {
    if (!S.master.sop.length) return [kosong('Daftar penilaian belum diisi admin.')];
    return [h('h3', { class: 'h' }, 'Pilih penilaian'), ...JENIS.map(j => h('button', {
      type: 'button', class: 'row', onclick: () => {
        st = { ...baru(), jenis: j.kode, area: j.kode === 'kebersihan' ? semuaArea() : [] };
        ke('form');
      }
    }, h('span', { class: 'badge tone-' + j.tone }, icon(j.ic)), h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, j.judul)), icon('next', 'ic chev')))];
  }

  function lForm() {
    const J = info();
    const store = select([['', 'Pilih store'], ...S.master.toko.map(t => t.nama)], st.store);
    const petugas = h('input', { maxlength: 60, value: st.petugas });
    const tanggal = h('input', { type: 'date', value: st.tanggal });
    const jam = h('input', { type: 'time', value: st.jam });
    const area = st.jenis === 'kebersihan' ? h('div', { class: 'chips' }, semuaArea().map(a => {
      const b = h('button', { type: 'button', class: 'chip-btn' + (st.area.includes(a) ? ' on' : ''), 'aria-pressed': String(st.area.includes(a)) }, a);
      b.addEventListener('click', () => { st.area = st.area.includes(a) ? st.area.filter(x => x !== a) : [...st.area, a]; b.classList.toggle('on'); b.setAttribute('aria-pressed', String(st.area.includes(a))); });
      return b;
    })) : null;
    const err = h('p', { class: 'form-err', role: 'alert', hidden: true });
    return [
      h('div', { class: 'card' }, h('div', { class: 'sec-head' }, h('h3', { class: 'h-sm' }, J.judul), h('button', { type: 'button', class: 'link', onclick: () => ke('jenis') }, 'Ganti')),
        field('Nama Toko', store), J.petugas ? field(J.petugas, petugas) : null, h('div', { class: 'grid-2' }, field('Tanggal', tanggal), field('Jam', jam)),
        area ? h('div', { class: 'field' }, h('span', null, 'Area'), area) : null, err,
        h('button', {
          type: 'button', class: 'btn btn-primary btn-block', onclick: () => {
            if (!store.value) return tampilErr(err, 'Nama toko wajib dipilih.');
            if (J.petugas && !petugas.value.trim()) return tampilErr(err, J.petugas + ' wajib diisi.');
            if (!tanggal.value || !jam.value) return tampilErr(err, 'Tanggal dan jam wajib diisi.');
            if (area && !st.area.length) return tampilErr(err, 'Pilih minimal satu area.');
            Object.assign(st, { store: store.value, petugas: J.petugas ? petugas.value.trim() : '', tanggal: tanggal.value, jam: jam.value, simpan: null });
            ke('nilai');
          }
        }, 'Lanjut', icon('next')))
    ];
  }

  function kriteria(x) {
    sheet({ title: x.item, body: h('div', { class: 'stack-sm' }, x.k.map((t, i) => t ? h('div', { class: 'kv kriteria' }, h('b', null, String(i + 1)), h('span', null, t)) : null)) });
  }

  function lNilai() {
    const bag = bagian();
    const semua = bag.flatMap(b => b.item);
    const terisi = semua.filter(x => st.nilai[x.key] !== undefined).length;
    const out = [h('div', { class: 'sticky-info' }, chip(`${terisi} dari ${semua.length} terisi`, terisi === semua.length ? 'green' : 'orange'), h('button', { type: 'button', class: 'link', onclick: () => ke('form') }, 'Ubah data'))];
    bag.forEach(b => {
      out.push(h('h3', { class: 'h-sm' }, b.nama));
      b.item.forEach(x => {
        const ket = h('input', { maxlength: 200, value: st.ket[x.key] || '', placeholder: 'Keterangan', 'aria-label': 'Keterangan ' + x.item });
        ket.addEventListener('input', () => { st.ket[x.key] = ket.value; st.simpan = null; simpanSt(); });
        let pilihan;
        if (st.jenis === 'kebersihan') pilihan = seg(['Ya', 'Tidak'], st.nilai[x.key], val => { st.nilai[x.key] = val; st.simpan = null; simpanSt(); gambar(); });
        else pilihan = h('div', { class: 'score-btns' }, [1, 2, 3, 4, 5].map(n => h('button', {
          type: 'button', class: 'score-btn' + (Number(st.nilai[x.key]) === n ? ' on' : ''), 'aria-pressed': String(Number(st.nilai[x.key]) === n),
          onclick: () => { st.nilai[x.key] = n; st.simpan = null; simpanSt(); gambar(); }
        }, String(n))));
        let foto = null;
        if (st.jenis === 'kebersihan') {
          st.foto[x.key] ||= [];
          foto = kelolaFoto(st.foto[x.key], st.tanggal, async () => (await import('./camera.js')).bukaKamera({ pilih: true }), () => { st.simpan = null; simpanSt(); });
          bersih.push(foto.bersih);
        }
        out.push(h('div', { class: 'card sop-item' + (st.nilai[x.key] === undefined ? '' : ' done') },
          h('div', { class: 'sec-head' }, h('b', null, x.item), st.jenis === '7langkah' ? h('button', { type: 'button', class: 'link', onclick: () => kriteria(x) }, 'Kriteria') : null),
          pilihan, ket, foto ? foto.el : null));
      });
    });
    out.push(h('button', {
      type: 'button', class: 'btn btn-primary btn-block', onclick: () => {
        const kurang = semua.find(x => st.nilai[x.key] === undefined);
        if (kurang) return toast('Belum dinilai: ' + kurang.item);
        ke('hasil');
      }
    }, 'Lihat Hasil', icon('next')));
    return out;
  }

  async function simpan(e) {
    const b = e.currentTarget;
    b.disabled = true;
    const ml = muatLayar('Menyimpan penilaian');
    try {
      const { bag, poin, kategori: k } = hitung();
      for (const arr of Object.values(st.foto)) {
        for (const f of arr) {
          if (f.link || !f.id) continue;
          const p = await db.get('photos', f.id);
          if (!p) continue;
          ml.teks('Mengunggah foto');
          f.link = (await api('unggah', { jenis: 'foto', nama: `Takbiran ${st.store} ${tglFile(st.tanggal)}.jpg`, data: await keBase64(p.blob), tanggal: st.tanggal, terkait: 'takbiran' })).link;
          await simpanSt();
        }
      }
      const hasil = bag.flatMap(g => g.item.map(x => ({ bagian: g.nama, item: x.item, nilai: String(st.nilai[x.key]), ket: st.ket[x.key] || '', foto: (st.foto[x.key] || []).filter(f => f.link).map(f => f.link) })));
      const r = await api('simpanSop', { data: { jenis: st.jenis, store: st.store, petugas: st.petugas, tanggal: st.tanggal, jam: st.jam, area: st.jenis === 'kebersihan' ? st.area : [], hasil, poin, kategori: k } });
      st.simpan = { jam: r.jamSimpan };
      await simpanSt();
      toast('Penilaian tersimpan');
      gambar();
    } catch (x) { toast(x.message); b.disabled = false; }
    finally { ml.tutup(); }
  }

  async function kirim() {
    const [{ kirimPdf }, { blokSop, blokFoto }] = await Promise.all([import('./send.js'), import('./docs.js')]);
    const J = info(), { bag, poin, kategori: k } = hitung();
    const fotos = [];
    for (const g of bag) for (const x of g.item) for (const f of st.foto[x.key] || []) {
      const p = f.id ? await db.get('photos', f.id).catch(() => null) : null;
      if (p) fotos.push({ src: await keDataUrl(p.blob), caption: x.item });
    }
    const r = {
      judul: J.judul, store: st.store, labelPetugas: J.petugas, petugas: st.petugas, tanggal: st.tanggal, jam: st.jam,
      area: st.jenis === 'kebersihan' ? teksArea() : '', poinTeks: pct(poin), kategori: k,
      bagian: bag.map(g => ({ nama: g.nama, item: g.item.map(x => ({ nama: x.item, nilaiTeks: String(st.nilai[x.key]), ket: st.ket[x.key] })) }))
    };
    await kirimPdf({
      jenis: 'Takbiran', tanggal: st.tanggal, blok: [...blokSop(r, S.profil), ...blokFoto(fotos)],
      namaFile: `Takbiran ${J.judul} MCED-${S.profil.kode} ${tglFile(st.tanggal)}.pdf`, teks: teks(),
      onTerkirim: () => toast('Penilaian terkirim')
    });
  }

  function lHasil() {
    const J = info(), { bag, poin, kategori: k } = hitung();
    return [
      h('div', { class: 'hero center' }, h('div', { class: 'hero-label' }, J.judul), h('div', { class: 'hero-value' }, pct(poin)), h('div', { class: 'hero-sub' }, k)),
      h('div', { class: 'card' }, ...[['Nama Toko', st.store], J.petugas ? [J.petugas, st.petugas] : null, ['Hari/Tanggal', hariTgl(st.tanggal)], ['Jam', jamTampil(st.jam)], st.jenis === 'kebersihan' ? ['Area', teksArea()] : null].filter(Boolean).map(([a, b]) => h('div', { class: 'kv' }, h('span', null, a), h('b', null, b)))),
      ...bag.map(g => h('section', { class: 'section' }, h('h3', { class: 'h-sm' }, g.nama), g.item.map(x => h('div', { class: 'row' }, h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, x.item), st.ket[x.key] ? h('span', { class: 'row-sub' }, st.ket[x.key]) : null), chip(String(st.nilai[x.key]), st.nilai[x.key] === 'Tidak' || Number(st.nilai[x.key]) <= 2 ? 'red' : Number(st.nilai[x.key]) === 3 ? 'yellow' : 'green'))))),
      st.simpan ? h('div', { class: 'chips' }, chip('Tersimpan ' + jamTampil(st.simpan.jam.split(' ')[1] || ''), 'blue')) : null,
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn btn-primary', disabled: !!st.simpan, onclick: simpan }, icon('save'), 'Simpan'),
        h('button', { type: 'button', class: 'btn btn-outline', disabled: !st.simpan, onclick: kirim }, icon('send'), 'Kirim')),
      h('div', { class: 'grid-2' },
        h('button', { type: 'button', class: 'btn', onclick: () => ke('nilai') }, icon('edit'), 'Ubah Nilai'),
        h('button', { type: 'button', class: 'btn', onclick: () => { st = baru(); simpanSt(); ke('jenis'); } }, icon('plus'), 'Penilaian Baru'))
    ];
  }

  gambar();
  return () => bersih.splice(0).forEach(f => f());
}
