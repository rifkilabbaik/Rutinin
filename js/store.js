// Data tingkat aplikasi: pengaturan, memori jawaban, hari, open item, keputusan
import { db } from './db.js';
import { norm, uid, clone } from './util.js';

export const STATUS = {
  planned: { e: '🟦', l: 'Planned' },
  progress: { e: '🟨', l: 'In Progress' },
  done: { e: '🟩', l: 'Completed' },
  delegated: { e: '🟪', l: 'Delegated' },
  hold: { e: '⬜', l: 'On Hold' },
  cancelled: { e: '🟥', l: 'Cancelled' },
};
export const FINAL = ['done', 'delegated', 'cancelled'];
export const KPI = { done: { e: '🟩', l: 'Tercapai' }, progress: { e: '🟨', l: 'Dalam Progress' }, not: { e: '🟥', l: 'Belum Tercapai' } };
export const OFF_TYPES = ['Day Off', 'Cuti', 'Sakit', 'Izin'];
export const REFS = ['Program Kerja', 'Instruksi Atasan', 'Problem Log', 'Notulen Meeting', 'KPI', 'OKR', 'Business Blueprint', 'Audit QA', 'Surat Edaran'];

const DEFAULT_SETTINGS = {
  nama: '', jabatan: '', atasan: '', unit: '',
  casePrefix: 'MCED-RR', caseStart: 1,
  links: { absen: '' },
  scriptUrl: '', pin: '', sheetUrl: '',
  routine: [
    { start: '12:00', end: '12:30', title: 'Sholat Dzuhur', kind: 'tetap', details: [] },
    { start: '12:30', end: '13:30', title: 'Istirahat', kind: 'tetap', details: [] },
  ],
  ai: { enabled: false },
};

// ---------- Pengaturan ----------
let settingsCache;
export async function getSettings() {
  if (settingsCache) return settingsCache;
  const s = (await db.get('kv', 'settings')) || {};
  settingsCache = { ...clone(DEFAULT_SETTINGS), ...s, links: { ...DEFAULT_SETTINGS.links, ...(s.links || {}) }, ai: { ...DEFAULT_SETTINGS.ai, ...(s.ai || {}) } };
  return settingsCache;
}
export async function saveSettings(patch) {
  const s = { ...(await getSettings()), ...patch };
  settingsCache = s;
  await db.put('kv', s, 'settings');
  return s;
}
export const profileReady = s => !!(s.nama && s.jabatan);

// ---------- Memori (jawaban tersimpan untuk dipilih lagi) ----------
async function getMem() { return (await db.get('kv', 'memory')) || { titles: {}, lists: {} }; }
async function putMem(m) { await db.put('kv', m, 'memory'); }

export async function memList(name, defaults = []) {
  const m = await getMem();
  return [...new Set([...(m.lists[name] || []), ...defaults])];
}
export async function remember(name, values) {
  const vals = [].concat(values).map(v => String(v || '').trim()).filter(Boolean);
  if (!vals.length) return;
  const m = await getMem();
  const cur = m.lists[name] || [];
  m.lists[name] = [...new Set([...vals, ...cur])].slice(0, 40);
  await putMem(m);
}
export async function forget(name, value) {
  const m = await getMem();
  m.lists[name] = (m.lists[name] || []).filter(v => v !== value);
  await putMem(m);
}
// Ingat kegiatan: rincian, jenis, referensi, PIC, dukungan
export async function rememberTitle(it) {
  const key = norm(it.title); if (!key) return;
  const m = await getMem();
  const prev = m.titles[key] || { count: 0 };
  m.titles[key] = {
    title: prev.title || it.title, details: it.details?.length ? it.details : prev.details || [], kind: it.kind || prev.kind,
    ref: it.ref || prev.ref || '', pics: it.pics?.length ? it.pics : prev.pics || [],
    support: it.support === undefined ? prev.support || null : it.support, desc: it.desc || prev.desc || '',
    real: { ...(prev.real || {}), ...(it.real || {}) }, kendala: it.kendala || prev.kendala || '',
    count: (prev.count || 0) + (it.real ? 0 : 1), last: Date.now(),
  };
  await putMem(m);
}
export async function titleMemory() { return (await getMem()).titles; }
// Peta jawaban (mis. alasan dukungan per dukungan, dampak per keputusan)
export async function memMap(name) { return (await getMem()).maps?.[name] || {}; }
export async function rememberMap(name, entries) {
  const m = await getMem(); m.maps ||= {}; const cur = m.maps[name] ||= {};
  for (const [k, v] of entries) if (norm(k) && String(v || '').trim()) cur[norm(k)] = String(v).trim();
  await putMem(m);
}

// ---------- Kamus (kata/singkatan baru) ----------
export async function getKamus() { return (await db.get('kv', 'kamus')) || {}; }
export async function saveKamus(entries) {
  const k = await getKamus();
  for (const [w, arti] of entries) k[w] = { arti: String(arti || '').trim(), at: Date.now() };
  await db.put('kv', k, 'kamus'); await markDirty();
}

// ---------- Antrean unggah ke Drive ----------
export async function queueUpload(u) {
  const ex = await db.get('uploads', u.id);
  if (ex?.status === 'done' && u.kind === 'photo') return; // foto yang sudah terunggah tidak diulang
  await db.put('uploads', { status: 'pending', at: Date.now(), ...u }); window.dispatchEvent(new Event('rutinin:dirty'));
}
export const allUploads = () => db.all('uploads');
export const saveUpload = u => db.put('uploads', u);
export async function lookupTitle(title) {
  const key = norm(title); if (!key) return null;
  const t = (await getMem()).titles;
  if (t[key]) return t[key];
  // cari yang paling mirip (kata yang sama)
  const words = new Set(key.split(' '));
  let best = null, score = 0;
  for (const [k, v] of Object.entries(t)) {
    const w = k.split(' ');
    const inter = w.filter(x => words.has(x)).length;
    const s = inter / new Set([...w, ...words]).size;
    if (s > score) { score = s; best = v; }
  }
  return score >= 0.6 ? best : null;
}
export async function titleSuggestions() {
  const t = (await getMem()).titles;
  return Object.values(t).sort((a, b) => b.count - a.count || b.last - a.last).map(v => v.title).slice(0, 60);
}

// ---------- Hari ----------
export async function getDay(date) {
  return (await db.get('days', date)) || { date, type: 'kerja', off: '', note: '', agenda: null, laporan: null };
}
export async function saveDay(day) {
  day.updatedAt = Date.now();
  await db.put('days', day);
  await markDirty(day.date);
}
export const allDays = () => db.all('days');

// ---------- Open Item ----------
export const allOpenItems = () => db.all('openItems');
export const getOpenItem = id => db.get('openItems', id);
export async function saveOpenItem(oi) { oi.updatedAt = Date.now(); await db.put('openItems', oi); await markDirty(); }
export async function deleteOpenItem(id) { await db.del('openItems', id); await markDirty(); }
// Open item yang masih berjalan per tanggal (dibuat ≤ tanggal & belum berstatus akhir)
export async function activeOpenItems(date) {
  const all = await allOpenItems();
  return all.filter(o => o.created <= date && !FINAL.includes(o.status)).sort((a, b) => a.caseId.localeCompare(b.caseId));
}
export async function nextCaseId(date) {
  const s = await getSettings();
  const year = date.slice(0, 4);
  const pre = `${s.casePrefix}/${year}-`;
  const nums = (await allOpenItems()).filter(o => o.caseId.startsWith(pre)).map(o => parseInt(o.caseId.slice(pre.length), 10) || 0);
  const n = Math.max(nums.length ? Math.max(...nums) + 1 : 1, +s.caseStart || 1);
  return pre + String(n).padStart(3, '0');
}

// ---------- Keputusan (Need Decision) ----------
export async function allDecisions() { return (await db.get('kv', 'decisions')) || []; }
export async function saveDecisions(list) { await db.put('kv', list, 'decisions'); await markDirty(); }
export async function pendingDecisions(date) {
  return (await allDecisions()).filter(d => d.status === 'pending' && d.created <= date);
}
export function newDecision(date, what = '') { return { id: uid(), created: date, what, reason: '', impact: '', options: '', status: 'pending', answer: '', decidedDate: '' }; }

// ---------- Foto ----------
export async function savePhoto(blob, meta = {}) { const id = uid(); await db.put('photos', { id, blob, ...meta, at: Date.now() }); return id; }
export const getPhoto = id => db.get('photos', id);
export const deletePhoto = id => db.del('photos', id);

// ---------- Penanda sinkron ----------
export async function markDirty(date) {
  const d = (await db.get('kv', 'dirty')) || { dates: [], all: false };
  if (date && !d.dates.includes(date)) d.dates.push(date);
  d.all = true;
  await db.put('kv', d, 'dirty');
  window.dispatchEvent(new Event('rutinin:dirty'));
}

// ---------- Status ringkas per hari ----------
export function dayState(day) {
  if (day.type !== 'kerja') return { agenda: 'off', laporan: 'off' };
  const a = !day.agenda ? 'none' : day.agenda.sentAt ? 'sent' : day.agenda.final ? 'ready' : 'draft';
  const l = !day.laporan ? 'none' : day.laporan.sentAt ? 'sent' : day.laporan.final ? 'ready' : 'draft';
  return { agenda: a, laporan: l };
}
