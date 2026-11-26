import { h, icon, field, select, seg, sheet, chip, kosong, memuat, iso, parse, BULAN, toast, geser, seksi } from './util.js';
import { S, api, simpanCache, ambilCache } from './api.js';
import { barisKomplain } from './home.js';

const tutup = k => /close|selesai|done/i.test(k.status || '');
const blnGeser = (b, n) => { const d = new Date(Number(b.slice(0, 4)), Number(b.slice(5, 7)) - 1 + n, 1); return iso(d).slice(0, 7); };
const namaBln = b => `${BULAN[Number(b.slice(5, 7)) - 1]} ${b.slice(0, 4)}`;
const hitung = (arr, kunci) => { const o = {}; arr.forEach(k => { const v = kunci(k) || 'Lainnya'; o[v] = (o[v] || 0) + 1; }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
const terbanyak = arr => hitung(arr, k => k.kategori)[0]?.[0] || '-';

function hbar(daftar) {
  const maks = Math.max(1, ...daftar.map(x => x[1]));
  return h('div', { class: 'hbars' }, daftar.map(([nama, n]) => h('div', { class: 'hbar' },
    h('span', { class: 'hbar-nama' }, nama), h('span', { class: 'hbar-isi' }, h('span', { class: 'hbar-fill', style: { width: Math.max(4, n / maks * 100) + '%' } })), h('b', null, String(n)))));
}

function daftarSheet(judul, list) {
  const q = h('input', { type: 'search', placeholder: 'Cari', maxlength: 60, 'aria-label': 'Cari komplain' });
  const isi = h('div', { class: 'stack-sm' });
  const tulis = () => {
    const t = q.value.trim().toLowerCase();
    const x = list.filter(k => !t || [k.store, k.kategori, k.media, k.detail, k.status].join(' ').toLowerCase().includes(t));
    isi.replaceChildren(...(x.length ? x.slice(0, 200).map(barisKomplain) : [kosong('Tidak ada komplain.')]));
  };
  q.addEventListener('input', tulis);
  tulis();
  sheet({ title: judul, full: true, body: h('div', { class: 'stack' }, q, isi) });
}

export async function render(v) {
  let data = ambilCache('komplain');
  let bln = iso().slice(0, 7);
  let filter = {};
  let mode = 'harian';
  let pilihBar = null;
  const wadah = h('div', { class: 'stack' }, data ? [] : memuat());
  v.append(wadah);
  const admin = S.profil.status === 'Admin';

  const muat = async () => {
    try { data = await api('komplain'); simpanCache('komplain', data); gambar(); }
    catch (e) { if (!data) wadah.replaceChildren(kosong(e.message, 'Coba Lagi', muat)); else toast(e.message); }
  };

  const lolos = k => (!filter.regional || k.regional === filter.regional) && (!filter.area || k.area === filter.area)
    && (!filter.toko || k.store === filter.toko) && (!filter.kategori || k.kategori === filter.kategori)
    && (!filter.status || (tutup(k) ? 'Closed' : 'Follow Up') === filter.status);

  function bukaFilter() {
    const nilai = { ...filter };
    const uniq = k => [...new Set(data.map(x => x[k]).filter(Boolean))].sort();
    const pil = [...(admin ? [['regional', 'Regional', uniq('regional')]] : []), ['area', 'Area', uniq('area')], ['toko', 'Toko', uniq('store')], ['kategori', 'Kategori', uniq('kategori')], ['status', 'Status', ['Follow Up', 'Closed']]];
    sheet({
      title: 'Filter',
      body: h('div', { class: 'stack' }, pil.map(([k, label, opsi]) => { const s = select([['', 'Semua'], ...opsi], nilai[k] || ''); s.addEventListener('change', () => { nilai[k] = s.value; }); return field(label, s); })),
      actions: [
        { label: 'Reset', onClick: x => { filter = {}; x.close(); gambar(); } },
        { label: 'Terapkan', primary: true, onClick: x => { filter = Object.fromEntries(Object.entries(nilai).filter(([, val]) => val)); x.close(); gambar(); } }
      ]
    });
  }

  function tren(semua) {
    let item = [];
    if (mode === 'harian') {
      const dim = new Date(Number(bln.slice(0, 4)), Number(bln.slice(5, 7)), 0).getDate();
      item = Array.from({ length: dim }, (_, i) => { const t = `${bln}-${String(i + 1).padStart(2, '0')}`; return { label: String(i + 1), judul: t.split('-').reverse().join('-'), n: semua.filter(k => k.tanggal === t).length }; });
    } else if (mode === 'mingguan') {
      const akhir = bln === iso().slice(0, 7) ? iso() : iso(new Date(Number(bln.slice(0, 4)), Number(bln.slice(5, 7)), 0));
      const mulaiMinggu = geser(akhir, -parse(akhir).getDay());
      item = Array.from({ length: 8 }, (_, i) => {
        const a = geser(mulaiMinggu, -7 * (7 - i)), b = geser(a, 6);
        return { label: a.slice(8, 10) + '/' + a.slice(5, 7), judul: `${a.split('-').reverse().join('-')} sampai ${b.split('-').reverse().join('-')}`, n: semua.filter(k => k.tanggal >= a && k.tanggal <= b).length };
      });
    } else {
      item = Array.from({ length: 6 }, (_, i) => { const b = blnGeser(bln, i - 5); return { label: BULAN[Number(b.slice(5, 7)) - 1].slice(0, 3), judul: namaBln(b), n: semua.filter(k => k.tanggal.startsWith(b)).length }; });
    }
    const maks = Math.max(1, ...item.map(x => x.n));
    const catatan = h('p', { class: 'muted small' }, pilihBar !== null && item[pilihBar] ? `${item[pilihBar].judul}: ${item[pilihBar].n} komplain` : `Total ${item.reduce((a, x) => a + x.n, 0)} komplain`);
    return h('div', { class: 'card' },
      h('h3', { class: 'h-sm' }, 'Tren komplain'),
      seg([['harian', 'Harian'], ['mingguan', 'Mingguan'], ['bulanan', 'Bulanan']], mode, x => { mode = x; pilihBar = null; gambar(); }),
      h('div', { class: 'bars' }, item.map((x, i) => h('button', { type: 'button', class: 'bar' + (i === pilihBar ? ' on' : ''), 'aria-label': `${x.judul}: ${x.n}`, style: { height: Math.max(3, x.n / maks * 100) + '%' }, onclick: () => { pilihBar = i; gambar(); } }))),
      h('div', { class: 'bar-label' }, item.map((x, i) => h('span', null, mode !== 'harian' || i % 5 === 0 || i === item.length - 1 ? x.label : ''))),
      catatan);
  }

  function peringkat(list, kunci, onPilih) {
    const grup = {};
    list.forEach(k => { const v = k[kunci] || '-'; (grup[v] ||= []).push(k); });
    const urut = Object.entries(grup).sort((a, b) => b[1].length - a[1].length).slice(0, 20);
    if (!urut.length) return kosong('Tidak ada komplain.');
    return h('div', { class: 'stack-sm' }, urut.map(([nama, arr], i) => h('button', { type: 'button', class: 'row', onclick: () => onPilih(nama, arr) },
      h('span', { class: 'badge tone-peach' }, String(i + 1)),
      h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, nama), h('span', { class: 'row-sub' }, 'Terbanyak: ' + terbanyak(arr))),
      h('b', { class: 'rank-n' }, String(arr.length)))));
  }

  function gambar() {
    if (!data) return;
    const semua = data.filter(lolos);
    const ini = semua.filter(k => k.tanggal.startsWith(bln));
    const lalu = semua.filter(k => k.tanggal.startsWith(blnGeser(bln, -1)));
    const selisih = lalu.length ? Math.round((ini.length - lalu.length) / lalu.length * 100) : null;
    const buka = semua.filter(k => !tutup(k)).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    const jf = Object.values(filter).filter(Boolean).length;
    const blnAwal = blnGeser(iso().slice(0, 7), -5);
    wadah.replaceChildren(
      h('div', { class: 'jad-bar' },
        h('div', { class: 'bln-nav' },
          h('button', { type: 'button', class: 'icon-btn flat', 'aria-label': 'Bulan sebelumnya', disabled: bln <= blnAwal, onclick: () => { bln = blnGeser(bln, -1); pilihBar = null; gambar(); } }, icon('back')),
          h('b', null, namaBln(bln)),
          h('button', { type: 'button', class: 'icon-btn flat', 'aria-label': 'Bulan berikutnya', disabled: bln >= iso().slice(0, 7), onclick: () => { bln = blnGeser(bln, 1); pilihBar = null; gambar(); } }, icon('next'))),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Cari komplain', onclick: () => daftarSheet('Semua komplain', semua) }, icon('search')),
        h('button', { type: 'button', class: 'icon-btn' + (jf ? ' dot' : ''), 'aria-label': jf ? `Filter (${jf} aktif)` : 'Filter', onclick: bukaFilter }, icon('filter'))),
      h('div', { class: 'hero' },
        h('div', { class: 'hero-label' }, 'Komplain ' + namaBln(bln)),
        h('div', { class: 'hero-value' }, String(ini.length)),
        h('div', { class: 'chips' }, selisih === null ? chip('Bulan lalu tidak ada data', 'gray') : chip(`${selisih > 0 ? '+' : ''}${selisih}% dari bulan lalu`, selisih > 0 ? 'red' : selisih < 0 ? 'green' : 'gray'), chip(`${buka.length} masih Follow Up`, buka.length ? 'yellow' : 'green'))),
      seksi('Masih Follow Up', buka.length ? [...buka.slice(0, 5).map(barisKomplain), buka.length > 5 ? h('button', { type: 'button', class: 'btn btn-block', onclick: () => daftarSheet('Masih Follow Up', buka) }, 'Lihat semua') : null] : kosong('Tidak ada komplain yang masih Follow Up.')),
      tren(semua),
      h('div', { class: 'card' }, h('h3', { class: 'h-sm' }, 'Per kategori'), ini.length ? hbar(hitung(ini, k => k.kategori)) : kosong('Tidak ada komplain.')),
      h('div', { class: 'card' }, h('h3', { class: 'h-sm' }, 'Masuk lewat'), ini.length ? hbar(hitung(ini, k => k.media)) : kosong('Tidak ada komplain.')),
      seksi(admin ? 'Per regional' : 'Per area', peringkat(ini, admin ? 'regional' : 'area', nama => { filter[admin ? 'regional' : 'area'] = nama; gambar(); })),
      seksi('Per toko', peringkat(ini, 'store', (nama, arr) => daftarSheet(nama, arr))));
  }

  if (data) gambar();
  muat();
}
