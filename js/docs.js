// Menyusun isi dokumen sesuai STANDAR FORMAT AGENDA KERJA & LAPORAN KERJA — Sedjati Group
import { esc, tglPanjang, tgl, tglFile, jam, menit, sentence } from './util.js';
import { STATUS, KPI } from './store.js';

export const REFLEKSI_Q = [
  'Apa pencapaian terbaik pada periode ini?',
  'Apa kendala terbesar yang dihadapi?',
  'Apa pembelajaran yang diperoleh?',
  'Apa prioritas utama pada periode berikutnya?',
  'Apa usulan perbaikan bagi unit, sistem, atau perusahaan?',
];

const TITLE = { agenda: 'AGENDA KERJA', laporan: 'LAPORAN KERJA' };
export const pdfName = (kind, date) => `${kind === 'agenda' ? 'Agenda Kerja' : 'Laporan Kerja'} - ${tglFile(date)}.pdf`;

// Teks yang disalin untuk caption Telegram (sama persis dengan format contoh)
export function caption(kind, s, day) {
  const p = l => l.padEnd(16, ' ');
  let out = `${TITLE[kind]}\nSEDJATI GROUP\n${p('Nama')}: ${s.nama}\n${p('Jabatan')}: ${s.jabatan}\n${p('Atasan')}: ${s.atasan}\n${p('Unit Kerja')}: ${s.unit}\n${p('Periode')}: Harian\n${p('Tanggal')}: ${tglPanjang(day.date)}`;
  if (day.type !== 'kerja') out += `\n\n${day.off}`;
  return out;
}

const el = (html, cls = 'blk', data = {}) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; Object.assign(d.dataset, data); return d; };
const sec = t => el(`<h3>${esc(t)}</h3>`, 'blk d-sec', { keep: 'next' });
const sub = t => el(`<div class="d-sub">${t}</div>`, 'blk', { keep: 'next' });
const dash = t => el(`<p class="dash">${esc(t)}</p>`);
const kv = rows => `<table>${rows.filter(Boolean).map(([k, v]) => `<tr><td>${esc(k)}</td><td>:</td><td>${v}</td></tr>`).join('')}</table>`;

function head(kind, s, date) {
  return [
    el(`<h1>${TITLE[kind]}</h1><h2>SEDJATI GROUP</h2>`, 'blk d-title'),
    el(`<div class="d-head">${kv([['Nama', esc(s.nama)], ['Jabatan', esc(s.jabatan)], ['Atasan', esc(s.atasan)], ['Unit Kerja', esc(s.unit)], ['Periode', 'Harian'], ['Tanggal', esc(tglPanjang(date))]])}</div>`),
  ];
}

let tk = 0;
function table(cols, rows) {
  const key = 't' + (++tk);
  const cg = `<colgroup>${cols.map(c => `<col style="width:${c.w}">`).join('')}</colgroup>`;
  const h = el(`<table class="t">${cg}<thead><tr>${cols.map(c => `<th>${esc(c.t)}</th>`).join('')}</tr></thead></table>`, 'tbl', { th: key, keep: 'next' });
  return [h, ...rows.map(r => el(`<table class="t rowt">${cg}<tbody><tr>${r.map(c => `<td>${c}</td>`).join('')}</tr></tbody></table>`, 'tbl', { thead: key }))];
}
const st = k => STATUS[k] ? `${STATUS[k].e} ${STATUS[k].l}` : '-';
const stCell = k => STATUS[k] ? `${STATUS[k].e}<br>${STATUS[k].l}` : '-';

export const sortItems = items => [...items].sort((a, b) => menit(a.start) - menit(b.start));

// ---------- AGENDA ----------
export function agendaBlocks(s, day, { openItems = [], decisions = [] } = {}) {
  const a = day.agenda;
  const B = [...head('agenda', s, day.date)];
  const items = sortItems(a.items);

  B.push(sec('A. PRIORITAS'));
  const prio = items.filter(i => i.star);
  if (!prio.length) B.push(dash('-'));
  prio.forEach((p, i) => B.push(el(`<p>${i + 1}. ${p.label || '🎯'} ${esc(p.title)} — <b>Target selesai:</b> ${esc(tgl(p.target || day.date))}</p>`)));

  B.push(sec('B. AGENDA / PEKERJAAN UTAMA'));
  B.push(sub('⏱️ Timeline'));
  for (const it of items) {
    const time = `<div class="d-time">${jam(it.start)} – ${jam(it.end)}</div>`;
    if (it.kind === 'tetap') B.push(el(`${time}<ul><li>${esc(sentence(it.title))}</li></ul>`, 'blk tl-blk tetap'));
    else B.push(el(`${time}<p class="d-act">${esc(it.title)}</p>${it.details?.length ? `<ul>${it.details.map(d => `<li>${esc(sentence(d))}</li>`).join('')}</ul>` : ''}`, 'blk tl-blk'));
  }
  B.push(sub('📋 Pekerjaan Pendukung'));
  if (a.pendukung?.length) B.push(el(`<ul>${a.pendukung.map(p => `<li>${esc(sentence(p))}</li>`).join('')}</ul>`));
  else B.push(dash('-'));

  B.push(sec('C. OPEN ITEM'));
  if (!openItems.length) B.push(dash('Tidak ada Open Item.'));
  openItems.forEach(o => B.push(el(`<div class="oi">${kv([
    ['Case ID', `<b>${esc(o.caseId)}</b>`], ['Deskripsi', esc(sentence(o.desc))], ['Referensi', esc(o.ref || '-')],
    ['PIC', esc((o.pic || []).join(', ') || s.nama)], ['Target Penyelesaian', esc(tgl(o.target))], ['Status', st(o.status)],
  ])}</div>`)));

  B.push(sec('D. NEED SUPPORT'));
  if (!a.support?.length) B.push(dash('Tidak ada dukungan yang dibutuhkan.'));
  else B.push(...table([{ t: 'Dukungan', w: '62%' }, { t: 'PIC', w: '38%' }], a.support.map(x => [esc(x.what), esc(x.pic)])));

  B.push(sec('E. NEED DECISION'));
  if (!decisions.length) B.push(dash('Tidak ada keputusan yang dibutuhkan.'));
  decisions.forEach(d => B.push(el(`<div class="oi">${kv([
    ['Keputusan dibutuhkan', `<b>${esc(sentence(d.what))}</b>`], d.reason && ['Alasan / Dampak', esc(sentence(d.reason))], d.options && ['Opsi diajukan', esc(d.options)],
  ])}</div>`)));
  return B;
}

// ---------- LAPORAN ----------
// m: { summary[], kpi[{title,caseId,target,realisasi,status}], problem[{caseId,desc,ref,progress,kendala,pic,target,status}], support[{what,pic,reason}], decisions[], refleksi[5], photos[{url,caption}] }
export function laporanBlocks(s, day, m) {
  const B = [...head('laporan', s, day.date)];

  B.push(sec('A. EXECUTIVE SUMMARY'));
  if (m.summary.length) B.push(el(`<ul>${m.summary.slice(0, 5).map(x => `<li>${esc(sentence(x))}</li>`).join('')}</ul>`));
  else B.push(dash('-'));

  B.push(sec('B. KPI / PROGRESS'));
  if (!m.kpi.length) B.push(dash('-'));
  else {
    B.push(...table([{ t: 'Pekerjaan', w: '34%' }, { t: 'Target', w: '22%' }, { t: 'Realisasi', w: '28%' }, { t: 'Status', w: '16%' }],
      m.kpi.map(k => [`${esc(k.title)}${k.caseId ? `<br><small style="color:#8a7f78">${esc(k.caseId)}</small>` : ''}`, esc(k.target), esc(k.realisasi), `${KPI[k.status]?.e || ''}<br>${KPI[k.status]?.l || ''}`])));
    B.push(el(`<div class="legend">🟩 Tercapai &nbsp; 🟨 Dalam Progress &nbsp; 🟥 Belum Tercapai</div>`));
  }

  B.push(sec('C. PROBLEM LOG / OPEN ITEM'));
  if (!m.problem.length) B.push(dash('Tidak ada Open Item.'));
  else B.push(...table([
    { t: 'Case ID', w: '13%' }, { t: 'Deskripsi', w: '17%' }, { t: 'Referensi', w: '10%' }, { t: 'Progress Hari Ini', w: '16%' },
    { t: 'Kendala', w: '13%' }, { t: 'PIC', w: '10%' }, { t: 'Target', w: '8%' }, { t: 'Status', w: '13%' }],
    m.problem.map(p => [`<b>${esc(p.caseId).replace('/', '/<wbr>')}</b>`, esc(p.desc), esc(p.ref || '-'), esc(p.progress || '-'), esc(p.kendala || '-'), esc(p.pic || '-'), esc(p.targetShort || '-'), stCell(p.status)])));

  B.push(sec('D. NEED SUPPORT'));
  if (!m.support.length) B.push(dash('Tidak ada dukungan yang dibutuhkan.'));
  else B.push(...table([{ t: 'Dukungan yang Dibutuhkan', w: '38%' }, { t: 'PIC / Unit', w: '24%' }, { t: 'Alasan', w: '38%' }], m.support.map(x => [esc(x.what), esc(x.pic), esc(x.reason || '-')])));

  B.push(sec('E. NEED DECISION'));
  if (!m.decisions.length) B.push(dash('Tidak ada keputusan yang dibutuhkan.'));
  m.decisions.forEach(d => B.push(el(`<div class="oi">${kv([
    ['Keputusan dibutuhkan', `<b>${esc(sentence(d.what))}</b>`], ['Alasan', esc(sentence(d.reason || '-'))],
    d.status === 'pending' && ['Dampak bila belum diambil', esc(sentence(d.impact || '-'))], d.options && ['Opsi diajukan', esc(d.options)],
    ['Status', d.status === 'decided' ? `🟩 Sudah diputuskan${d.answer ? ': ' + esc(d.answer) : ''}` : '🟨 Menunggu keputusan'],
  ])}</div>`)));

  B.push(sec('F. REFLEKSI'));
  REFLEKSI_Q.forEach((q, i) => B.push(el(`<div class="qa"><p class="qq">${i + 1}. ${esc(q)}</p><p class="aa">${esc(sentence(m.refleksi[i] || '-'))}</p></div>`)));

  if (m.photos?.length) {
    B.push(sec('LAMPIRAN DOKUMENTASI'));
    for (let i = 0; i < m.photos.length; i += 2) {
      B.push(el(`<div class="ph-row">${m.photos.slice(i, i + 2).map(p => `<figure><img src="${p.url}"><figcaption>${esc(p.caption)}</figcaption></figure>`).join('')}</div>`, 'blk'));
    }
  }
  return B;
}

// ---------- LIBUR / CUTI / SAKIT ----------
export function offBlocks(kind, s, day) {
  return [...head(kind, s, day.date), el(`<div class="off"><b>${esc(day.off)}</b>${day.note ? `<p>${esc(day.note)}</p>` : ''}</div>`)];
}
