// Sinkron ke Google Spreadsheet lewat Apps Script (data tetap tersimpan di HP dulu)
import { db } from './db.js';
import { getSettings, allDays, allOpenItems, allDecisions } from './store.js';

let running = null;

async function call(s, body) {
  const r = await fetch(s.scriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ pin: s.pin, ...body }) });
  const j = await r.json().catch(() => ({ ok: false, error: 'Balasan Apps Script tidak valid (cek deploy: akses "Anyone")' }));
  if (!j.ok) throw new Error(j.error || 'Gagal');
  return j;
}

export async function status() {
  const s = await getSettings();
  if (!s.scriptUrl) return { text: 'Belum dihubungkan · atur di Pengaturan', ok: false };
  const last = await db.get('kv', 'lastSync');
  const dirty = (await db.get('kv', 'dirty')) || { dates: [] };
  if (dirty.dates.length) return { text: `${dirty.dates.length} hari menunggu sinkron`, ok: false };
  return { text: last ? `Tersinkron ${new Date(last).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Belum pernah sinkron', ok: true };
}

export function flush(force = false) { return running ||= run(force).finally(() => { running = null; }); }

async function run(force) {
  const s = await getSettings();
  if (!s.scriptUrl) return { ok: false, error: 'URL Apps Script belum diatur' };
  if (!navigator.onLine) return { ok: false, error: 'Sedang offline' };
  const dirty = (await db.get('kv', 'dirty')) || { dates: [], all: false };
  if (!force && !dirty.dates.length && !dirty.all) return { ok: true, skipped: true };
  const days = (await allDays()).filter(d => force || dirty.dates.includes(d.date));
  const sent = Object.fromEntries(days.map(d => [d.date, d.updatedAt]));
  try {
    await call(s, { action: 'save', profile: { nama: s.nama, jabatan: s.jabatan, unit: s.unit }, days, openItems: await allOpenItems(), decisions: await allDecisions() });
  } catch (e) { return { ok: false, error: e.message }; }
  // hapus penanda hanya untuk data yang tidak berubah selama proses kirim
  const now = (await db.get('kv', 'dirty')) || { dates: [], all: false };
  const fresh = await allDays();
  now.dates = now.dates.filter(dt => { const d = fresh.find(x => x.date === dt); return !d || !(dt in sent) || d.updatedAt !== sent[dt]; });
  now.all = now.dates.length > 0;
  await db.put('kv', now, 'dirty');
  await db.put('kv', Date.now(), 'lastSync');
  return { ok: true };
}

export async function ping() {
  const s = await getSettings();
  if (!s.scriptUrl) throw new Error('URL Apps Script belum diatur');
  return call(s, { action: 'ping' });
}

// Pulihkan data dari Spreadsheet (mis. setelah ganti HP / hapus data browser)
export async function restore() {
  const s = await getSettings();
  const j = await call(s, { action: 'restore' });
  let n = 0;
  for (const d of j.days || []) {
    const local = await db.get('days', d.date);
    if (!local || (d.updatedAt || 0) > (local.updatedAt || 0)) { await db.put('days', d); n++; }
  }
  for (const o of j.openItems || []) {
    const local = await db.get('openItems', o.caseId);
    if (!local || (o.updatedAt || 0) > (local.updatedAt || 0)) await db.put('openItems', o);
  }
  if (j.decisions?.length) {
    const cur = (await db.get('kv', 'decisions')) || [];
    const map = new Map(cur.map(d => [d.id, d]));
    j.decisions.forEach(d => { if (!map.has(d.id)) map.set(d.id, d); });
    await db.put('kv', [...map.values()], 'decisions');
  }
  return n;
}
