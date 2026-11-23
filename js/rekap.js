// Rekap pekerjaan per rentang tanggal (custom) + unduh CSV
import { $, esc, icon, iso, addDays, parseISO, tglPendek, tglPanjang, jam, hari, download, toast } from './util.js';
import { allDays, allOpenItems, getSettings, STATUS, KPI } from './store.js';
import { sortItems } from './docs.js';

const PRESETS = {
  'Hari ini': () => [iso(), iso()],
  'Minggu ini': () => { const d = new Date(); const k = (d.getDay() + 6) % 7; const a = iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() - k)); return [a, addDays(a, 6)]; },
  'Bulan ini': () => { const d = new Date(); return [iso(new Date(d.getFullYear(), d.getMonth(), 1)), iso(new Date(d.getFullYear(), d.getMonth() + 1, 0))]; },
  'Bulan lalu': () => { const d = new Date(); return [iso(new Date(d.getFullYear(), d.getMonth() - 1, 1)), iso(new Date(d.getFullYear(), d.getMonth(), 0))]; },
  '30 hari': () => [addDays(iso(), -29), iso()],
};

function rowsOf(day) {
  if (day.type !== 'kerja') return [];
  const items = sortItems((day.agenda?.items || []).filter(i => i.kind !== 'tetap'));
  const L = day.laporan;
  const all = [...items, ...(L?.extra || [])];
  return all.map(it => {
    const r = L?.results?.[it.id] || {};
    return { date: day.date, start: it.start || '', end: it.end || '', title: it.title, kind: it.extra ? 'tambahan' : it.kind, star: !!it.star, caseId: it.caseId || '', status: r.status || '', realisasi: r.realisasi || '', kendala: r.kendala || '' };
  });
}
const csvCell = v => /[",\n;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
const toCSV = rows => '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');

export async function render(v) {
  const s = await getSettings();
  let [from, to] = PRESETS['Bulan ini']();
  let preset = 'Bulan ini';

  v.innerHTML = `
    <section class="card">
      <div class="chips" id="pre"></div>
      <div class="row2">
        <div class="stack"><span class="label">Dari</span><div class="field"><input type="date" id="from"></div></div>
        <div class="stack"><span class="label">Sampai</span><div class="field"><input type="date" id="to"></div></div>
      </div>
    </section>
    <div id="out"></div>`;
  const drawPre = () => { $('#pre', v).innerHTML = Object.keys(PRESETS).map(k => `<button class="chip ${k === preset ? 'on' : ''}" data-p="${k}">${k}</button>`).join(''); };
  $('#pre', v).onclick = e => { const b = e.target.closest('[data-p]'); if (!b) return; preset = b.dataset.p; [from, to] = PRESETS[preset](); sync(); };
  $('#from', v).onchange = e => { from = e.target.value; preset = ''; if (from > to) to = from; sync(); };
  $('#to', v).onchange = e => { to = e.target.value; preset = ''; if (to < from) from = to; sync(); };

  async function sync() {
    $('#from', v).value = from; $('#to', v).value = to; drawPre();
    const days = (await allDays()).filter(d => d.date >= from && d.date <= to && (d.type !== 'kerja' || d.agenda || d.laporan)).sort((a, b) => b.date.localeCompare(a.date));
    const ois = await allOpenItems();
    const rows = days.flatMap(rowsOf);
    const work = days.filter(d => d.type === 'kerja').length, off = days.length - work;
    const done = rows.filter(r => r.status === 'done').length;
    const reported = rows.filter(r => r.status).length;
    const oiNew = ois.filter(o => o.created >= from && o.created <= to).length;
    const oiClosed = ois.filter(o => o.closedDate && o.closedDate >= from && o.closedDate <= to).length;

    $('#out', v).innerHTML = `
      <section class="hero"><span class="bubble b1"></span><span class="bubble b2"></span>
        <div class="hero-label">${esc(tglPendek(from))} ${from.slice(0, 4) !== to.slice(0, 4) ? from.slice(0, 4) : ''} – ${esc(tglPendek(to))} ${to.slice(0, 4)}</div>
        <div class="hero-big">${reported ? Math.round(done / reported * 100) : 0}% tercapai</div>
        <div class="hero-label">${done} dari ${reported} pekerjaan yang dilaporkan selesai</div></section>
      <div class="quicks">
        <div class="quick"><span class="qi">${icon('agenda')}</span><b>${work}</b>Hari kerja</div>
        <div class="quick sun"><span class="qi">${icon('umbrella')}</span><b>${off}</b>Libur/Cuti</div>
        <div class="quick ok"><span class="qi">${icon('flag')}</span><b>${oiNew}/${oiClosed}</b>OI baru/tutup</div>
      </div>
      <div class="btns"><button class="btn btn-primary" id="csv1">${icon('download')}CSV Pekerjaan</button><button class="btn btn-soft" id="csv2">${icon('download')}CSV Open Item</button></div>
      ${s.sheetUrl ? `<a class="btn btn-soft" href="${esc(s.sheetUrl)}" target="_blank" rel="noopener">${icon('open')}Buka Spreadsheet</a>` : ''}
      ${days.length ? days.map(d => {
        const r = rowsOf(d); const dn = r.filter(x => x.status === 'done').length;
        return `<section class="card"><div class="card-head"><h2 style="font-size:17px">${esc(tglPanjang(d.date))}</h2>
            <span class="sub">${d.type !== 'kerja' ? `<span class="pt sun">${esc(d.off)}</span>` : d.laporan ? `${dn}/${r.length} selesai` : '<span class="pt mute">belum lapor</span>'}</span></div>
          ${r.length ? `<div class="list">${r.map(x => `<div class="row" style="min-height:48px"><span class="av ${x.status === 'done' ? 'ok' : x.status === 'progress' ? 'sun' : x.status === 'not' ? 'bad' : ''}" style="width:36px;height:36px;border-radius:13px;font-size:14px">${x.status ? KPI[x.status].e : '•'}</span>
            <span class="row-main"><span class="row-t" style="font-size:15px">${esc(x.title)}</span><span class="row-s">${x.start ? jam(x.start) + '–' + jam(x.end) : 'tambahan'}${x.caseId ? ' · ' + esc(x.caseId) : ''}${x.kendala ? ' · ' + esc(x.kendala) : ''}</span></span></div>`).join('')}</div>` : ''}
        </section>`;
      }).join('') : `<section class="card"><div class="empty-state"><span>${icon('calendar')}</span>Belum ada data di rentang ini.</div></section>`}`;

    $('#csv1', v).onclick = () => {
      const head = ['Tanggal', 'Hari', 'Jenis Hari', 'Mulai', 'Selesai', 'Kegiatan', 'Kategori', 'Prioritas', 'Case ID', 'Status', 'Realisasi', 'Kendala'];
      const body = days.slice().reverse().flatMap(d => d.type !== 'kerja' ? [[d.date, hari(d.date), d.off, '', '', '', '', '', '', '', '', '']]
        : rowsOf(d).map(r => [r.date, hari(r.date), 'Kerja', jam(r.start), jam(r.end), r.title, r.kind, r.star ? 'Ya' : '', r.caseId, r.status ? KPI[r.status].l : '-', r.realisasi, r.kendala]));
      download(new Blob([toCSV([head, ...body])], { type: 'text/csv' }), `Rekap Pekerjaan ${from} sd ${to}.csv`);
      toast('CSV tersimpan');
    };
    $('#csv2', v).onclick = () => {
      const head = ['Case ID', 'Deskripsi', 'Referensi', 'PIC', 'Target', 'Status', 'Dibuat', 'Ditutup', 'Progress Terakhir', 'Kendala Terakhir'];
      const body = ois.filter(o => o.created <= to && (!o.closedDate || o.closedDate >= from)).map(o => { const h = o.history?.at(-1) || {}; return [o.caseId, o.desc, o.ref, (o.pic || []).join(', '), o.target, STATUS[o.status].l, o.created, o.closedDate || '', h.progress || '', h.kendala || '']; });
      download(new Blob([toCSV([head, ...body])], { type: 'text/csv' }), `Open Item ${from} sd ${to}.csv`);
      toast('CSV tersimpan');
    };
  }
  sync();
}
