// Penyusun otomatis berbasis aturan + memori (instan, tanpa internet, format selalu benar)
import { sentence } from './util.js';

const lc = s => (/^[A-Z]{2,}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
export const lcFirst = lc;

const RULES = [
  { re: /^(diskusi|meeting|rapat|koordinasi|briefing|sharing)\b/i, fn: (o, w, who) => [
    `${w} ${who ? `bersama ${who} ` : ''}mengenai ${o}`, `Membahas target dan kebutuhan ${o}`, 'Menentukan prioritas kegiatan dan tindak lanjut', `Mencatat hasil ${lc(w)} dan tindak lanjut`] },
  { re: /^(follow\s*up|followup|fu|konfirmasi|hubungi|menghubungi|telepon|telpon)\b/i, fn: o => [
    `Follow up kembali ${o}`, `Mengonfirmasi tindak lanjut dengan ${o}`, `Memperbarui data dan status ${o}`] },
  { re: /^(input|entry|entri|update|rekap|merekap|mendata|pendataan)\b/i, fn: (o, w) => [
    `${w} ${o}`, 'Memeriksa kelengkapan dan kebenaran data', 'Memastikan seluruh data telah diperbarui'] },
  { re: /^(review|evaluasi|cek|pengecekan|monitoring|memantau|pantau|audit)\b/i, fn: (o, w) => [
    `${w} ${o}`, 'Mencatat temuan dan hal yang perlu diperbaiki', 'Update status Open Item terkait'] },
  { re: /^(persiapan|menyiapkan|siapkan|prepare|setting|setup)\b/i, fn: o => [
    `Menyiapkan kebutuhan ${o}`, 'Checklist perlengkapan, materi, dan peserta', 'Koordinasi dengan pihak terkait'] },
  { re: /^(kunjungan|visit|survey|survei|observasi|canvassing|kanvas)\b/i, fn: o => [
    `Kunjungan ke ${o}`, 'Dokumentasi kegiatan di lokasi', 'Mencatat hasil kunjungan dan tindak lanjut'] },
  { re: /^(event|pelaksanaan|acara|fld|aktivasi|activation|booth|pameran)\b/i, fn: (o, w, who, t) => [
    `Pelaksanaan ${/^(event|acara|fld)/i.test(w) ? t : o}`, 'Koordinasi tim, peserta, dan perlengkapan', 'Dokumentasi kegiatan', 'Mencatat hasil dan evaluasi kegiatan'] },
  { re: /^(penyusunan|menyusun|susun|membuat|pembuatan|buat|desain|design|finalisasi|merapikan|draft|draf)\b/i, fn: (o, w) => [
    `${/^final/i.test(w) ? 'Finalisasi' : 'Menyusun'} ${o}`, 'Merapikan dan memeriksa hasil', 'Menyimpan hasil sebagai bahan koordinasi dengan atasan'] },
  { re: /^(training|pelatihan|coaching|sosialisasi|edukasi)\b/i, fn: (o, w) => [
    `${w} ${o}`, 'Menyampaikan materi dan sesi tanya jawab', 'Mencatat hasil dan tindak lanjut'] },
];

export function suggestDetails(title) {
  const t = String(title || '').trim();
  if (!t) return [];
  let who = '';
  const m = t.match(/\s(?:bersama|dengan|bareng)\s+(.+)$/i);
  const core = m ? t.slice(0, m.index).trim() : t;
  if (m) who = m[1].trim();
  for (const r of RULES) {
    const mm = core.match(r.re);
    if (mm) {
      const w = mm[0].replace(/\s+/g, ' ');
      const W = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      const o = core.slice(mm[0].length).trim() || core;
      return r.fn(o, /^fu$/i.test(w) ? 'Follow up' : W, who, core).map(sentence);
    }
  }
  return [sentence(t), 'Mencatat hasil dan tindak lanjut.'];
}

export const realisasiDefault = st => ({ done: 'Selesai', progress: 'Dalam progress', not: 'Belum dikerjakan' }[st] || '-');
export const progressDefault = st => ({ done: 'Selesai', progress: 'Dalam progress', not: 'Belum ada progress' }[st] || '-');

// Executive Summary (maks 5 poin)
export function draftSummary({ kpi, closed = 0, decisions = [] }) {
  const out = [];
  const total = kpi.length, done = kpi.filter(k => k.status === 'done').length;
  if (total) out.push(`${done} dari ${total} pekerjaan selesai (${Math.round(done / total * 100)}%)`);
  for (const k of [...kpi.filter(k => k.star), ...kpi.filter(k => !k.star && k.kind === 'kerja')]) {
    if (out.length >= 3) break;
    out.push(k.status === 'done' ? `${k.title} selesai` : k.status === 'progress' ? `${k.title} masih dalam progress` : `${k.title} belum tercapai${k.kendala ? ` (${lc(k.kendala)})` : ''}`);
  }
  if (closed) out.push(`${closed} Open Item berhasil ditutup`);
  const pend = decisions.filter(d => d.status === 'pending').length;
  if (pend) out.push(`${pend} keputusan menunggu persetujuan`);
  return out.slice(0, 5).map(sentence);
}

// Draf Refleksi (5 jawaban)
export function draftRefleksi({ kpi, problem = [], nextTitles = [], lastUsulan = '' }) {
  const best = kpi.find(k => k.star && k.status === 'done') || kpi.find(k => k.status === 'done');
  const kend = kpi.find(k => k.kendala)?.kendala || problem.find(p => p.kendala && p.kendala !== '-')?.kendala;
  const notDone = kpi.filter(k => k.status !== 'done');
  return [
    best ? `Menyelesaikan ${lc(best.title)}` : 'Menjalankan agenda kerja sesuai timeline',
    kend || 'Tidak ada kendala berarti',
    notDone.length ? `Perlu alokasi waktu yang lebih realistis dan follow up lebih awal untuk ${lc(notDone[0].title)}` : 'Timeline yang jelas membantu seluruh agenda selesai tepat waktu',
    nextTitles.length ? `Menyelesaikan ${nextTitles.slice(0, 2).map(t => lc(String(t).replace(/[.\s]+$/, ''))).join(' dan ')}` : 'Menjalankan agenda kerja berikutnya sesuai prioritas',
    lastUsulan || '-',
  ].map(sentence);
}

// ---------- Jenis kegiatan otomatis ----------
export function guessKind(title, mem, routine = []) {
  const t = String(title || '').toLowerCase();
  const r = routine.find(x => x.title.toLowerCase() === t);
  if (r) return r.kind;
  if (/^(sholat|shalat|salat|istirahat|ishoma|makan siang|break)\b/.test(t)) return 'tetap';
  return mem?.kind || 'kerja';
}

// ---------- Realisasi otomatis (riwayat dulu, lalu aturan) ----------
const REAL = [
  [/^(follow\s*up|fu|konfirmasi|hubungi|menghubungi)\b/i, o => ({ done: `${o} sudah di-follow up dan memberi konfirmasi`, progress: `${o} sudah dihubungi, menunggu jawaban`, not: `${o} belum berhasil dihubungi` })],
  [/^(diskusi|meeting|rapat|koordinasi|briefing)\b/i, () => ({ done: 'Diskusi selesai, hasil dan tindak lanjut dicatat', progress: 'Diskusi berjalan, dilanjutkan berikutnya', not: 'Diskusi belum terlaksana' })],
  [/^(input|entry|entri|update|rekap|merekap|mendata)\b/i, () => ({ done: 'Seluruh data sudah terinput', progress: 'Sebagian data sudah terinput', not: 'Data belum diinput' })],
  [/^(review|evaluasi|cek|monitoring|memantau|audit)\b/i, () => ({ done: 'Review selesai, temuan dicatat', progress: 'Review berjalan sebagian', not: 'Review belum dilakukan' })],
  [/^(persiapan|menyiapkan|siapkan|prepare)\b/i, () => ({ done: 'Persiapan selesai', progress: 'Persiapan berjalan sebagian', not: 'Persiapan belum dimulai' })],
  [/^(kunjungan|visit|survey|survei)\b/i, () => ({ done: 'Kunjungan terlaksana dan terdokumentasi', progress: 'Kunjungan berjalan sebagian', not: 'Kunjungan belum terlaksana' })],
  [/^(event|pelaksanaan|acara|fld|aktivasi)\b/i, () => ({ done: 'Kegiatan terlaksana sesuai rencana', progress: 'Kegiatan berjalan sebagian', not: 'Kegiatan belum terlaksana' })],
  [/^(penyusunan|menyusun|membuat|pembuatan|desain|finalisasi|merapikan|draft)\b/i, () => ({ done: 'Selesai disusun dan dirapikan', progress: 'Sebagian sudah disusun', not: 'Belum mulai disusun' })],
];
export function suggestRealisasi(title, status, mem) {
  if (!status) return '';
  if (mem?.real?.[status]) return mem.real[status];
  const t = String(title || '').trim();
  for (const [re, fn] of REAL) { const m = t.match(re); if (m) return fn(t.slice(m[0].length).trim() || t)[status]; }
  return { done: 'Selesai sesuai rencana', progress: 'Sebagian selesai, dilanjutkan', not: 'Belum dikerjakan' }[status];
}

// ---------- Kata/singkatan yang belum dikenal ----------
export const KAMUS_DASAR = {
  TK: 'Taman Kanak-kanak', SD: 'Sekolah Dasar', SMP: 'Sekolah Menengah Pertama', SMA: 'Sekolah Menengah Atas', SMK: 'Sekolah Menengah Kejuruan',
  KPI: 'Key Performance Indicator', OKR: 'Objectives and Key Results', PIC: 'Person in Charge', QA: 'Quality Assurance', HR: 'Human Resources',
  IT: 'Information Technology', PDF: 'PDF', CS: 'Customer Service', SOP: 'Standard Operating Procedure', PO: 'Purchase Order', ATK: 'Alat Tulis Kantor',
  UMKM: 'Usaha Mikro, Kecil, dan Menengah', GM: 'General Manager', RM: 'Regional Manager', SPV: 'Supervisor', OK: 'OK', HP: 'Handphone', WA: 'WhatsApp',
};
export function unknownWords(texts, kamus = {}) {
  const out = new Set();
  for (const t of texts) for (const w of String(t || '').match(/\b[A-Z][A-Z0-9]{1,6}\b/g) || []) {
    if (!/[A-Z]{2}/.test(w) || KAMUS_DASAR[w] || kamus[w]) continue;
    out.add(w);
  }
  return [...out];
}
