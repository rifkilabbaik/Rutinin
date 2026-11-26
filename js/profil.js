import { h, icon, chip, seg, field, toast, konfirmasi, dariMenit, menit, jamTampil } from './util.js';
import { S, sesi, api, muatMaster } from './api.js';
import { formDataDiri } from './auth.js';
import { db } from './db.js';

const KUNCI_JAM = 'rutinin.jam';

export function jamSetelan() {
  try { return JSON.parse(localStorage.getItem(KUNCI_JAM) || 'null') || { mode: 'default', mulai: '08:00' }; }
  catch { return { mode: 'default', mulai: '08:00' }; }
}

export function simpanJamSetelan(j) {
  try { localStorage.setItem(KUNCI_JAM, JSON.stringify(j)); } catch {}
}

const kv = (k, v) => h('div', { class: 'kv' }, h('span', null, k), h('b', null, v || '-'));

export function profil(v) {
  const p = S.profil;
  v.append(
    h('div', { class: 'card center' },
      h('span', { class: 'avatar lg' }, p.nama.charAt(0).toUpperCase()),
      h('h2', { class: 'h' }, p.nama),
      h('div', { class: 'chips center' }, chip('Kode ' + p.kode, 'orange'), chip(p.status, p.status === 'Admin' ? 'purple' : 'blue'))),
    h('div', { class: 'card' }, kv('Region', p.region), kv('Jabatan', p.jabatan), kv('Atasan', p.atasan.join(', ')), kv('Unit Kerja', p.unit)),
    h('a', { class: 'btn btn-block', href: '#pengaturan' }, icon('edit'), 'Ubah Data Diri'));
}

export function pengaturan(v) {
  const j = jamSetelan();
  const mulai = h('input', { type: 'time', value: j.mulai, 'aria-label': 'Jam mulai' });
  const info = h('p', { class: 'muted small' });
  const wadahMulai = h('div', { class: 'stack-sm', hidden: j.mode !== 'custom' }, field('Jam mulai', mulai), info);
  const tulisInfo = () => { info.textContent = 'Selesai ' + dariMenit(menit(mulai.value || '08:00') + 540).replace(':', '.'); };
  tulisInfo();
  const simpanJam = () => { simpanJamSetelan({ mode: j.mode, mulai: mulai.value || '08:00' }); toast('Jam kerja tersimpan'); };
  mulai.addEventListener('change', () => { tulisInfo(); simpanJam(); });

  v.append(
    h('section', { class: 'section' }, h('h3', { class: 'h' }, 'Data Diri'), formDataDiri(() => { location.hash = 'profil'; })),
    h('section', { class: 'section' }, h('h3', { class: 'h' }, 'Jam Kerja'),
      h('div', { class: 'card' },
        seg([['default', 'Default'], ['custom', 'Custom 9 jam']], j.mode, m => { j.mode = m; wadahMulai.hidden = m !== 'custom'; simpanJam(); }),
        h('p', { class: 'muted small' }, 'Default: ' + S.master.jamKerja.map(x => `${x.hari.length > 1 ? x.hari[0] + ' - ' + x.hari[x.hari.length - 1] : x.hari[0]} ${jamTampil(x.mulai)} - ${jamTampil(x.selesai)}`).join(', ')),
        wadahMulai)),
    h('section', { class: 'section' }, h('h3', { class: 'h' }, 'Data'),
      h('button', {
        class: 'btn btn-block', type: 'button', onclick: async e => {
          const b = e.currentTarget;
          b.disabled = true;
          try { await muatMaster(); toast('Data diperbarui'); } catch (x) { toast(x.message); }
          finally { b.disabled = false; }
        }
      }, icon('refresh'), 'Muat Ulang Data'),
      h('button', {
        class: 'btn btn-block btn-danger', type: 'button', onclick: async () => {
          if (!(await konfirmasi('Keluar', 'Keluar dari akun ini?', 'Keluar'))) return;
          try { await api('keluar'); } catch {}
          sesi.hapus();
          await db.clear('days').catch(() => {});
          location.hash = 'masuk';
        }
      }, icon('out'), 'Keluar')));
}
