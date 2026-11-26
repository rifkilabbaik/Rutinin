import { h, icon, field, select, seg, sheet, toast, chip, kosong, memuat, iso, parse, geser, tglPanjang, jamTampil, BULAN, pilihLainnya, konfirmasi, muatLayar, nomorWa, jamDari } from './util.js';
import { S, api, simpanCache, ambilCache } from './api.js';
import { judulJadwal } from './hari.js';
import { tampilErr } from './form.js';

const HARI3 = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const KUNCI_FILTER = 'rutinin.jadwal.filter';
const KUNCI_MODE = 'rutinin.jadwal.mode';

export const warnaJadwal = jenis => 'j' + Math.max(0, (S.master.jadwal || []).findIndex(m => m.jenis === jenis)) % 6;
export const perluUpdate = j => j.status === 'Terjadwal' && j.tanggal < iso();

export function chipStatusJadwal(j) {
  if (perluUpdate(j)) return chip('Perlu update', 'yellow');
  return chip(j.status, j.status === 'Selesai' ? 'green' : j.status === 'Batal' ? 'red' : 'blue');
}

export function kartuJadwal(j, onclick) {
  const d = parse(j.tanggal);
  const isi = [
    h('span', { class: 'badge jbadge ' + warnaJadwal(j.jenis) }, String(d.getDate()), h('small', null, HARI3[d.getDay()])),
    h('span', { class: 'row-text' },
      h('span', { class: 'chips' }, h('span', { class: 'pill jpill ' + warnaJadwal(j.jenis) }, j.jenis), chipStatusJadwal(j)),
      h('span', { class: 'row-title' }, judulJadwal(j)),
      h('span', { class: 'row-sub' }, [jamTampil(j.jam), j.store, j.nama].filter(Boolean).join(' | ')))
  ];
  return onclick ? h('button', { type: 'button', class: 'row' + (j.status === 'Batal' ? ' batal' : ''), onclick }, isi) : h('a', { class: 'row', href: '#jadwal' }, isi);
}

function satuan(f, v) {
  if (f.tipe !== 'angka') return v;
  return v + (/box/i.test(f.label) ? ' box' : ' orang');
}

function teksBagikan(j) {
  const m = (S.master.jadwal || []).find(x => x.jenis === j.jenis);
  const baris = [`*${j.jenis}* ${judulJadwal(j)}`, `${tglPanjang(j.tanggal)}, ${jamTampil(j.jam)}`, j.store];
  (m?.isian || []).forEach(f => { if (f.slot !== 'k1' && j[f.slot]) baris.push(`${f.label}: ${satuan(f, j[f.slot])}`); });
  if (j.ket) baris.push(j.ket);
  return baris.join('\n');
}

export async function render(v, arg) {
  let data = ambilCache('jadwal');
  let mode = (() => { try { return localStorage.getItem(KUNCI_MODE) || 'bulan'; } catch { return 'bulan'; } })();
  let sel = iso();
  let y = parse(sel).getFullYear(), m = parse(sel).getMonth();
  let semuaPerlu = false;
  let filter = (() => { try { return JSON.parse(localStorage.getItem(KUNCI_FILTER) || '{}'); } catch { return {}; } })();
  const wadah = h('div', { class: 'stack' });
  v.append(wadah);

  const areaToko = s => S.master.toko.find(t => t.nama.toLowerCase() === String(s).toLowerCase())?.area || '';
  const lolos = j => (!filter.regional || j.region === filter.regional) && (!filter.area || areaToko(j.store) === filter.area)
    && (!filter.toko || j.store === filter.toko) && (!filter.jenis || j.jenis === filter.jenis) && (!filter.nama || j.nama === filter.nama);
  const terlihat = () => (data || []).filter(lolos);
  const jumlahFilter = () => Object.values(filter).filter(Boolean).length;

  async function muat() {
    if (!data) wadah.replaceChildren(memuat());
    try {
      data = await api('jadwal');
      simpanCache('jadwal', data);
      gambar();
    } catch (e) {
      if (!data) wadah.replaceChildren(kosong(e.message, 'Coba Lagi', muat));
      else toast(e.message);
    }
  }

  function perbarui(j, hapus) {
    data = (data || []).filter(x => x.id !== j.id);
    if (!hapus) data.push(j);
    data.sort((a, b) => (a.tanggal + a.jam).localeCompare(b.tanggal + b.jam));
    simpanCache('jadwal', data);
    gambar();
  }

  function sel2bulan() { const d = parse(sel); y = d.getFullYear(); m = d.getMonth(); }
  const awalMinggu = ds => geser(ds, -parse(ds).getDay());

  function sel_(ds) {
    if (!ds) return [];
    const isi = terlihat().filter(j => j.tanggal === ds);
    return isi.sort((a, b) => (a.status === 'Batal') - (b.status === 'Batal') || a.jam.localeCompare(b.jam));
  }

  function kalender() {
    const minggu = mode === 'minggu';
    const kini = iso();
    let sel_list;
    if (minggu) { const ws = awalMinggu(sel); sel_list = Array.from({ length: 7 }, (_, i) => geser(ws, i)); }
    else {
      const off = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate();
      sel_list = [...Array(off).fill(null), ...Array.from({ length: dim }, (_, i) => iso(new Date(y, m, i + 1)))];
    }
    const sel2 = sel_list.map(ds => {
      if (!ds) return h('span', { class: 'cal-d kosong' });
      const isi = sel_(ds);
      const urut = [];
      const lihat = new Set();
      isi.forEach(j => { if (!lihat.has(j.jenis)) { lihat.add(j.jenis); urut.push(j); } });
      isi.forEach(j => { if (!urut.includes(j)) urut.push(j); });
      const titik = (urut.length > 3 ? urut.slice(0, 2) : urut).map(j => h('i', { class: warnaJadwal(j.jenis) + (j.status === 'Batal' ? ' off' : '') }));
      const cls = ['cal-d', ds === kini ? 'today' : ds < kini ? 'past' : '', ds === sel ? 'sel' : ''].filter(Boolean).join(' ');
      return h('button', {
        type: 'button', class: cls, 'aria-label': tglPanjang(ds) + (isi.length ? ', ' + isi.length + ' jadwal' : ''), 'aria-pressed': String(ds === sel),
        onclick: () => { sel = ds; if (!minggu) sel2bulan(); gambar(); bukaHari(ds); }
      },
      h('span', { class: 'cal-n' }, String(parse(ds).getDate())),
      minggu ? h('span', { class: 'cal-evs' }, urut.slice(0, 9).map(j => h('span', { class: 'cal-ev ' + warnaJadwal(j.jenis) + (j.status === 'Batal' ? ' off' : '') }, judulJadwal(j))))
        : h('span', { class: 'cal-dots' }, titik, urut.length > 3 ? h('b', null, '+' + (urut.length - 2)) : null));
    });
    const judul = minggu ? `Minggu ${Math.floor((parse(sel).getDate() - 1 + new Date(parse(sel).getFullYear(), parse(sel).getMonth(), 1).getDay()) / 7) + 1}, ${BULAN[parse(sel).getMonth()]} ${parse(sel).getFullYear()}` : `${BULAN[m]} ${y}`;
    const geserKal = n => {
      if (minggu) { sel = geser(sel, 7 * n); sel2bulan(); }
      else { const d = new Date(y, m + n, 1); y = d.getFullYear(); m = d.getMonth(); }
      gambar();
    };
    const tampilHariIni = minggu ? awalMinggu(sel) !== awalMinggu(kini) : (y !== parse(kini).getFullYear() || m !== parse(kini).getMonth());
    return h('div', { class: 'card cal' },
      h('div', { class: 'cal-head' },
        h('button', { type: 'button', class: 'icon-btn flat', 'aria-label': minggu ? 'Minggu sebelumnya' : 'Bulan sebelumnya', onclick: () => geserKal(-1) }, icon('back')),
        h('b', null, judul),
        tampilHariIni ? h('button', { type: 'button', class: 'link', onclick: () => { sel = kini; sel2bulan(); gambar(); } }, 'Hari ini') : null,
        h('button', { type: 'button', class: 'icon-btn flat', 'aria-label': minggu ? 'Minggu berikutnya' : 'Bulan berikutnya', onclick: () => geserKal(1) }, icon('next'))),
      h('div', { class: 'cal-grid cal-w' }, HARI3.map(x => h('span', null, x))),
      h('div', { class: 'cal-grid' + (minggu ? ' minggu' : '') }, sel2));
  }

  function bukaHari(ds) {
    const isi = sel_(ds);
    const c = sheet({
      title: tglPanjang(ds),
      body: h('div', { class: 'stack-sm' }, ...(isi.length ? isi.map(j => kartuJadwal(j, () => { c.close(); detail(j); })) : [kosong('Belum ada jadwal di tanggal ini.')])),
      actions: [{ label: 'Daftar kegiatan', onClick: x => { x.close(); daftar(); } }, { label: 'Tambah', primary: true, onClick: x => { x.close(); form(null, ds); } }]
    });
  }

  function daftar() {
    let dy = y, dm = m;
    const isiEl = h('div', { class: 'stack' });
    const judulEl = h('b');
    const tulis = () => {
      const pre = `${dy}-${String(dm + 1).padStart(2, '0')}`;
      judulEl.textContent = `${BULAN[dm]} ${dy}`;
      const bln = terlihat().filter(j => j.tanggal.startsWith(pre));
      const kini = iso();
      const akan = bln.filter(j => j.tanggal >= kini), sudah = bln.filter(j => j.tanggal < kini).reverse();
      isiEl.replaceChildren(
        h('section', { class: 'section' }, h('h3', { class: 'h-sm' }, 'Akan dilaksanakan'), akan.length ? akan.map(j => kartuJadwal(j, () => detail(j))) : kosong('Tidak ada jadwal.')),
        h('section', { class: 'section' }, h('h3', { class: 'h-sm' }, 'Sudah dilaksanakan'), sudah.length ? sudah.map(j => kartuJadwal(j, () => detail(j))) : kosong('Tidak ada jadwal.')));
    };
    const pindah = n => { const d = new Date(dy, dm + n, 1); dy = d.getFullYear(); dm = d.getMonth(); tulis(); };
    tulis();
    sheet({
      title: 'Daftar kegiatan', full: true,
      body: h('div', { class: 'stack' }, h('div', { class: 'cal-head' }, h('button', { type: 'button', class: 'icon-btn flat', 'aria-label': 'Bulan sebelumnya', onclick: () => pindah(-1) }, icon('back')), judulEl, h('button', { type: 'button', class: 'icon-btn flat', 'aria-label': 'Bulan berikutnya', onclick: () => pindah(1) }, icon('next'))), isiEl)
    });
  }

  async function ubahStatus(j, status) {
    const ml = muatLayar('Menyimpan status');
    try { perbarui(await api('simpanJadwal', { item: { id: j.id, status } })); toast('Status: ' + status); }
    catch (e) { toast(e.message); }
    finally { ml.tutup(); }
  }

  function detail(j) {
    const mj = (S.master.jadwal || []).find(x => x.jenis === j.jenis);
    const baris = [['Toko', j.store]];
    (mj?.isian || []).forEach(f => {
      if (f.slot === 'k1' || !j[f.slot]) return;
      if (f.slot === 'wa') baris.push([f.label, h('a', { class: 'wa-link', href: 'https://wa.me/' + nomorWa(j.wa), target: '_blank', rel: 'noopener' }, j.wa, icon('chat'))]);
      else baris.push([f.label, satuan(f, j[f.slot])]);
    });
    if (j.ket) baris.push(['Keterangan', j.ket]);
    baris.push(['Dicatat oleh', j.nama || '-'], ['Terakhir diubah', j.diubah ? j.diubah.slice(0, 10).split('-').reverse().join('-') + ' ' + jamDari(j.diubah) : '-']);
    let c;
    const status = j.milik ? h('div', { class: 'status3', role: 'group', 'aria-label': 'Status jadwal' }, ['Terjadwal', 'Selesai', 'Batal'].map(s => h('button', {
      type: 'button', class: 'sbtn s-' + s.toLowerCase() + (j.status === s ? ' on' : ''), 'aria-pressed': String(j.status === s),
      onclick: async () => { if (s !== j.status) { c.close(); await ubahStatus(j, s); } }
    }, icon(s === 'Selesai' ? 'check' : s === 'Batal' ? 'x' : 'cal'), s))) : null;
    const aksi = [{ label: 'Bagikan', onClick: () => window.open('https://wa.me/?text=' + encodeURIComponent(teksBagikan(j)), '_blank', 'noopener') }];
    if (j.milik) aksi.push({ label: 'Ubah', primary: true, onClick: x => { x.close(); form(j); } });
    c = sheet({
      title: j.jenis,
      body: h('div', { class: 'stack' },
        h('div', { class: 'jhero ' + warnaJadwal(j.jenis) }, h('div', { class: 'chips' }, h('span', { class: 'pill jpill ' + warnaJadwal(j.jenis) }, j.jenis), chipStatusJadwal(j)), h('h3', null, judulJadwal(j)), h('p', null, `${tglPanjang(j.tanggal)}, ${jamTampil(j.jam)}`)),
        h('div', { class: 'card' }, baris.map(([k, val]) => h('div', { class: 'kv' }, h('span', null, k), h('b', null, val)))),
        status,
        j.milik ? h('button', {
          type: 'button', class: 'btn btn-danger btn-block', onclick: async () => {
            if (!(await konfirmasi('Hapus jadwal', `Hapus "${judulJadwal(j)}"?`, 'Hapus'))) return;
            c.close();
            const ml = muatLayar('Menghapus jadwal');
            try { await api('simpanJadwal', { item: { id: j.id, hapus: true } }); perbarui(j, true); toast('Jadwal dihapus'); }
            catch (e) { toast(e.message); }
            finally { ml.tutup(); }
          }
        }, icon('trash'), 'Hapus jadwal') : null),
      actions: aksi
    });
  }

  function form(j, tanggalAwal) {
    const mj = S.master.jadwal || [];
    const dipakai = mj.map(x => x.kode).filter(Boolean);
    const jenis = select([['', 'Pilih jenis'], ...mj.map(x => x.jenis)], j?.jenis || '');
    const kode = select([['', 'Pilih kegiatan'], ...S.master.kegiatan.filter(k => !dipakai.includes(k.kode)).map(k => [k.kode, k.nama])], j?.kode || '');
    const wadahKode = field('Kegiatan', kode);
    const tanggal = h('input', { type: 'date', value: j?.tanggal || tanggalAwal || sel });
    const jam = h('input', { type: 'time', value: j?.jam || '09:00' });
    const toko = pilihLainnya(S.master.toko.map(t => t.nama), j?.store || '', 120, 'Pilih toko');
    const ket = h('textarea', { maxlength: 300, rows: 3, value: j?.ket || '' });
    const isian = h('div', { class: 'stack' });
    let inputs = {};
    const tulisIsian = () => {
      const def = mj.find(x => x.jenis === jenis.value);
      wadahKode.hidden = !def || !!def.kode;
      inputs = {};
      isian.replaceChildren(...(def?.isian || []).map(f => {
        const inp = h('input', { maxlength: f.slot === 'wa' ? 30 : f.slot === 'pic' ? 60 : 140, value: j?.[f.slot] || '', type: f.slot === 'wa' ? 'tel' : 'text', inputmode: f.tipe === 'angka' ? 'numeric' : f.slot === 'wa' ? 'tel' : null });
        inputs[f.slot] = inp;
        return field(f.label, inp);
      }));
    };
    jenis.addEventListener('change', tulisIsian);
    tulisIsian();
    const err = h('p', { class: 'form-err', role: 'alert', hidden: true });
    sheet({
      title: j ? 'Ubah Jadwal' : 'Tambah Jadwal',
      body: h('div', { class: 'stack' }, field('Jenis', jenis), wadahKode, h('div', { class: 'grid-2' }, field('Tanggal', tanggal), field('Jam', jam)),
        h('div', { class: 'field' }, h('span', null, 'Nama toko'), toko.el), isian, field('Keterangan', ket), err),
      actions: [{
        label: 'Simpan', primary: true, onClick: async c => {
          const def = mj.find(x => x.jenis === jenis.value);
          if (!def) return tampilErr(err, 'Jenis wajib dipilih.');
          if (!def.kode && !kode.value) return tampilErr(err, 'Kegiatan wajib dipilih.');
          if (!tanggal.value || !jam.value) return tampilErr(err, 'Tanggal dan jam wajib diisi.');
          if (!toko.value) return tampilErr(err, 'Nama toko wajib diisi.');
          const pertama = def.isian[0];
          if (pertama && !inputs[pertama.slot].value.trim()) return tampilErr(err, pertama.label + ' wajib diisi.');
          const item = { jenis: def.jenis, kode: kode.value, tanggal: tanggal.value, jam: jam.value, store: toko.value, ket: ket.value.trim() };
          Object.entries(inputs).forEach(([k, inp]) => { item[k] = inp.value.trim(); });
          if (j) item.id = j.id;
          const ml = muatLayar('Menyimpan jadwal');
          try {
            const hasil = await api('simpanJadwal', { item });
            c.close();
            sel = hasil.tanggal;
            sel2bulan();
            perbarui(hasil);
            toast('Jadwal tersimpan');
          } catch (x) { tampilErr(err, x.message); }
          finally { ml.tutup(); }
        }
      }]
    });
  }

  function cari() {
    const q = h('input', { type: 'search', placeholder: 'Cari sekolah, toko, PIC', maxlength: 60, 'aria-label': 'Cari jadwal' });
    const hasil = h('div', { class: 'stack-sm' });
    let c;
    const tulis = () => {
      const t = q.value.trim().toLowerCase();
      const isi = t ? (data || []).filter(j => [j.jenis, j.k1, j.k2, j.pic, j.ket, j.store, j.nama].join(' ').toLowerCase().includes(t)).slice(0, 50) : [];
      hasil.replaceChildren(...(isi.length ? isi.map(j => kartuJadwal(j, () => { c.close(); detail(j); })) : t ? [kosong('Tidak ditemukan.')] : []));
    };
    q.addEventListener('input', tulis);
    c = sheet({ title: 'Cari jadwal', full: true, body: h('div', { class: 'stack' }, q, hasil) });
    if (window.matchMedia('(pointer: fine)').matches) q.focus();
  }

  function bukaFilter() {
    const nilai = { ...filter };
    const uniq = a => [...new Set(a.filter(Boolean))].sort();
    const pil = [];
    if (S.profil.status === 'Admin') pil.push(['regional', 'Regional', uniq(S.master.toko.map(t => t.region))]);
    pil.push(['area', 'Area', uniq(S.master.toko.map(t => t.area))], ['toko', 'Toko', uniq([...S.master.toko.map(t => t.nama), ...(data || []).map(j => j.store)])],
      ['jenis', 'Jenis', (S.master.jadwal || []).map(x => x.jenis)], ['nama', 'Pencatat', uniq((data || []).map(j => j.nama))]);
    const isi = pil.map(([k, label, opsi]) => {
      const s = select([['', 'Semua'], ...opsi], nilai[k] || '');
      s.addEventListener('change', () => { nilai[k] = s.value; });
      return field(label, s);
    });
    sheet({
      title: 'Filter', body: h('div', { class: 'stack' }, isi),
      actions: [
        { label: 'Reset', onClick: x => { filter = {}; simpan(); x.close(); gambar(); } },
        { label: 'Terapkan', primary: true, onClick: x => { filter = Object.fromEntries(Object.entries(nilai).filter(([, val]) => val)); simpan(); x.close(); gambar(); } }
      ]
    });
    function simpan() { try { localStorage.setItem(KUNCI_FILTER, JSON.stringify(filter)); } catch {} }
  }

  function kartuPerlu() {
    const daftarPerlu = terlihat().filter(j => perluUpdate(j) && j.milik).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    if (!daftarPerlu.length) return null;
    const tampil = semuaPerlu ? daftarPerlu : daftarPerlu.slice(0, 5);
    return h('section', { class: 'card perlu' },
      h('div', { class: 'sec-head' }, h('h3', { class: 'h-sm' }, 'Perlu update'), chip(String(daftarPerlu.length), 'yellow')),
      tampil.map(j => h('div', { class: 'perlu-row' },
        h('span', { class: 'perlu-dot ' + warnaJadwal(j.jenis) }),
        h('button', { type: 'button', class: 'perlu-isi', onclick: () => detail(j) }, h('b', null, judulJadwal(j)), h('small', null, `${tglPanjang(j.tanggal)} | ${j.store}`)),
        h('button', { type: 'button', class: 'qa ok', 'aria-label': 'Tandai selesai', onclick: () => ubahStatus(j, 'Selesai') }, icon('check')),
        h('button', { type: 'button', class: 'qa bad', 'aria-label': 'Tandai batal', onclick: () => ubahStatus(j, 'Batal') }, icon('x')))),
      daftarPerlu.length > tampil.length ? h('button', { type: 'button', class: 'link', onclick: () => { semuaPerlu = true; gambar(); } }, 'Tampilkan semua') : null);
  }

  function gambar() {
    if (!data) return;
    const jf = jumlahFilter();
    wadah.replaceChildren(...[
      h('div', { class: 'jad-bar' },
        seg([['bulan', 'Bulan'], ['minggu', 'Minggu']], mode, x => { mode = x; try { localStorage.setItem(KUNCI_MODE, x); } catch {} if (x === 'bulan') sel2bulan(); gambar(); }),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Cari', onclick: cari }, icon('search')),
        h('button', { type: 'button', class: 'icon-btn' + (jf ? ' dot' : ''), 'aria-label': jf ? `Filter (${jf} aktif)` : 'Filter', onclick: bukaFilter }, icon('filter'))),
      kalender(),
      h('div', { class: 'grid-2' },
        h('button', { type: 'button', class: 'btn', onclick: daftar }, icon('list'), 'Daftar kegiatan'),
        h('button', { type: 'button', class: 'btn btn-primary', onclick: () => form(null) }, icon('plus'), 'Tambah')),
      kartuPerlu()].filter(Boolean));
  }

  if (data) gambar();
  await muat();
  if (arg === 'input') form(null);
}
