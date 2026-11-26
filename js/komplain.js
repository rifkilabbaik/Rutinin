import { h, kosong, memuat } from './util.js';
import { api } from './api.js';
import { barisKomplain } from './home.js';

export async function render(v) {
  const cari = h('input', { type: 'search', placeholder: 'Cari store atau kategori', 'aria-label': 'Cari komplain', maxlength: 60 });
  const wadah = h('div', { class: 'section' }, memuat());
  v.append(cari, wadah);
  let data = [];
  const gambar = () => {
    const q = cari.value.trim().toLowerCase();
    const isi = data.filter(k => !q || [k.store, k.kategori, k.media, k.detail, k.status].join(' ').toLowerCase().includes(q));
    wadah.replaceChildren(...(isi.length ? isi.map(barisKomplain) : [kosong(q ? 'Tidak ada yang cocok.' : 'Belum ada komplain.')]));
  };
  cari.addEventListener('input', gambar);
  const muat = async () => {
    wadah.replaceChildren(memuat());
    try { data = await api('komplain'); gambar(); }
    catch (e) { wadah.replaceChildren(kosong(e.message, 'Coba Lagi', muat)); }
  };
  muat();
}
