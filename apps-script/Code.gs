/**
 * Rutinin — Apps Script untuk menyimpan Agenda & Laporan Kerja ke Google Spreadsheet.
 * Tempel SELURUH isi file ini ke editor Apps Script, isi SHEET_ID & PIN, lalu Deploy (lihat README).
 */
const SHEET_ID = '';   // ID spreadsheet: bagian di antara /d/ dan /edit pada link spreadsheet
const PIN = '';        // samakan dengan PIN di Rutinin → Pengaturan → Spreadsheet

const KPI_L = { done: 'Tercapai', progress: 'Dalam Progress', not: 'Belum Tercapai' };
const OI_L = { planned: '🟦 Planned', progress: '🟨 In Progress', done: '🟩 Completed', delegated: '🟪 Delegated', hold: '⬜ On Hold', cancelled: '🟥 Cancelled' };
const DEC_L = { pending: 'Menunggu', decided: 'Diputuskan', dropped: 'Tidak diperlukan' };
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const H = {
  Harian: ['Tanggal', 'Hari', 'Jenis Hari', 'Agenda', 'Laporan', 'Pekerjaan', 'Tercapai', 'Progress', 'Belum', 'Capaian %', 'Catatan', 'Diperbarui'],
  Agenda: ['Tanggal', 'Mulai', 'Selesai', 'Kegiatan', 'Rincian', 'Kategori', 'Prioritas', 'Label', 'Case ID', 'Need Support (PIC)'],
  Laporan: ['Tanggal', 'Kegiatan', 'Kategori', 'Status', 'Realisasi', 'Kendala', 'Case ID', 'Foto'],
  'Open Item': ['Case ID', 'Deskripsi', 'Referensi', 'PIC', 'Target', 'Status', 'Dibuat', 'Ditutup', 'Progress Terakhir', 'Kendala Terakhir', 'Diperbarui'],
  Keputusan: ['ID', 'Dibuat', 'Keputusan', 'Alasan', 'Dampak', 'Opsi', 'Status', 'Jawaban', 'Tanggal Diputuskan'],
  Kamus: ['Kata', 'Arti', 'Diperbarui'],
  Foto: ['Tanggal', 'Kegiatan', 'Gambar', 'Link', 'Nama File'],
  'Arsip PDF': ['Tanggal', 'Jenis', 'Nama File', 'Link', 'Diperbarui'],
  _Data: ['Kunci', 'Diperbarui', 'JSON 1', 'JSON 2', 'JSON 3', 'JSON 4'],
};

function doGet() { return out_({ ok: true, app: 'Rutinin', pesan: 'Apps Script aktif. Rutinin mengirim data lewat POST.' }); }

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'Data tidak valid' }); }
  if (PIN && String(req.pin || '') !== String(PIN)) return out_({ ok: false, error: 'PIN salah' });
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (req.action === 'ping') { ss_(); return out_({ ok: true }); }
    if (req.action === 'save') { save_(req); return out_({ ok: true, at: new Date().toISOString() }); }
    if (req.action === 'restore') return out_(Object.assign({ ok: true }, restore_()));
    if (req.action === 'upload') return out_(Object.assign({ ok: true }, upload_(req)));
    return out_({ ok: false, error: 'Aksi tidak dikenal' });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally { lock.releaseLock(); }
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ss_() { return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, H[name].length).setValues([H[name]]).setFontWeight('bold').setBackground('#FFEDD5');
    sh.setFrozenRows(1);
    if (name === '_Data') sh.hideSheet();
  }
  return sh;
}
function key_(v, tz) { return v instanceof Date ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : String(v); }
function jam_(t) { return t ? String(t).replace(':', '.') : ''; }
function hari_(iso) { const p = iso.split('-'); return HARI[new Date(+p[0], +p[1] - 1, +p[2]).getDay()]; }

// Ganti baris untuk tanggal tertentu, lalu urutkan per tanggal
function replaceRows_(sh, name, dates, rows, tz) {
  const n = H[name].length, last = sh.getLastRow();
  let data = last > 1 ? sh.getRange(2, 1, last - 1, n).getValues() : [];
  data = data.filter(r => r[0] !== '' && dates.indexOf(key_(r[0], tz)) < 0).concat(rows);
  data.sort((a, b) => { const x = key_(a[0], tz), y = key_(b[0], tz); return x < y ? -1 : x > y ? 1 : 0; });
  if (last > 1) sh.getRange(2, 1, last - 1, n).clearContent();
  if (data.length) sh.getRange(2, 1, data.length, n).setValues(data);
}
function rewrite_(sh, name, rows) {
  const n = H[name].length, last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, n).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, n).setValues(rows);
}
function putData_(sh, entries) {
  const last = sh.getLastRow();
  const keys = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0])) : [];
  entries.forEach(([k, obj]) => {
    const json = JSON.stringify(obj), parts = [];
    for (let i = 0; i < 4; i++) parts.push(json.slice(i * 45000, (i + 1) * 45000));
    if (json.length > 180000) throw new Error('Data ' + k + ' terlalu besar');
    const row = [k, new Date()].concat(parts);
    const idx = keys.indexOf(k);
    if (idx >= 0) sh.getRange(idx + 2, 1, 1, row.length).setValues([row]);
    else { sh.appendRow(row); keys.push(k); }
  });
}

function save_(req) {
  const ss = ss_(), tz = ss.getSpreadsheetTimeZone();
  const days = req.days || [];
  const dates = days.map(d => d.date);
  const rowsH = [], rowsA = [], rowsL = [];

  days.forEach(d => {
    const off = d.type !== 'kerja';
    const ag = d.agenda || { items: [] }, lp = d.laporan || null;
    const items = (ag.items || []).slice().sort((a, b) => String(a.start).localeCompare(String(b.start)));
    const work = items.filter(i => i.kind !== 'tetap').concat(lp && lp.extra || []);
    const res = id => (lp && lp.results && lp.results[id]) || {};
    if (off) {
      rowsA.push([d.date, '', '', d.off, d.note || '', 'libur', '', '', '', '']);
      rowsL.push([d.date, d.off, 'libur', '', d.note || '', '', '', '']);
    } else {
      items.forEach(i => rowsA.push([d.date, jam_(i.start), jam_(i.end), i.title, (i.details || []).join('\n'), i.kind, i.star ? 'Ya' : '', i.star ? i.label || '🎯' : '', i.caseId || '', i.support && i.support.pic ? i.support.pic : '']));
      if (lp) work.forEach(i => { const r = res(i.id); rowsL.push([d.date, i.title, i.extra ? 'tambahan' : i.kind, KPI_L[r.status] || '-', r.realisasi || '', r.kendala || '', i.caseId || '', (r.photos || []).length]); });
    }
    const st = s => work.filter(i => res(i.id).status === s).length;
    const done = st('done');
    const agS = off ? (d.offAgendaSent ? 'Terkirim ' + d.offAgendaSent : '-') : ag.sentAt ? 'Terkirim ' + ag.sentAt : d.agenda ? (ag.final ? 'Siap' : 'Draf') : '-';
    const lpS = off ? (d.offLaporanSent ? 'Terkirim ' + d.offLaporanSent : '-') : lp && lp.sentAt ? 'Terkirim ' + lp.sentAt : lp ? (lp.final ? 'Siap' : 'Draf') : '-';
    rowsH.push([d.date, hari_(d.date), off ? d.off : 'Kerja', agS, lpS, off ? '' : work.length, off ? '' : done, off ? '' : st('progress'), off ? '' : st('not'),
      off || !lp || !work.length ? '' : Math.round(done / work.length * 100), d.note || '', new Date()]);
  });

  if (dates.length) {
    replaceRows_(sheet_(ss, 'Harian'), 'Harian', dates, rowsH, tz);
    replaceRows_(sheet_(ss, 'Agenda'), 'Agenda', dates, rowsA, tz);
    replaceRows_(sheet_(ss, 'Laporan'), 'Laporan', dates, rowsL, tz);
  }
  const ois = req.openItems || [];
  rewrite_(sheet_(ss, 'Open Item'), 'Open Item', ois.sort((a, b) => a.caseId.localeCompare(b.caseId)).map(o => {
    const h = (o.history || []).slice(-1)[0] || {};
    return [o.caseId, o.desc, o.ref || '', (o.pic || []).join(', ') + (o.delegatedTo ? ' → ' + o.delegatedTo : ''), o.target || '', OI_L[o.status] || o.status, o.created || '', o.closedDate || '', h.progress || '', h.kendala || '', o.updatedAt ? new Date(o.updatedAt) : ''];
  }));
  const decs = req.decisions || [];
  rewrite_(sheet_(ss, 'Keputusan'), 'Keputusan', decs.map(x => [x.id, x.created, x.what, x.reason || '', x.impact || '', x.options || '', DEC_L[x.status] || x.status, x.answer || '', x.decidedDate || '']));

  const kamus = req.kamus || {};
  rewrite_(sheet_(ss, 'Kamus'), 'Kamus', Object.keys(kamus).sort().map(k => [k, kamus[k].arti || '', kamus[k].at ? new Date(kamus[k].at) : '']));

  const data = sheet_(ss, '_Data');
  putData_(data, days.map(d => ['day:' + d.date, d]).concat([['openItems', ois], ['decisions', decs], ['kamus', kamus]]));
}

function restore_() {
  const sh = ss_().getSheetByName('_Data');
  if (!sh || sh.getLastRow() < 2) return { days: [], openItems: [], decisions: [] };
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
  const out = { days: [], openItems: [], decisions: [] };
  rows.forEach(r => {
    const k = String(r[0]); if (!k) return;
    const v = JSON.parse(r.slice(2).join(''));
    if (k.indexOf('day:') === 0) out.days.push(v);
    else if (k === 'openItems') out.openItems = v;
    else if (k === 'decisions') out.decisions = v;
    else if (k === 'kamus') out.kamus = v;
  });
  return out;
}

// ---------- Foto laporan & arsip PDF ke Google Drive ----------
function folder_(name, parent) {
  const it = parent ? parent.getFoldersByName(name) : DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : (parent ? parent.createFolder(name) : DriveApp.createFolder(name));
}
function upsertByCol_(sh, name, col, key, row) {
  const n = H[name].length, last = sh.getLastRow();
  const keys = last > 1 ? sh.getRange(2, col, last - 1, 1).getValues().map(r => String(r[0])) : [];
  const idx = keys.indexOf(key);
  const r = idx >= 0 ? idx + 2 : last + 1;
  sh.getRange(r, 1, 1, n).setValues([row]);
  return r;
}
function upload_(req) {
  const root = folder_('Rutinin');
  const dir = folder_(req.kind === 'pdf' ? 'Arsip PDF' : 'Foto Laporan', root);
  const old = dir.getFilesByName(req.name);
  while (old.hasNext()) old.next().setTrashed(true);
  const file = dir.createFile(Utilities.newBlob(Utilities.base64Decode(req.data), req.mime, req.name));
  const url = file.getUrl(), ss = ss_();
  if (req.kind === 'pdf') {
    upsertByCol_(sheet_(ss, 'Arsip PDF'), 'Arsip PDF', 3, req.name, [req.date, req.jenis === 'agenda' ? 'Agenda Kerja' : 'Laporan Kerja', req.name, url, new Date()]);
  } else {
    const sh = sheet_(ss, 'Foto');
    const r = upsertByCol_(sh, 'Foto', 5, req.name, [req.date, req.title || '', '', url, req.name]);
    try {
      const img = SpreadsheetApp.newCellImage().setSourceUrl('data:image/jpeg;base64,' + req.thumb).setAltTextTitle(req.title || 'Foto').build();
      sh.getRange(r, 3).setValue(img);
      sh.setRowHeight(r, 90);
    } catch (e) { sh.getRange(r, 3).setFormula('=HYPERLINK("' + url + '","Lihat foto")'); }
  }
  return { url: url };
}
