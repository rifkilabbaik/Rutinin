// AGENDA KERJA — cukup isi timeline; prioritas, open item, need support/decision disusun & ditanyakan otomatis
import { $, $$, esc, icon, iso, uid, clone, tglPanjang, tglPendek, menit, dariMenit, nowHM, toast, sheet, chips, debounce, linesOf, sentence, confirmBox } from './util.js';
import {
  getSettings, getDay, saveDay, activeOpenItems, allOpenItems, saveOpenItem, deleteOpenItem, nextCaseId,
  memList, remember, rememberTitle, lookupTitle, titleSuggestions, allDecisions, saveDecisions, pendingDecisions, newDecision, REFS, STATUS,
} from './store.js';
import { suggestDetails } from './smart.js';
import { runWizard } from './wizard.js';

const KIND = { kerja: 'Kerja', rutin: 'Rutin', tetap: 'Tetap' };

const newItem = (date, start = '08:00', end = '09:00') => ({ id: uid(), start, end, title: '', details: [], kind: 'kerja', star: false, label: '🎯', target: date, oi: true, caseId: null, ref: '', pics: [], desc: '', support: null });

function freeSlot(items, dur = 60) {
  let t = 8 * 60;
  for (const it of [...items].sort((a, b) => menit(a.start) - menit(b.start))) {
    if (t + dur <= menit(it.start)) break;
    t = Math.max(t, menit(it.end));
  }
  return [dariMenit(t), dariMenit(Math.min(t + dur, 23 * 60 + 59))];
}

export async function render(v, params, { go, topActions }) {
  const date = params.get('d') || iso();
  const s = await getSettings();
  let day = await getDay(date);

  topActions.innerHTML = `<label class="icon-btn" aria-label="Pilih tanggal" style="cursor:pointer">${icon('calendar')}<input type="date" id="pickDate" value="${date}" style="position:absolute;opacity:0;inset:0;width:100%;height:100%"></label>`;
  $('#pickDate', topActions).onchange = e => e.target.value && go('agenda', { d: e.target.value });

  if (day.type !== 'kerja') {
    v.innerHTML = `<section class="hero"><span class="bubble b1"></span><span class="bubble b2"></span>
        <div class="hero-label">${esc(tglPanjang(date))}</div><div class="hero-big">${esc(day.off)}</div>
        <div class="hero-label">Agenda hanya berisi keterangan ${esc(day.off)}.</div></section>
      <button class="btn btn-primary btn-big" id="resend">${icon('send')}Kirim keterangan</button>
      <button class="btn btn-soft" id="work">${icon('agenda')}Ubah jadi hari kerja</button>`;
    const app = await import('./app.js');
    $('#resend', v).onclick = () => app.sendOff(day);
    $('#work', v).onclick = () => app.dayOffFlow(date);
    return;
  }

  if (!day.agenda) {
    day.agenda = { items: s.routine.map(r => ({ ...newItem(date), ...clone(r), id: uid(), oi: false })), pendukung: [], support: [], extraSupport: [], decisionIds: [], final: false, sentAt: null };
  }
  const A = day.agenda;
  const persist = debounce(() => saveDay(day), 400);
  const touch = () => { A.final = false; persist(); };

  const titles = await titleSuggestions();
  const pendOpts = await memList('pendukung');

  v.innerHTML = `
    <section class="hero"><span class="bubble b1"></span><span class="bubble b2"></span>
      <div class="hero-label">${esc(tglPanjang(date))}</div>
      <div class="hero-big">Timeline kerja</div>
      <div class="hero-label">Ketik jam & nama kegiatan saja. Prioritas, Open Item, Need Support & Decision disusun otomatis.</div>
      <div class="btns"><span class="pt" style="background:var(--surface)">${A.sentAt ? '✓ Terkirim ' + esc(A.sentAt) : A.final ? 'Siap kirim' : 'Draf tersimpan otomatis'}</span></div>
    </section>
    <div id="remind"></div>
    <div class="tl" id="tl"></div>
    <button class="btn btn-soft btn-big" id="add">${icon('plus')}Tambah kegiatan</button>
    <section class="card">
      <div class="card-head"><h2>📋 Pekerjaan pendukung</h2></div>
      <p class="hint">Pekerjaan tanpa jam tertentu. Pilihan tersimpan untuk hari berikutnya.</p>
      <div class="chips" id="pend"></div>
    </section>
    <div class="sticky-actions">
      <button class="btn btn-soft" id="off">${icon('umbrella')}Libur</button>
      <button class="btn btn-primary" id="next" style="flex:2">${icon('sparkle')}Lengkapi & buat PDF</button>
    </div>
    <datalist id="dl-titles">${titles.map(t => `<option value="${esc(t)}">`).join('')}</datalist>`;

  const tl = $('#tl', v);

  // ---------- Pengingat Open Item ----------
  async function drawRemind() {
    const act = await activeOpenItems(date);
    const linked = new Set(A.items.map(i => i.caseId).filter(Boolean));
    const todo = act.filter(o => !linked.has(o.caseId));
    $('#remind', v).innerHTML = todo.length ? `
      <section class="card warn">
        <div class="card-head">${icon('bell')}<h2>Open Item belum selesai</h2><span class="sub">${todo.length}</span></div>
        <p class="hint">Masukkan ke timeline hari ini supaya tidak terlewat. Yang tidak dimasukkan tetap tampil di bagian Open Item.</p>
        <div class="list">${todo.map(o => `
          <div class="row"><span class="av info" style="font-size:15px">${STATUS[o.status].e}</span>
            <span class="row-main"><span class="row-t">${esc(o.desc)}</span><span class="row-s">${esc(o.caseId)} · target ${esc(tglPendek(o.target))}</span></span>
            <button class="btn btn-soft btn-sm" data-ins="${esc(o.caseId)}">${icon('plus')}Masukkan</button></div>`).join('')}</div>
      </section>` : '';
  }
  $('#remind', v).onclick = async e => {
    const b = e.target.closest('[data-ins]'); if (!b) return;
    const oi = (await allOpenItems()).find(o => o.caseId === b.dataset.ins); if (!oi) return;
    const [st, en] = freeSlot(A.items);
    const mem = await lookupTitle(oi.desc);
    A.items.push({ ...newItem(date, st, en), title: oi.desc, desc: oi.desc, caseId: oi.caseId, ref: oi.ref, pics: oi.pic || [], target: oi.target >= date ? oi.target : date, details: mem?.details?.length ? mem.details : suggestDetails(oi.desc) });
    touch(); drawList(); drawRemind();
    toast(`${oi.caseId} masuk ke timeline`);
  };

  // ---------- Timeline ----------
  const sorted = () => [...A.items].sort((a, b) => menit(a.start) - menit(b.start));
  function itemHTML(it) {
    return `<div class="tl-item k-${it.kind}" data-id="${it.id}">
      <div class="tl-time">
        <input type="time" data-f="start" value="${it.start}" aria-label="Mulai"><span class="muted">–</span><input type="time" data-f="end" value="${it.end}" aria-label="Selesai">
        <span class="spacer"></span>
        ${it.kind !== 'tetap' ? `<button class="star ${it.star ? 'on' : ''}" data-a="star" aria-label="Prioritas">${icon('star')}</button>` : ''}
        <button class="icon-btn flat sm" data-a="del" aria-label="Hapus">${icon('trash')}</button>
      </div>
      <input class="tl-title" data-f="title" list="dl-titles" placeholder="Nama kegiatan…" value="${esc(it.title)}" enterkeyhint="done">
      <div class="seg seg-mini">${Object.entries(KIND).map(([k, l]) => `<button data-kind="${k}" class="${it.kind === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${it.caseId ? `<span class="pt info" style="align-self:flex-start">${icon('flag')} ${esc(it.caseId)}</span>` : ''}
      ${it.kind !== 'tetap' ? `
        <textarea class="tl-details" data-f="details" rows="3" placeholder="Rincian, satu baris satu poin. Kosongkan saja, nanti diisi otomatis.">${esc(it.details.join('\n'))}</textarea>
        <div class="btns" style="gap:4px"><button class="btn btn-text btn-sm" data-a="auto">${icon('sync')}Isi otomatis</button><button class="btn btn-text btn-sm" data-a="ai">${icon('sparkle')}Bantu tulis (AI)</button></div>` : ''}
    </div>`;
  }
  function drawList() {
    const L = sorted();
    tl.innerHTML = L.length ? L.map(itemHTML).join('') : `<div class="card"><div class="empty-state"><span>${icon('agenda')}</span>Belum ada kegiatan. Tekan <b>Tambah kegiatan</b>.</div></div>`;
  }
  const findIt = el => A.items.find(i => i.id === el.closest('.tl-item')?.dataset.id);
  const redrawItem = it => { const n = tl.querySelector(`[data-id="${it.id}"]`); if (n) n.outerHTML = itemHTML(it); };

  tl.addEventListener('input', e => {
    const f = e.target.dataset.f; const it = findIt(e.target); if (!f || !it) return;
    if (f === 'details') it.details = linesOf(e.target.value);
    else if (f === 'title') it.title = e.target.value;
    touch();
  });
  tl.addEventListener('change', async e => {
    const f = e.target.dataset.f; const it = findIt(e.target); if (!f || !it) return;
    if (f === 'start' || f === 'end') {
      it[f] = e.target.value;
      if (f === 'start' && menit(it.end) <= menit(it.start)) it.end = dariMenit(Math.min(menit(it.start) + 60, 1439));
      touch(); drawList(); return;
    }
    if (f === 'title') {
      it.title = e.target.value.trim();
      const mem = await lookupTitle(it.title);
      if (mem && !it._kindSet) { it.kind = mem.kind || it.kind; if (it.kind !== 'kerja') it.oi = false; }
      if (it.kind !== 'tetap' && !it.details.length) it.details = mem?.details?.length ? [...mem.details] : suggestDetails(it.title);
      touch(); redrawItem(it);
    }
  });
  tl.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const it = findIt(b); if (!it) return;
    if (b.dataset.kind) { it.kind = b.dataset.kind; it._kindSet = true; it.oi = it.kind === 'kerja'; if (it.kind === 'tetap') it.star = false; touch(); redrawItem(it); return; }
    const a = b.dataset.a;
    if (a === 'star') {
      if (!it.star && A.items.filter(i => i.star).length >= 3) { toast('Maksimal 3 prioritas'); return; }
      it.star = !it.star; touch(); b.classList.toggle('on', it.star);
    }
    if (a === 'del') {
      if (it.title && !(await confirmBox(`Hapus "${it.title}"?`, { ok: 'Hapus' }))) return;
      A.items = A.items.filter(x => x !== it); touch(); drawList(); drawRemind();
    }
    if (a === 'auto') {
      if (!it.title) { toast('Isi nama kegiatan dulu'); return; }
      const mem = await lookupTitle(it.title);
      it.details = mem?.details?.length && JSON.stringify(mem.details) !== JSON.stringify(it.details) ? [...mem.details] : suggestDetails(it.title);
      touch(); redrawItem(it);
    }
    if (a === 'ai') {
      if (!it.title) { toast('Isi nama kegiatan dulu'); return; }
      const ai = await import('./ai.js');
      const lines = await ai.withAI(m => m.expandDetails(it.title, it.details));
      if (lines?.length) { it.details = lines; touch(); redrawItem(it); }
    }
  });

  $('#add', v).onclick = () => {
    const [st, en] = freeSlot(A.items);
    const it = newItem(date, st, en);
    A.items.push(it); touch(); drawList();
    const n = tl.querySelector(`[data-id="${it.id}"] .tl-title`);
    n?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => n?.focus(), 300);
  };
  $('#off', v).onclick = async () => (await import('./app.js')).dayOffFlow(date);

  chips($('#pend', v), { options: pendOpts, selected: A.pendukung, multi: true, addLabel: '+ Tambah', onChange: sel => { A.pendukung = sel; touch(); } });

  drawList(); drawRemind();

  // ---------- Lengkapi (wizard) ----------
  $('#next', v).onclick = async () => {
    // simpan teks yang sedang diketik
    $$('.tl-title', tl).forEach(inp => { const it = findIt(inp); if (it) it.title = inp.value.trim(); });
    A.items = A.items.filter(i => i.title || i.details.length);
    if (!A.items.some(i => i.kind !== 'tetap')) { toast('Tambahkan minimal satu kegiatan kerja'); drawList(); return; }
    const bad = A.items.find(i => !i.title || menit(i.end) <= menit(i.start));
    if (bad) { toast(!bad.title ? 'Ada kegiatan tanpa nama' : `Jam selesai "${bad.title}" harus setelah jam mulai`); drawList(); return; }
    for (const it of A.items) if (it.kind !== 'tetap' && !it.details.length) {
      const mem = await lookupTitle(it.title);
      it.details = mem?.details?.length ? [...mem.details] : suggestDetails(it.title);
    }
    drawList();
    const ok = await wizard();
    if (!ok) { await saveDay(day); drawList(); return; }
    await finalize();
  };

  async function wizard() {
    const work = () => sorted().filter(i => i.kind !== 'tetap');
    const kerja = () => sorted().filter(i => i.kind === 'kerja');
    const memRefs = await memList('refs', REFS);
    const memPics = await memList('pics');
    const memSup = await memList('supportPics');
    const memDec = await memList('decisions');
    const memAlasan = await memList('alasan');
    const decisions = await allDecisions();
    const pend = decisions.filter(d => d.status === 'pending' && d.created < date);
    let drafts = decisions.filter(d => d.created === date && A.decisionIds.includes(d.id));
    const dropped = new Set();

    // Prefill dari memori
    for (const it of work()) {
      const mem = await lookupTitle(it.title);
      if (!mem) continue;
      if (!it.ref && mem.ref) it.ref = mem.ref;
      if (!it.pics?.length && mem.pics?.length) it.pics = [...mem.pics];
      if (!it.desc && mem.desc) it.desc = mem.desc;
      if (it.support === null && mem.support) it.support = { ...mem.support, auto: true };
    }
    if (!A.items.some(i => i.star)) {
      [...kerja()].sort((a, b) => (menit(b.end) - menit(b.start)) - (menit(a.end) - menit(a.start))).slice(0, 3).forEach(i => i.star = true);
      if (!A.items.some(i => i.star)) work().slice(0, 3).forEach(i => i.star = true);
    }

    return runWizard({
      title: 'Lengkapi agenda', finishLabel: 'Buat PDF',
      steps: [
        { // 1. Prioritas
          title: 'A. Prioritas',
          render(b) {
            b.innerHTML = `<p class="q">Apa prioritas utama hari ini?</p><p class="hint">Diambil dari timeline. Pilih maksimal 3, lalu tentukan apakah target selesai hari ini.</p>
              ${work().map(it => `<div class="stack" data-id="${it.id}">
                <label class="check-row ${it.star ? 'on' : ''}"><input type="checkbox" data-p="star" ${it.star ? 'checked' : ''}><span class="row-main"><span class="row-t">${esc(it.title)}</span><span class="row-s">${it.start.replace(':', '.')}–${it.end.replace(':', '.')} · ${KIND[it.kind]}</span></span></label>
                ${it.star ? `<div class="seg seg-mini"><button data-p="lab" data-v="🎯" class="${it.label !== '▶️' ? 'on' : ''}">🎯 Selesai hari ini</button><button data-p="lab" data-v="▶️" class="${it.label === '▶️' ? 'on' : ''}">▶️ Mulai hari ini</button></div>
                  ${it.label === '▶️' ? `<div class="field">${icon('calendar')}<span class="muted">Target selesai</span><input type="date" data-p="target" value="${it.target > date ? it.target : ''}" min="${date}"></div>` : ''}` : ''}
              </div>`).join('')}`;
            b.onclick = e => {
              const t = e.target.closest('[data-p]'); if (!t || t.tagName === 'INPUT') return;
              const it = A.items.find(i => i.id === t.closest('[data-id]').dataset.id);
              if (t.dataset.p === 'lab') { it.label = t.dataset.v; if (it.label === '🎯') it.target = date; this.render(b); }
            };
            b.onchange = e => {
              const t = e.target; const it = A.items.find(i => i.id === t.closest('[data-id]')?.dataset.id); if (!it) return;
              if (t.dataset.p === 'star') {
                if (t.checked && A.items.filter(i => i.star).length >= 3) { t.checked = false; toast('Maksimal 3 prioritas'); return; }
                it.star = t.checked; this.render(b);
              }
              if (t.dataset.p === 'target') it.target = t.value || date;
            };
          },
          validate() {
            const p = A.items.filter(i => i.star);
            if (!p.length) return 'Pilih minimal 1 prioritas';
            if (p.some(i => i.label === '▶️' && !(i.target > date))) return 'Isi tanggal target untuk prioritas ▶️';
          },
        },
        { // 2. Open Item
          title: 'C. Open Item',
          skip: () => !kerja().length,
          render(b) {
            b.innerHTML = `<p class="q">Lengkapi Open Item</p><p class="hint">Setiap kegiatan Kerja dicatat sebagai Open Item dengan Case ID otomatis (${esc(s.casePrefix)}/${date.slice(0, 4)}-xxx). Jawaban tersimpan untuk dipilih lagi.</p>
              ${kerja().map(it => `<div class="wiz-card" data-id="${it.id}">
                <div class="toggle-row"><span class="row-main"><h4>${esc(it.title)}</h4><span class="meta">${it.caseId ? esc(it.caseId) + ' · lanjutan' : 'Case ID baru'}</span></span>
                  <label class="switch"><input type="checkbox" data-o="oi" ${it.oi ? 'checked' : ''}><span></span></label></div>
                ${it.oi ? `
                  <span class="label">Deskripsi</span><div class="field"><input data-o="desc" value="${esc(it.desc || sentence(it.title))}"></div>
                  <span class="label">Referensi</span><div class="chips" data-c="ref"></div>
                  <span class="label">PIC</span><div class="chips" data-c="pics"></div>
                  <span class="label">Target penyelesaian</span><div class="field">${icon('calendar')}<input type="date" data-o="target" value="${it.target || date}" min="${date}"></div>` : ''}
              </div>`).join('')}`;
            for (const card of $$('.wiz-card', b)) {
              const it = A.items.find(i => i.id === card.dataset.id);
              if (!it.oi) continue;
              if (!it.desc) it.desc = sentence(it.title);
              chips($('[data-c="ref"]', card), { options: memRefs, selected: it.ref ? [it.ref] : [], onChange: v => it.ref = v[0] || '' });
              chips($('[data-c="pics"]', card), { options: [s.nama, ...memPics].filter(Boolean), selected: it.pics?.length ? it.pics : [s.nama].filter(Boolean), multi: true, onChange: v => it.pics = v });
              if (!it.pics?.length) it.pics = [s.nama].filter(Boolean);
            }
            b.onchange = e => {
              const t = e.target; const it = A.items.find(i => i.id === t.closest('[data-id]')?.dataset.id); if (!it) return;
              if (t.dataset.o === 'oi') { it.oi = t.checked; this.render(b); }
              if (t.dataset.o === 'desc') it.desc = t.value.trim();
              if (t.dataset.o === 'target') it.target = t.value || date;
            };
          },
          validate() {
            const miss = kerja().find(i => i.oi && !i.ref);
            if (miss) return `Pilih referensi untuk "${miss.title}"`;
          },
        },
        { // 3. Need Support
          title: 'D. Need Support',
          render(b) {
            b.innerHTML = `<p class="q">Butuh dukungan dari siapa?</p><p class="hint">Pilih PIC di kegiatan yang butuh bantuan. Biarkan kosong kalau tidak perlu. PIC tersimpan untuk dipilih lagi.</p>
              ${work().map(it => `<div class="wiz-card" data-id="${it.id}"><h4>${esc(it.title)}</h4>
                <div class="chips" data-c="sp"></div>
                ${it.support?.pic ? `<span class="label">Dukungan yang dibutuhkan</span><div class="field"><input data-s="what" value="${esc(it.support.what || it.title)}"></div>` : ''}
              </div>`).join('')}
              ${A.extraSupport.map((x, k) => `<div class="wiz-card" data-x="${k}"><h4>Dukungan lain</h4>
                <div class="field"><input data-x="what" placeholder="Dukungan yang dibutuhkan" value="${esc(x.what)}"></div>
                <div class="field"><input data-x="pic" placeholder="PIC / unit" list="dl-sup" value="${esc(x.pic)}"></div>
                <button class="btn btn-danger btn-sm" data-xdel="${k}">${icon('trash')}Hapus</button></div>`).join('')}
              <button class="btn btn-soft" data-xadd>${icon('plus')}Dukungan lain</button>
              <datalist id="dl-sup">${memSup.map(p => `<option value="${esc(p)}">`).join('')}</datalist>`;
            for (const card of $$('.wiz-card[data-id]', b)) {
              const it = A.items.find(i => i.id === card.dataset.id);
              chips($('[data-c="sp"]', card), { options: memSup, selected: it.support?.pic ? [it.support.pic] : [], addLabel: '+ PIC baru', onChange: v => {
                it.support = v[0] ? { pic: v[0], what: it.support?.what || it.title } : false; this.render(b);
              } });
            }
            b.oninput = e => {
              const t = e.target;
              if (t.dataset.s === 'what') { const it = A.items.find(i => i.id === t.closest('[data-id]').dataset.id); it.support.what = t.value; }
              if (t.dataset.x) A.extraSupport[+t.closest('[data-x]').dataset.x][t.dataset.x] = t.value;
            };
            b.onclick = e => {
              if (e.target.closest('[data-xadd]')) { A.extraSupport.push({ what: '', pic: '' }); this.render(b); }
              const d = e.target.closest('[data-xdel]'); if (d) { A.extraSupport.splice(+d.dataset.xdel, 1); this.render(b); }
            };
          },
          apply() {
            A.extraSupport = A.extraSupport.filter(x => x.what.trim() && x.pic.trim());
            A.support = [...work().filter(i => i.support?.pic).map(i => ({ what: i.support.what || i.title, pic: i.support.pic })), ...A.extraSupport.map(x => ({ what: x.what.trim(), pic: x.pic.trim() }))];
          },
        },
        { // 4. Need Decision
          title: 'E. Need Decision',
          render(b) {
            b.innerHTML = `<p class="q">Ada keputusan yang dibutuhkan dari atasan?</p>
              ${pend.length ? `<p class="hint">Keputusan sebelumnya yang belum dijawab:</p>${pend.map(d => `<div class="wiz-card" data-pd="${d.id}"><h4>${esc(d.what)}</h4><span class="meta">sejak ${esc(tglPendek(d.created))}</span>
                <div class="seg seg-mini"><button data-keep="1" class="${!dropped.has(d.id) ? 'on' : ''}">Masih dibutuhkan</button><button data-keep="0" class="${dropped.has(d.id) ? 'on' : ''}">Sudah tidak perlu</button></div></div>`).join('')}` : ''}
              ${drafts.map((d, k) => `<div class="wiz-card" data-d="${k}"><h4>Keputusan baru</h4>
                <div class="field"><input data-f="what" list="dl-dec" placeholder="Keputusan yang dibutuhkan" value="${esc(d.what)}"></div>
                <div class="field"><input data-f="reason" list="dl-al" placeholder="Alasan / dampaknya" value="${esc(d.reason)}"></div>
                <div class="field"><input data-f="options" placeholder="Opsi yang diajukan (jika ada)" value="${esc(d.options)}"></div>
                <button class="btn btn-danger btn-sm" data-ddel="${k}">${icon('trash')}Hapus</button></div>`).join('')}
              <button class="btn btn-soft" data-dadd>${icon('plus')}${drafts.length ? 'Tambah keputusan' : 'Ya, ada keputusan'}</button>
              ${!drafts.length && !pend.length ? '<p class="hint">Tidak ada? Langsung tekan <b>Buat PDF</b>.</p>' : ''}
              <datalist id="dl-dec">${memDec.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
              <datalist id="dl-al">${memAlasan.map(p => `<option value="${esc(p)}">`).join('')}</datalist>`;
            b.oninput = e => { const t = e.target; const c = t.closest('[data-d]'); if (c && t.dataset.f) drafts[+c.dataset.d][t.dataset.f] = t.value; };
            b.onclick = e => {
              const k = e.target.closest('[data-keep]');
              if (k) { const id = k.closest('[data-pd]').dataset.pd; k.dataset.keep === '1' ? dropped.delete(id) : dropped.add(id); this.render(b); }
              if (e.target.closest('[data-dadd]')) { drafts.push(newDecision(date)); this.render(b); }
              const del = e.target.closest('[data-ddel]'); if (del) { drafts.splice(+del.dataset.ddel, 1); this.render(b); }
            };
          },
          validate() { if (drafts.some(d => d.what.trim() && !d.reason.trim())) return 'Isi alasan / dampak keputusan'; },
          async apply() {
            drafts = drafts.filter(d => d.what.trim());
            const all = await allDecisions();
            const ids = new Set(drafts.map(d => d.id));
            // keputusan baru hari ini: ganti dengan versi terbaru
            const kept = all.filter(d => !(d.created === date && A.decisionIds.includes(d.id) && !ids.has(d.id)));
            for (const d of drafts) { const i = kept.findIndex(x => x.id === d.id); if (i >= 0) kept[i] = d; else kept.push(d); }
            for (const d of kept) if (dropped.has(d.id)) { d.status = 'dropped'; d.decidedDate = date; }
            await saveDecisions(kept);
            A.decisionIds = drafts.map(d => d.id);
            await remember('decisions', drafts.map(d => d.what)); await remember('alasan', drafts.map(d => d.reason));
          },
        },
      ],
    });
  }

  // ---------- Simpan hasil, Case ID, PDF ----------
  async function finalize() {
    // Case ID & Open Item
    for (const it of sorted()) {
      const isOI = it.kind === 'kerja' && it.oi;
      if (isOI && !it.caseId) {
        it.caseId = await nextCaseId(date);
        await saveOpenItem({ caseId: it.caseId, desc: it.desc || sentence(it.title), ref: it.ref, pic: it.pics, target: it.target || date, status: 'planned', created: date, agendaDate: date, history: [] });
      } else if (isOI && it.caseId) {
        const all = await allOpenItems(); const o = all.find(x => x.caseId === it.caseId);
        if (o) { Object.assign(o, { desc: it.desc || o.desc, ref: it.ref || o.ref, pic: it.pics?.length ? it.pics : o.pic, target: it.target || o.target }); await saveOpenItem(o); }
      } else if (!isOI && it.caseId) {
        const o = (await allOpenItems()).find(x => x.caseId === it.caseId);
        if (o && o.agendaDate === date && !o.history?.length) await deleteOpenItem(o.caseId);
        it.caseId = null;
      }
    }
    // Open item buatan agenda hari ini yang kegiatannya dihapus
    const used = new Set(A.items.map(i => i.caseId).filter(Boolean));
    for (const o of await allOpenItems()) if (o.agendaDate === date && !used.has(o.caseId) && !o.history?.length) await deleteOpenItem(o.caseId);

    // Memori jawaban
    for (const it of A.items) if (it.kind !== 'tetap') await rememberTitle({ title: it.title, details: it.details, kind: it.kind, ref: it.ref, pics: it.pics, desc: it.desc, support: it.support?.pic ? { pic: it.support.pic, what: it.support.what } : null });
    await remember('refs', A.items.map(i => i.ref)); await remember('pics', A.items.flatMap(i => i.pics || []).filter(p => p !== s.nama));
    await remember('supportPics', A.support.map(x => x.pic)); await remember('pendukung', A.pendukung);

    A.final = true;
    await saveDay(day);
    drawList(); drawRemind();
    await preview();
  }

  async function preview() {
    const prog = sheet({ title: 'Menyusun Agenda Kerja…', html: '<div class="loading"><div class="dots"><i></i><i></i><i></i></div><span id="pp">Membuat PDF</span></div>', dismissible: false });
    try {
      const { agendaBlocks, caption, pdfName } = await import('./docs.js');
      const { buildPdf } = await import('./pdf.js');
      const openItems = await activeOpenItems(date);
      const decs = (await allDecisions()).filter(d => d.status === 'pending' && d.created <= date && (d.created < date || A.decisionIds.includes(d.id)));
      const pdf = await buildPdf(agendaBlocks(s, day, { openItems, decisions: decs }), { title: 'Agenda Kerja', filename: pdfName('agenda', date), onProgress: p => { const e = $('#pp'); if (e) e.textContent = `Membuat PDF ${Math.round(p * 100)}%`; } });
      prog.close();
      const { sendSheet } = await import('./send.js');
      const pv = sheet({
        title: 'Pratinjau Agenda', full: true,
        html: `<div class="preview-pages">${pdf.images.map(src => `<img src="${src}" alt="Halaman">`).join('')}</div>`,
        actions: [{ label: 'Edit lagi', onClick: x => x.close() }, { label: 'Kirim →', primary: true, onClick: x => {
          sendSheet({ title: 'Kirim Agenda Kerja', pdf, caption: caption('agenda', s, day), link: s.links.rencana, linkLabel: 'Rencana Kerja',
            onSent: async () => { A.sentAt = nowHM(); await saveDay(day); } });
        } }],
      });
    } catch (e) {
      prog.close(); console.error(e); toast('Gagal membuat PDF: ' + e.message, 5000);
    }
  }
}
