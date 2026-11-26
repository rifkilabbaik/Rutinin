import { CONFIG } from './config.js';

const KUNCI_TOKEN = 'rutinin.token';
const KUNCI_MASTER = 'rutinin.master';

export const S = { profil: null, master: null, oi: [], segar: false };

export const sesi = {
  get token() { try { return localStorage.getItem(KUNCI_TOKEN) || ''; } catch { return ''; } },
  set(t) { try { localStorage.setItem(KUNCI_TOKEN, t); } catch {} },
  hapus() {
    try { Object.keys(localStorage).filter(k => k.startsWith('rutinin.')).forEach(k => localStorage.removeItem(k)); } catch {}
    S.profil = null; S.master = null; S.oi = [];
  }
};

export async function api(action, data = {}) {
  let res;
  try {
    res = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...data, action, token: sesi.token })
    });
  } catch {
    throw new Error('Tidak ada koneksi internet.');
  }
  let out;
  try { out = await res.json(); } catch { throw new Error('Server tidak merespons.'); }
  if (!out.ok) {
    if (out.kode === 'SESI') { sesi.hapus(); location.hash = 'masuk'; }
    throw new Error(out.pesan || 'Terjadi kesalahan.');
  }
  return out.data;
}

export function pasangMaster(m) {
  S.master = m;
  S.profil = m.profil;
  S.segar = true;
  try { localStorage.setItem(KUNCI_MASTER, JSON.stringify(m)); } catch {}
}

export function simpanCache(k, data) {
  try { localStorage.setItem('rutinin.c.' + k, JSON.stringify(data)); } catch {}
}

export function ambilCache(k) {
  try { return JSON.parse(localStorage.getItem('rutinin.c.' + k) || 'null'); } catch { return null; }
}

export async function muatMaster() {
  const m = await api('master');
  S.segar = true;
  S.master = m;
  S.profil = m.profil;
  try { localStorage.setItem(KUNCI_MASTER, JSON.stringify(m)); } catch {}
  return m;
}

export function masterLokal() {
  try {
    const m = JSON.parse(localStorage.getItem(KUNCI_MASTER) || 'null');
    if (m) { S.master = m; S.profil = m.profil; }
  } catch {}
  return S.master;
}

export const profilLengkap = () => !!(S.profil && S.profil.region && S.profil.jabatan && S.profil.atasan?.length && S.profil.unit);
export const namaJenis = kode => S.master?.kegiatan.find(k => k.kode === kode)?.nama || kode;
export const jenisMaster = kode => S.master?.kegiatan.find(k => k.kode === kode);
