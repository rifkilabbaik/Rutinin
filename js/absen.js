import { h, icon, kosong } from './util.js';
import { S } from './api.js';

export function render(v) {
  const link = S.master.linkAbsen || '';
  if (!/^https:\/\//.test(link)) {
    v.append(h('div', { class: 'pad' }, kosong('Link absen belum diatur.', 'Kembali', '#beranda')));
    return;
  }
  const frame = h('iframe', { src: link, title: 'Web absen', allow: 'camera; microphone; geolocation', referrerpolicy: 'no-referrer-when-downgrade' });
  v.append(h('div', { class: 'absen' },
    h('div', { class: 'absen-bar' },
      h('a', { class: 'icon-btn flat', href: '#beranda', 'aria-label': 'Tutup' }, icon('x')),
      h('b', null, 'Absen'),
      h('button', { type: 'button', class: 'icon-btn flat', 'aria-label': 'Muat ulang', onclick: () => { frame.src = link; } }, icon('refresh')),
      h('a', { class: 'icon-btn flat', href: link, target: '_blank', rel: 'noopener', 'aria-label': 'Buka di jendela baru' }, icon('ext'))),
    frame));
}
