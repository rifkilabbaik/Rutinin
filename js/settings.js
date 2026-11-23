// Pengaturan: tampilan, profil, Case ID, link portal, blok rutin, spreadsheet, AI lokal, data
import { $, $$, esc, icon, uid, clone, toast, download, debounce, linesOf, confirmBox } from './util.js';
import { getSettings, saveSettings } from './store.js';
import { db } from './db.js';
import * as sync from './sync.js';

const SW = [['orange', '#EA580C', 'Oranye'], ['peach', '#C24E28', 'Peach'], ['mint', '#0B7F6E', 'Mint'], ['lavender', '#6A4FD8', 'Lavender']];

export async function render(v) {
  let s = await getSettings();
  // kumpulkan perubahan agar ketikan cepat di beberapa kolom tidak hilang
  let pending = {};
  const flushSave = debounce(async () => { const p = pending; pending = {}; s = await saveSettings(p); toast('Tersimpan'); }, 500);
  const save = patch => {
    if (patch.links) patch.links = { ...s.links, ...(pending.links || {}), ...patch.links };
    Object.assign(pending, patch); flushSave();
  };
  const field = (k, label, ph = '', type = 'text', val = s[k]) => `<span class="label">${label}</span><div class="field"><input type="${type}" data-k="${k}" placeholder="${esc(ph)}" value="${esc(val ?? '')}"></div>`;
  const link = (k, label, ph) => `<span class="label">${label}</span><div class="field">${icon('open')}<input type="url" data-l="${k}" placeholder="${esc(ph)}" value="${esc(s.links[k] || '')}"></div>`;

  v.innerHTML = `
    <details class="card" open><summary>${icon('sun')}<h2>Tampilan</h2><span class="chev">${icon('down')}</span></summary>
      <span class="label">Warna</span>
      <div class="swatches" id="sw">${SW.map(([k, c, n]) => `<button style="--sw:${c}" data-p="${k}" aria-label="${n}" title="${n}"></button>`).join('')}</div>
      <span class="label">Tema</span>
      <div class="seg" id="theme">${[['light', 'sun', 'Terang'], ['dark', 'moon', 'Gelap'], ['auto', 'auto', 'Otomatis']].map(([k, ic, n]) => `<button data-t="${k}">${icon(ic)}${n}</button>`).join('')}</div>
    </details>

    <details class="card" open><summary>${icon('user')}<h2>Profil (header dokumen)</h2><span class="chev">${icon('down')}</span></summary>
      ${field('nama', 'Nama', 'mis. Rifki Rifai')}${field('jabatan', 'Jabatan', 'mis. Marketing Event Admin')}
      ${field('atasan', 'Atasan', 'mis. Pak Kustiyadi, Pak Dani')}${field('unit', 'Unit Kerja', 'mis. Marketing and Customer Experience Division')}
    </details>

    <details class="card"><summary>${icon('flag')}<h2>Case ID Open Item</h2><span class="chev">${icon('down')}</span></summary>
      ${field('casePrefix', 'Kode unit', 'MCED-RR')}${field('caseStart', 'Nomor urut mulai', '1', 'number')}
      <p class="hint">Format: ${esc(s.casePrefix)}/${new Date().getFullYear()}-001. Nomor berikutnya dihitung otomatis dan tidak dobel.</p>
    </details>

    <details class="card"><summary>${icon('send')}<h2>Link Portal</h2><span class="chev">${icon('down')}</span></summary>
      ${link('absen', 'Absen kehadiran', 'https://…/attendances')}${link('grooming', 'Grup Grooming (foto absen)', 'https://web.telegram.org/k/#-…')}
      ${link('rencana', 'Topik Rencana Kerja', 'https://web.telegram.org/k/#-…')}${link('laporan', 'Topik Laporan Kerja', 'https://web.telegram.org/k/#-…')}
      <p class="hint">Tip: di Telegram Web buka topiknya, lalu salin alamat dari address bar supaya jendela langsung masuk ke topik.</p>
    </details>

    <details class="card"><summary>${icon('clock')}<h2>Blok rutin & tetap</h2><span class="chev">${icon('down')}</span></summary>
      <p class="hint">Otomatis masuk ke setiap agenda baru (mis. Daily Task, Sholat Dzuhur, Istirahat).</p>
      <div class="tl" id="rt"></div>
      <button class="btn btn-soft" id="rtAdd">${icon('plus')}Tambah blok</button>
    </details>

    <details class="card"><summary>${icon('sync')}<h2>Spreadsheet</h2><span class="chev">${icon('down')}</span></summary>
      ${field('scriptUrl', 'URL Web App Apps Script', 'https://script.google.com/macros/s/…/exec', 'url')}
      ${field('pin', 'PIN (sama dengan di Apps Script)', 'mis. 4821')}
      ${field('sheetUrl', 'Link Spreadsheet (untuk tombol buka)', 'https://docs.google.com/spreadsheets/…', 'url')}
      <div class="btns"><button class="btn btn-soft btn-sm" id="ping">${icon('check')}Tes koneksi</button><button class="btn btn-soft btn-sm" id="push">${icon('upload')}Sinkron semua</button><button class="btn btn-soft btn-sm" id="pull">${icon('download')}Pulihkan</button></div>
      <p class="hint">Data selalu tersimpan di HP dulu, lalu dikirim ke Spreadsheet saat online.</p>
    </details>

    <details class="card" id="aiCard"><summary>${icon('sparkle')}<h2>AI lokal</h2><span class="chev">${icon('down')}</span></summary>
      <div id="ai"><div class="loading"><div class="dots"><i></i><i></i><i></i></div></div></div>
    </details>

    <details class="card"><summary>${icon('download')}<h2>Data</h2><span class="chev">${icon('down')}</span></summary>
      <div class="btns"><button class="btn btn-soft btn-sm" id="bak">${icon('download')}Cadangkan (JSON)</button>
        <label class="btn btn-soft btn-sm" style="cursor:pointer">${icon('upload')}Pulihkan file<input type="file" accept="application/json" id="imp" hidden></label></div>
      <p class="hint">Rutinin · data tersimpan di HP ini. Foto lampiran tidak ikut dicadangkan.</p>
    </details>`;

  // Tampilan
  const markTheme = () => {
    const p = localStorage.getItem('rutinin.palette') || 'orange', t = localStorage.getItem('rutinin.theme') || 'auto';
    $$('#sw button', v).forEach(b => b.classList.toggle('on', b.dataset.p === p));
    $$('#theme button', v).forEach(b => b.classList.toggle('on', b.dataset.t === t));
  };
  const { applyTheme } = await import('./app.js');
  $('#sw', v).onclick = e => { const b = e.target.closest('[data-p]'); if (!b) return; localStorage.setItem('rutinin.palette', b.dataset.p); applyTheme(); markTheme(); };
  $('#theme', v).onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; localStorage.setItem('rutinin.theme', b.dataset.t); applyTheme(); markTheme(); };
  markTheme();

  v.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.k) save({ [t.dataset.k]: t.type === 'number' ? +t.value || 1 : t.value.trim() });
    if (t.dataset.l) save({ links: { [t.dataset.l]: t.value.trim() } });
  });

  // Blok rutin
  let routine = clone(s.routine || []);
  routine.forEach(r => r.id ||= uid());
  const saveR = debounce(() => saveSettings({ routine: routine.map(({ id, ...r }) => r) }).then(x => { s = x; toast('Tersimpan'); }), 500);
  function drawR() {
    $('#rt', v).innerHTML = routine.map(r => `<div class="tl-item k-${r.kind}" data-id="${r.id}">
      <div class="tl-time"><input type="time" data-f="start" value="${r.start}"><span class="muted">–</span><input type="time" data-f="end" value="${r.end}"><span class="spacer"></span>
        <button class="icon-btn flat sm" data-del aria-label="Hapus">${icon('trash')}</button></div>
      <input class="tl-title" data-f="title" value="${esc(r.title)}" placeholder="Nama blok">
      <div class="seg seg-mini">${['rutin', 'tetap'].map(k => `<button data-kind="${k}" class="${r.kind === k ? 'on' : ''}">${k === 'rutin' ? 'Rutin (ada rincian)' : 'Tetap (sholat/istirahat)'}</button>`).join('')}</div>
      ${r.kind !== 'tetap' ? `<textarea class="tl-details" data-f="details" rows="3" placeholder="Rincian, satu baris satu poin">${esc((r.details || []).join('\n'))}</textarea>` : ''}
    </div>`).join('') || '<p class="hint">Belum ada blok.</p>';
  }
  $('#rt', v).addEventListener('input', e => {
    const r = routine.find(x => x.id === e.target.closest('[data-id]')?.dataset.id); const f = e.target.dataset.f; if (!r || !f) return;
    r[f] = f === 'details' ? linesOf(e.target.value) : e.target.value; saveR();
  });
  $('#rt', v).addEventListener('click', e => {
    const r = routine.find(x => x.id === e.target.closest('[data-id]')?.dataset.id); if (!r) return;
    const k = e.target.closest('[data-kind]'); if (k) { r.kind = k.dataset.kind; drawR(); saveR(); }
    if (e.target.closest('[data-del]')) { routine = routine.filter(x => x !== r); drawR(); saveR(); }
  });
  $('#rtAdd', v).onclick = () => { routine.push({ id: uid(), start: '09:00', end: '10:00', title: '', kind: 'rutin', details: [] }); drawR(); };
  drawR();

  // Spreadsheet
  $('#ping', v).onclick = async () => { try { await sync.ping(); toast('Terhubung ke Apps Script ✓'); } catch (e) { toast('Gagal: ' + e.message, 5000); } };
  $('#push', v).onclick = async () => { toast('Mengirim semua data…'); const r = await sync.flush(true); toast(r.ok ? 'Semua data tersinkron ✓' : 'Gagal: ' + r.error, 5000); };
  $('#pull', v).onclick = async () => {
    if (!(await confirmBox('Ambil data dari Spreadsheet? Data di HP yang lebih baru tidak akan ditimpa.', { ok: 'Pulihkan' }))) return;
    try { const n = await sync.restore(); toast(`${n} hari dipulihkan ✓`); } catch (e) { toast('Gagal: ' + e.message, 5000); }
  };

  // AI lokal
  const ai = await import('./ai.js');
  async function drawAI() {
    const box = $('#ai', v);
    const sp = await ai.support();
    if (!sp.ok) { box.innerHTML = `<p class="muted">${icon('alert')} ${esc(sp.reason)}</p><p class="hint">Tanpa AI, tombol <b>Isi otomatis</b> tetap menyusun isi secara instan.</p>`; return; }
    const cached = await ai.isCached();
    const on = s.ai?.enabled;
    box.innerHTML = `<p class="muted">Model <b>Qwen2.5 1.5B</b> berjalan langsung di HP (WebGPU${sp.f16 ? ', f16' : ''}). Tanpa API, tanpa internet setelah diunduh. Dipakai untuk tombol ✨ <b>Bantu tulis</b>: rincian kegiatan, Executive Summary, dan Refleksi.</p>
      <div class="row" style="padding:0"><span class="av ${on && cached ? 'ok' : ''}">${icon('sparkle')}</span><span class="row-main"><span class="row-t">${on && cached ? 'Aktif' : cached ? 'Terunduh, nonaktif' : 'Belum diunduh'}</span><span class="row-s">${cached ? 'Model tersimpan di HP' : 'Unduhan ±1 GB, sebaiknya pakai Wi-Fi'}</span></span></div>
      <div class="progress" id="aibar" hidden><i></i></div><p class="hint" id="aitext"></p>
      <div class="btns">${!on || !cached ? `<button class="btn btn-primary btn-sm" id="aiOn">${icon('download')}${cached ? 'Aktifkan' : 'Unduh & aktifkan'}</button>` : `<button class="btn btn-soft btn-sm" id="aiOff">Nonaktifkan</button>`}
        ${cached ? `<button class="btn btn-danger btn-sm" id="aiDel">${icon('trash')}Hapus model</button>` : ''}</div>`;
    $('#aiOn', box) && ($('#aiOn', box).onclick = async e => {
      e.target.disabled = true; $('#aibar', box).hidden = false;
      try {
        await ai.load(r => { $('#aibar i', box).style.width = Math.round((r.progress || 0) * 100) + '%'; $('#aitext', box).textContent = (r.text || '').slice(0, 100); });
        s = await saveSettings({ ai: { enabled: true } }); toast('AI lokal aktif ✓'); drawAI();
      } catch (err) { toast('Gagal memuat AI: ' + err.message, 6000); e.target.disabled = false; }
    });
    $('#aiOff', box) && ($('#aiOff', box).onclick = async () => { s = await saveSettings({ ai: { enabled: false } }); drawAI(); });
    $('#aiDel', box) && ($('#aiDel', box).onclick = async () => {
      if (!(await confirmBox('Hapus model AI dari HP?', { ok: 'Hapus' }))) return;
      await ai.removeModel(); s = await saveSettings({ ai: { enabled: false } }); toast('Model dihapus'); drawAI();
    });
  }
  $('#aiCard', v).addEventListener('toggle', function once() { if (this.open) { drawAI().catch(e => $('#ai', v).textContent = e.message); this.removeEventListener('toggle', once); } });

  // Data
  $('#bak', v).onclick = async () => {
    const data = { app: 'Rutinin', at: new Date().toISOString(), settings: await getSettings(), days: await db.all('days'), openItems: await db.all('openItems'), decisions: (await db.get('kv', 'decisions')) || [], memory: (await db.get('kv', 'memory')) || null };
    download(new Blob([JSON.stringify(data)], { type: 'application/json' }), `Rutinin-cadangan-${new Date().toISOString().slice(0, 10)}.json`);
  };
  $('#imp', v).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text()); if (d.app !== 'Rutinin') throw new Error('Bukan file cadangan Rutinin');
      if (!(await confirmBox('Pulihkan data dari file ini? Data dengan tanggal yang sama akan ditimpa.', { ok: 'Pulihkan' }))) return;
      if (d.settings) await saveSettings(d.settings);
      for (const x of d.days || []) await db.put('days', x);
      for (const x of d.openItems || []) await db.put('openItems', x);
      if (d.decisions) await db.put('kv', d.decisions, 'decisions');
      if (d.memory) await db.put('kv', d.memory, 'memory');
      toast('Data dipulihkan ✓'); setTimeout(() => location.reload(), 800);
    } catch (err) { toast('Gagal: ' + err.message, 5000); }
  };
}
