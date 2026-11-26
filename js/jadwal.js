import { h, iso, tglPanjang, field, select, seg, sheet, toast, kosong, memuat, pilihLainnya } from './util.js';
import { S, api } from './api.js';
import { barisJadwal } from './home.js';

export async function render(v, arg) {
  let tab = arg === 'input' ? 'input' : 'list';
  let data = null;
  const wadah = h('div', { class: 'stack' });
  v.append(seg([['list', 'Akan Datang'], ['input', 'Input']], tab, t => { tab = t; gambar(); }), wadah);

  async function muat() {
    wadah.replaceChildren(memuat());
    try { data = await api('jadwal'); gambar(); }
    catch (e) { wadah.replaceChildren(kosong(e.message, 'Coba Lagi', muat)); }
  }

  function gambar() {
    if (tab === 'input') return wadah.replaceChildren(form());
    if (!data) return muat();
    const kini = data.filter(j => j.tanggal >= iso());
    if (!kini.length) return wadah.replaceChildren(kosong('Belum ada jadwal.', 'Tambah Jadwal', () => v.querySelectorAll('.seg-btn')[1].click()));
    const grup = {};
    kini.forEach(j => (grup[j.tanggal] ||= []).push(j));
    wadah.replaceChildren(...Object.keys(grup).map(t => h('section', { class: 'section' }, h('h3', { class: 'h-sm' }, tglPanjang(t)), grup[t].map(j => barisJadwal(j, j.milik ? () => ubah(j) : null)))));
  }

  function ubah(j) {
    let status = j.status;
    sheet({
      title: 'Status Jadwal',
      body: seg(['Belum dikonfirmasi', 'Terkonfirmasi', 'Batal'], status, s => { status = s; }, 'wrap'),
      actions: [
        { label: 'Hapus', danger: true, onClick: async x => { try { await api('simpanJadwal', { item: { id: j.id, hapus: true } }); x.close(); toast('Jadwal dihapus'); muat(); } catch (e) { toast(e.message); } } },
        { label: 'Simpan', primary: true, onClick: async x => { try { await api('simpanJadwal', { item: { id: j.id, status } }); x.close(); toast('Status tersimpan'); muat(); } catch (e) { toast(e.message); } } }
      ]
    });
  }

  function form() {
    const tanggal = h('input', { type: 'date', min: iso(), value: iso(), required: true });
    const jam = h('input', { type: 'time', value: '09:00', required: true });
    const jenis = select([['', 'Pilih jenis'], ...S.master.kegiatan.map(k => [k.kode, k.nama])], '', { required: true });
    const store = pilihLainnya(S.master.toko.map(t => t.nama), '', 80, 'Pilih store');
    const ket = h('input', { maxlength: 150 });
    const err = h('p', { class: 'form-err', role: 'alert', hidden: true });
    const btn = h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Simpan');
    return h('form', {
      class: 'card', onsubmit: async e => {
        e.preventDefault();
        err.hidden = true;
        if (!store.value) { err.textContent = 'Store wajib diisi.'; err.hidden = false; return; }
        btn.disabled = true;
        try {
          await api('simpanJadwal', { item: { tanggal: tanggal.value, jam: jam.value, jenis: jenis.value, store: store.value, keterangan: ket.value.trim() } });
          toast('Jadwal tersimpan');
          data = null;
          v.querySelectorAll('.seg-btn')[0].click();
        } catch (x) { err.textContent = x.message; err.hidden = false; }
        finally { btn.disabled = false; }
      }
    }, h('div', { class: 'grid-2' }, field('Tanggal', tanggal), field('Jam', jam)), field('Jenis kegiatan', jenis), h('div', { class: 'field' }, h('span', null, 'Store'), store.el), field('Keterangan', ket), err, btn);
  }

  gambar();
}
