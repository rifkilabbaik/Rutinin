// AI lokal (opsional): Qwen2.5 1.5B lewat WebLLM + WebGPU. Diunduh sekali, lalu jalan di HP tanpa internet.
import { $, toast, sheet } from './util.js';
import { getSettings } from './store.js';

const LIB = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.87/+esm';
const MODELS = { f16: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', f32: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC' };
let lib, engine, loading;

export async function support() {
  if (!('gpu' in navigator)) return { ok: false, reason: 'Browser belum mendukung WebGPU. Perbarui Chrome ke versi terbaru.' };
  try {
    const a = await navigator.gpu.requestAdapter();
    if (!a) return { ok: false, reason: 'GPU HP tidak bisa dipakai oleh browser.' };
    return { ok: true, f16: a.features.has('shader-f16') };
  } catch (e) { return { ok: false, reason: e.message }; }
}
const getLib = async () => lib ||= await import(LIB);
export async function modelId() { const s = await support(); return s.f16 ? MODELS.f16 : MODELS.f32; }
export async function isCached() { try { return await (await getLib()).hasModelInCache(await modelId()); } catch { return false; } }
export const isLoaded = () => !!engine;

export function load(onProgress) {
  if (engine) return Promise.resolve(engine);
  return loading ||= (async () => {
    const l = await getLib();
    const id = await modelId();
    const worker = new Worker(new URL('./llm-worker.js', import.meta.url), { type: 'module' });
    engine = await l.CreateWebWorkerMLCEngine(worker, id, { initProgressCallback: r => onProgress?.(r) });
    return engine;
  })().catch(e => { loading = null; throw e; });
}
export async function removeModel() {
  const l = await getLib();
  try { await engine?.unload?.(); } catch {}
  engine = null; loading = null;
  await l.deleteModelAllInfoInCache(await modelId());
}

const SYS = 'Kamu asisten penulis agenda dan laporan kerja harian karyawan Sedjati Group. Tulis dalam Bahasa Indonesia baku yang singkat, jelas, dan profesional. Jangan mengarang fakta yang tidak ada di data. Jawab hanya dengan poin-poin, satu poin per baris, tanpa kalimat pembuka atau penutup.';
async function chat(user, max = 320, sys = SYS) {
  const r = await engine.chat.completions.create({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], temperature: 0.3, max_tokens: max });
  return (r.choices[0].message.content || '').trim();
}
const toLines = t => t.split('\n').map(x => x.replace(/^\s*([-•*]|\d+[.)])\s*/, '').replace(/\*\*/g, '').trim()).filter(Boolean);
const ST = { done: 'selesai', progress: 'dalam progress', not: 'belum tercapai' };
const describe = m => [
  ...m.kpi.map(k => `- ${k.title}: ${ST[k.status]}${k.realisasi ? `; realisasi: ${k.realisasi}` : ''}${k.kendala ? `; kendala: ${k.kendala}` : ''}`),
  ...m.problem.map(p => `- Open Item ${p.caseId} (${p.desc}): ${p.progress}`),
  ...m.decisions.map(d => `- Keputusan ${d.status === 'pending' ? 'menunggu' : 'sudah diambil'}: ${d.what}`),
].join('\n');

const api = {
  async expandDetails(title, existing = []) {
    return toLines(await chat(`Kegiatan di agenda kerja: "${title}".${existing.length ? `\nRincian saat ini:\n${existing.join('\n')}` : ''}\nTulis 3 sampai 5 rincian langkah kerja untuk kegiatan ini. Setiap poin diawali kata kerja.`)).slice(0, 5);
  },
  async summary(m) {
    return toLines(await chat(`Data laporan kerja hari ini:\n${describe(m)}\n\nTulis Executive Summary maksimal 5 poin.`)).slice(0, 5);
  },
  async refleksi(m) {
    const out = toLines(await chat(`Data laporan kerja hari ini:\n${describe(m)}\n\nJawab 5 pertanyaan refleksi ini, tepat 5 baris sesuai urutan, masing-masing satu kalimat:\n1. Apa pencapaian terbaik?\n2. Apa kendala terbesar?\n3. Apa pembelajaran yang diperoleh?\n4. Apa prioritas utama berikutnya?\n5. Apa usulan perbaikan bagi unit, sistem, atau perusahaan?`, 420));
    return out.length >= 5 ? out.slice(0, 5) : null;
  },
};

const busy = (title, extra = '') => sheet({ title, dismissible: false, html: `<div class="loading"><div class="dots"><i></i><i></i><i></i></div><span id="aip">${extra}</span><div class="progress" style="width:100%"><i id="aib"></i></div></div>` });

// Pembungkus: cek aktif → muat model (dengan progres) → jalankan
export async function withAI(fn) {
  const s = await getSettings();
  if (!s.ai?.enabled) {
    sheet({
      title: 'AI lokal belum aktif',
      html: '<p class="muted">AI berjalan langsung di HP: tanpa API dan tanpa internet setelah diunduh. Model diunduh sekali (±1 GB) di Pengaturan → AI lokal.</p><p class="muted">Tanpa AI pun, tombol <b>Isi otomatis</b> tetap menyusun isi secara instan.</p>',
      actions: [{ label: 'Nanti', onClick: x => x.close() }, { label: 'Buka Pengaturan', primary: true, onClick: x => { x.close(); location.hash = '#/pengaturan'; } }],
    });
    return null;
  }
  let sh;
  try {
    if (!engine) {
      sh = busy('Menyiapkan AI lokal', 'Memuat model…');
      await load(r => { const p = $('#aip'); if (p) p.textContent = (r.text || '').slice(0, 90); const b = $('#aib'); if (b) b.style.width = Math.round((r.progress || 0) * 100) + '%'; });
      sh.close();
    }
    sh = busy('AI sedang menulis…');
    const out = await fn(api);
    sh.close();
    if (!out?.length) toast('AI tidak memberi jawaban, coba lagi');
    return out;
  } catch (e) {
    sh?.close(); console.error(e); toast('AI gagal: ' + e.message, 5000); return null;
  }
}
