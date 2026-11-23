// AI lokal lewat CPU (wllama / llama.cpp WebAssembly): Qwen2.5 1.5B. Tidak memakai GPU, jadi tidak membuat browser crash.
import { getSettings, saveSettings, getKamus } from './store.js';
import { toast } from './util.js';

const MODEL = { repo: 'Qwen/Qwen2.5-1.5B-Instruct-GGUF', file: 'qwen2.5-1.5b-instruct-q4_k_m.gguf' };
const GUARD = 'rutinin.ai.loading';
let W, ready, queue = Promise.resolve();

const errMsg = e => (e && (e.message || e.reason || e.toString?.())) || 'tidak diketahui';

async function lib() {
  const mod = await import(new URL('../vendor/wllama/index.js', import.meta.url).href);
  return mod.Wllama;
}
async function instance() {
  if (!W) { const Wllama = await lib(); W = new Wllama({ default: new URL('../vendor/wllama/wllama.wasm', import.meta.url).href }, { allowOffline: true }); }
  return W;
}

export async function isCached() {
  try { const w = await instance(); return (await w.cacheManager.list()).some(e => e.name.includes(MODEL.file)); } catch { return false; }
}
export const isLoaded = () => !!W?.isModelLoaded?.();

// Pengaman: kalau aplikasi tertutup paksa saat memuat model, AI dimatikan otomatis
export async function checkCrashGuard() {
  if (localStorage.getItem(GUARD)) {
    localStorage.removeItem(GUARD);
    await saveSettings({ ai: { enabled: false, crashed: true } });
    toast('AI dimatikan: HP kehabisan memori saat memuat AI', 5000);
  }
}

export function load(onProgress) {
  return ready ||= (async () => {
    const w = await instance();
    localStorage.setItem(GUARD, '1');
    try {
      await w.loadModelFromHF(MODEL, {
        n_ctx: 2048, n_batch: 256, n_gpu_layers: 0, useCache: true,
        progressCallback: ({ loaded, total }) => onProgress?.(total ? loaded / total : 0),
      });
    } finally { localStorage.removeItem(GUARD); }
    return w;
  })().catch(e => { ready = null; throw new Error(errMsg(e)); });
}
export async function removeModel() {
  const w = await instance();
  try { await w.exit(); } catch {}
  W = null; ready = null;
  try { await (await instance()).cacheManager.deleteMany(e => e.name.includes(MODEL.file)); } catch {}
}

const toLines = t => String(t || '').split('\n').map(x => x.replace(/^\s*([-•*]|\d+[.)])\s*/, '').replace(/\*\*/g, '').trim()).filter(Boolean);
const ST = { done: 'selesai', progress: 'dalam progress', not: 'belum tercapai' };

async function chat(prompt, max) {
  const kamus = Object.entries(await getKamus()).filter(([, v]) => v.arti).map(([k, v]) => `${k} = ${v.arti}`).slice(0, 30).join('; ');
  const sys = 'Kamu asisten penulis agenda dan laporan kerja harian karyawan Sedjati Group. Tulis dalam Bahasa Indonesia baku, singkat, jelas, profesional. Jangan mengarang angka atau fakta. Jawab hanya poin-poin, satu poin per baris, tanpa pembuka atau penutup.' + (kamus ? ` Istilah: ${kamus}.` : '');
  const r = await W.createChatCompletion({ messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }], max_tokens: max, temperature: 0.3, top_p: 0.9 });
  return r.choices?.[0]?.message?.content || '';
}
const describe = m => [
  ...m.kpi.map(k => `- ${k.title}: ${ST[k.status]}${k.realisasi ? `; realisasi: ${k.realisasi}` : ''}${k.kendala ? `; kendala: ${k.kendala}` : ''}`),
  ...m.decisions.map(d => `- Keputusan ${d.status === 'pending' ? 'menunggu' : 'sudah diambil'}: ${d.what}`),
].join('\n');

const TASKS = {
  details: ({ title, examples }) => chat(`Kegiatan: "${title}".${examples?.length ? `\nContoh rincian kegiatan serupa sebelumnya:\n${examples.join('\n')}` : ''}\nTulis 3 sampai 4 rincian langkah kerja, setiap poin diawali kata kerja.`, 120).then(t => toLines(t).slice(0, 4)),
  summary: m => chat(`Data laporan hari ini:\n${describe(m)}\n\nTulis Executive Summary maksimal 5 poin.`, 160).then(t => toLines(t).slice(0, 5)),
  refleksi: m => chat(`Data laporan hari ini:\n${describe(m)}\n\nJawab tepat 5 baris sesuai urutan, masing-masing satu kalimat:\n1. Pencapaian terbaik?\n2. Kendala terbesar?\n3. Pembelajaran?\n4. Prioritas berikutnya?\n5. Usulan perbaikan bagi unit/sistem/perusahaan?`, 220).then(t => { const l = toLines(t); return l.length >= 5 ? l.slice(0, 5) : null; }),
  meaning: ({ word, context }) => chat(`Dalam kalimat "${context}", singkatan "${word}" kemungkinan besar kepanjangannya apa? Jawab hanya kepanjangannya saja.`, 24).then(t => toLines(t)[0]?.replace(/[."]+$/g, '') || ''),
};

// Jalankan tugas AI di belakang layar (antre satu per satu). Hasil null bila AI tidak aktif/gagal.
export async function run(task, input) {
  const s = await getSettings();
  if (!s.ai?.enabled) return null;
  const job = queue.then(async () => { await load(); return TASKS[task](input); });
  queue = job.catch(() => {});
  try { return await job; } catch (e) { console.warn('AI', e); toast('AI gagal: ' + errMsg(e), 4000); return null; }
}
export const enabled = async () => !!(await getSettings()).ai?.enabled;
