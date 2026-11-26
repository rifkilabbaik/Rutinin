import { h, icon, field, select, toast, kosong } from './util.js';
import { S, sesi, api, muatMaster, profilLengkap } from './api.js';

function kepala() {
  return h('div', { class: 'auth-head' }, h('img', { src: 'icons/logo.svg', alt: '', width: 72, height: 72 }), h('h1', null, 'Rutin', h('span', { class: 'brand-in' }, 'in')));
}

function formAkun(tombol, kirim) {
  const nama = h('input', { name: 'nama', autocomplete: 'username', maxlength: 60, required: true });
  const pw = h('input', { name: 'password', type: 'password', autocomplete: tombol === 'Masuk' ? 'current-password' : 'new-password', minlength: 6, maxlength: 64, required: true });
  const err = h('p', { class: 'form-err', role: 'alert', hidden: true });
  const btn = h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, tombol);
  const form = h('form', {
    class: 'card', onsubmit: async e => {
      e.preventDefault();
      err.hidden = true;
      btn.disabled = true;
      try { await kirim(nama.value.trim(), pw.value, form); }
      catch (x) { err.textContent = x.message; err.hidden = false; }
      finally { btn.disabled = false; }
    }
  }, field('Nama', nama), field('Password', pw), err, btn);
  return form;
}

export function masuk(v) {
  v.append(h('div', { class: 'auth-box' }, kepala(),
    formAkun('Masuk', async (nama, password) => {
      const r = await api('masuk', { nama, password });
      sesi.set(r.token);
      S.profil = r.profil;
      await muatMaster();
      location.hash = profilLengkap() ? 'beranda' : 'lengkapi';
    }),
    h('a', { class: 'btn btn-block', href: '#daftar' }, 'Daftar')));
}

export function daftar(v) {
  const box = h('div', { class: 'auth-box' }, kepala());
  box.append(formAkun('Daftar', async (nama, password, form) => {
    const r = await api('daftar', { nama, password });
    form.replaceWith(h('div', { class: 'card center' }, h('span', { class: 'big-ic tone-mint' }, icon('check')), h('p', { class: 'lead' }, r.pesan)));
    box.querySelector('a.btn').textContent = 'Masuk';
  }), h('a', { class: 'btn btn-block', href: '#masuk' }, 'Sudah punya akun'));
  v.append(box);
}

export function formDataDiri(onTersimpan, tombol = 'Simpan') {
  const pil = S.master.pilihan;
  const p = S.profil || {};
  if (!pil.region.length || !pil.jabatan.length || !pil.atasan.length || !pil.unit.length) {
    return kosong('Pilihan data diri belum diisi admin.', 'Muat Ulang', async () => { await muatMaster(); location.reload(); });
  }
  const region = select([['', 'Pilih region'], ...pil.region], p.region || '');
  const jabatan = select([['', 'Pilih jabatan'], ...pil.jabatan], p.jabatan || '');
  const unit = select([['', 'Pilih unit kerja'], ...pil.unit], p.unit || '');
  const dipilih = new Set(p.atasan || []);
  const atasan = h('div', { class: 'chips' }, pil.atasan.map(a => {
    const b = h('button', { type: 'button', class: 'chip-btn' + (dipilih.has(a) ? ' on' : ''), 'aria-pressed': String(dipilih.has(a)) }, a);
    b.addEventListener('click', () => {
      dipilih.has(a) ? dipilih.delete(a) : dipilih.add(a);
      b.classList.toggle('on', dipilih.has(a));
      b.setAttribute('aria-pressed', String(dipilih.has(a)));
    });
    return b;
  }));
  const err = h('p', { class: 'form-err', role: 'alert', hidden: true });
  const btn = h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, tombol);
  return h('form', {
    class: 'card', onsubmit: async e => {
      e.preventDefault();
      err.hidden = true;
      const kurang = !region.value ? 'Region' : !jabatan.value ? 'Jabatan' : !dipilih.size ? 'Atasan' : !unit.value ? 'Unit Kerja' : '';
      if (kurang) { err.textContent = kurang + ' wajib dipilih.'; err.hidden = false; return; }
      btn.disabled = true;
      try {
        S.profil = await api('simpanProfil', { region: region.value, jabatan: jabatan.value, atasan: [...dipilih], unit: unit.value });
        await muatMaster();
        toast('Data diri tersimpan');
        onTersimpan?.();
      } catch (x) { err.textContent = x.message; err.hidden = false; }
      finally { btn.disabled = false; }
    }
  }, field('Region', region), field('Jabatan', jabatan), h('div', { class: 'field' }, h('span', null, 'Atasan'), atasan), field('Unit Kerja', unit), err, btn);
}

export function lengkapi(v) {
  v.append(h('div', { class: 'auth-box' }, h('div', { class: 'greet' }, h('h2', null, 'Halo, ' + S.profil.nama.split(' ')[0]), h('p', { class: 'muted' }, 'Lengkapi data diri')),
    formDataDiri(() => { location.hash = 'beranda'; }, 'Lanjut')));
}
