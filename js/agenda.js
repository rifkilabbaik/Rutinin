// AGENDA KERJA — ketik jam + judul; sisanya ditebak dari riwayat, dicek di 1 halaman, lalu kirim
import { $, $$, esc, icon, iso, uid, clone, hari, tglPanjang, tglPendek, menit, dariMenit, nowHM, toast, sheet, chips, debounce, linesOf, sentence, confirmBox } from './util.js';
import {
  getSettings, getDay, saveDay, allDays, activeOpenItems, allOpenItems, saveOpenItem, deleteOpenItem, nextCaseId,
  memList, remember, rememberTitle, lookupTitle, titleSuggestions, allDecisions, saveDecisions, newDecision, getKamus, saveKamus, REFS,
} from './store.js';
import { suggestDetails, guessKind, unknownWords } from './smart.js';

const KIND = { kerja: 'Kerja', rutin: 'Rutin', tetap: 'Tetap' };
const newItem = (date, start, end) => ({ id: uid(), start, end, title: '', details: [], kind: 'kerja', star: false, label: '🎯', target: date, oi: true, caseId: null, ref: '', pics: [], desc: '', support: null, auto: true });
const short = t => (t.length > 34 ? t.slice(0, 32) + '…' : t);

function freeSlot(items, dur = 60) {
  let t = 8 * 60;
  for (const it of [...items].sort((a, b) => menit(a.start) - menit(b.start))) { if (t + dur <= menit(it.start)) break; t = Math.max(t, menit(it.end)); }
  return [dariMenit(t), dariMenit(Math.min(t + dur, 1439))];
}

export async function render(v, params, { go, topActions }) {
  const date = params.get('d') || iso();
  const s = await getSettings();
  const day = await getDay(date);
  topActions.innerHTML = `<label class="pt" style="height:36px;padding:0 14px;cursor:pointer;position:relative">${hari(date).slice(0, 3)}, ${tglPendek(date)}<input type="date" id="pickDate" value="${date}" style="position:absolute;inset:0;opacity:0"></label>`;
  $('#pickDate', topActions).onchange = e => e.target.value && go('agenda', { d: e.target.value });

  if (day.type !== 'kerja') {
    const app = await import('./app.js');
    v.innerHTML = `<section class="hero"><span class="bubble b1"></span><span class="bubble b2"></span><div class="hero-label">${esc(tglPanjang(date))}</div><div class="hero-big">${esc(day.off)}</div></section>
      <button class="btn btn-primary btn-big" id="send">${icon('send')}Kirim keterangan</button><button class="btn btn-soft" id="work">Ubah jadi hari kerja</button>`;
    $('#send', v).onclick = () => app.dayOffFlow(date);
    $('#work', v).onclick = async () => { day.type = 'kerja'; day.off = ''; await saveDay(day); go('agenda', { d: date }); };
    return;
  }

  day.agenda ||= { items: s.routine.map(r => ({ ...newItem(date, r.start, r.end), ...clone(r), id: uid(), oi: false, auto: false })), pendukung: [], support: [], decisionIds: [], final: false, sentAt: null };
  const A = day.agenda;
  const persist = debounce(() => saveDay(day), 400);
  const touch = () => { A.final = false; persist(); };
  const open = new Set();
  const titles = await titleSuggestions();

  v.innerHTML = `
    ${A.sentAt ? `<span class="pt ok" style="align-self:flex-start">${icon('check')} Terkirim ${esc(A.sentAt)}</span>` : ''}
    <div id="carry"></div>
    <div class="tl" id="tl"></div>
    <button class="btn btn-soft" id="add">${icon('plus')}Kegiatan</button>
    <div class="sticky-actions"><button class="btn btn-primary btn-big" id="next">${icon('sparkle')}Lengkapi</button></div>
    <datalist id="dl-titles">${titles.map(t => `<option value="${esc(t)}">`).join('')}</datalist>`;
  const tl = $('#tl', v);
  const sorted = () => [...A.items].sort((a, b) => menit(a.start) - menit(b.start));

  // ---------- Lanjutkan dari kemarin ----------
  async function carryList() {
    const have = new Set(A.items.map(i => i.caseId).filter(Boolean));
    const haveT = new Set(A.items.map(i => i.title.toLowerCase()));
    const last = (await allDays()).filter(d => d.date < date && d.type === 'kerja' && d.agenda).sort((a, b) => b.date.localeCompare(a.date))[0];
    const fromDay = (last?.agenda.items || []).filter(i => i.kind !== 'tetap' && !i.caseId && ['progress', 'not'].includes(last.laporan?.results?.[i.id]?.status) && !haveT.has(i.title.toLowerCase()))
      .map(i => ({ title: i.title, details: i.details, kind: i.kind }));
    const ois = (await activeOpenItems(date)).filter(o => !have.has(o.caseId) && !haveT.has(o.desc.toLowerCase()))
      .map(o => ({ title: o.desc.replace(/\.$/, ''), caseId: o.caseId, ref: o.ref, pics: o.pic || [], target: o.target >= date ? o.target : date, desc: o.desc }));
    return [...fromDay, ...ois];
  }
  async function drawCarry() {
    const c = await carryList();
    $('#carry', v).innerHTML = c.length ? `<button class="btn btn-soft btn-block" id="carryBtn">${icon('sync')}Lanjutkan dari kemarin (${c.length})</button>` : '';
    $('#carryBtn', v) && ($('#carryBtn', v).onclick = async () => {
      for (const x of await carryList()) {
        const [st, en] = freeSlot(A.items);
        const mem = await lookupTitle(x.title);
        A.items.push({ ...newItem(date, st, en), ...x, details: x.details?.length ? x.details : mem?.details?.length ? [...mem.details] : suggestDetails(x.title) });
      }
      touch(); drawList(); drawCarry(); toast('Pekerjaan kemarin dimasukkan');
    });
  }

  // ---------- Timeline ----------
  function itemHTML(it) {
    const o = open.has(it.id);
    return `<div class="tl-item k-${it.kind}" data-id="${it.id}">
      <div class="tl-time"><input type="time" data-f="start" value="${it.start}"><span class="muted">–</span><input type="time" data-f="end" value="${it.end}"><span class="spacer"></span>
        ${it.kind !== 'kerja' ? `<span class="muted">${it.kind}</span>` : ''}
        ${it.kind !== 'tetap' ? `<button class="star ${it.star ? 'on' : ''}" data-a="star" aria-label="Prioritas">${icon('star')}</button>` : ''}
        <button class="icon-btn flat sm" data-a="${o ? 'close' : 'open'}" aria-label="Ubah">${icon(o ? 'check' : 'edit')}</button></div>
      <input class="tl-title" data-f="title" list="dl-titles" placeholder="Nama kegiatan…" value="${esc(it.title)}" enterkeyhint="done">
      ${o ? `${it.kind !== 'tetap' ? `<textarea class="tl-details" data-f="details" rows="3" placeholder="Rincian, satu baris satu poin">${esc(it.details.join('\n'))}</textarea>` : ''}
        <div class="tl-tools"><div class="seg seg-mini">${Object.entries(KIND).map(([k, l]) => `<button data-kind="${k}" class="${it.kind === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        ${it.kind !== 'tetap' ? `<button class="icon-btn flat sm" data-a="ai" aria-label="Isi otomatis">${icon('sparkle')}</button>` : ''}<button class="icon-btn flat sm" data-a="del" aria-label="Hapus">${icon('trash')}</button></div>`
        : it.kind !== 'tetap' && it.details.length ? `<button class="det" data-a="open">${it.details.slice(0, 2).map(d => '• ' + esc(d)).join('<br>')}${it.details.length > 2 ? ' …' : ''}${it.auto ? ' <span class="pt sun mini">✨</span>' : ''}</button>` : ''}
    </div>`;
  }
  const drawList = () => { tl.innerHTML = sorted().map(itemHTML).join('') || `<div class="card"><div class="empty-state">Tekan <b>+ Kegiatan</b> untuk mulai.</div></div>`; };
  const findIt = el => A.items.find(i => i.id === el.closest('.tl-item')?.dataset.id);
  const redraw = it => { const n = tl.querySelector(`[data-id="${it.id}"]`); if (n) n.outerHTML = itemHTML(it); };

  async function autoFill(it, force) {
    const mem = await lookupTitle(it.title);
    if (!it._kindSet) { it.kind = guessKind(it.title, mem, s.routine); it.oi = it.kind === 'kerja'; if (it.kind === 'tetap') it.star = false; }
    if (it.kind !== 'tetap' && (force || it.auto || !it.details.length)) { it.details = mem?.details?.length ? [...mem.details] : suggestDetails(it.title); it.auto = true; }
  }

  tl.addEventListener('input', e => {
    const f = e.target.dataset.f, it = findIt(e.target); if (!f || !it) return;
    if (f === 'title') it.title = e.target.value;
    if (f === 'details') { it.details = linesOf(e.target.value); it.auto = false; }
    touch();
  });
  tl.addEventListener('change', async e => {
    const f = e.target.dataset.f, it = findIt(e.target); if (!f || !it) return;
    if (f === 'start' || f === 'end') {
      it[f] = e.target.value;
      if (menit(it.end) <= menit(it.start)) it.end = dariMenit(Math.min(menit(it.start) + 60, 1439));
      touch(); drawList();
    }
    if (f === 'title') { it.title = e.target.value.trim(); if (it.title) await autoFill(it); touch(); redraw(it); }
  });
  tl.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const it = findIt(b); if (!it) return;
    if (b.dataset.kind) { it.kind = b.dataset.kind; it._kindSet = true; it.oi = it.kind === 'kerja'; if (it.kind === 'tetap') it.star = false; touch(); redraw(it); return; }
    const a = b.dataset.a;
    if (a === 'star') {
      if (!it.star && A.items.filter(i => i.star).length >= 3) { toast('Maksimal 3 prioritas'); return; }
      it.star = !it.star; touch(); b.classList.toggle('on', it.star);
    }
    if (a === 'open') { open.add(it.id); redraw(it); }
    if (a === 'close') { open.delete(it.id); redraw(it); }
    if (a === 'del') {
      if (it.title && !(await confirmBox(`Hapus "${it.title}"?`, { ok: 'Hapus' }))) return;
      A.items = A.items.filter(x => x !== it); touch(); drawList(); drawCarry();
    }
    if (a === 'ai') {
      if (!it.title) return toast('Isi nama kegiatan dulu');
      await autoFill(it, true); redraw(it);
      const ai = await import('./ai.js');
      if (await ai.enabled()) {
        toast('✨ AI menulis rincian…');
        const mem = await lookupTitle(it.title);
        const out = await ai.run('details', { title: it.title, examples: mem?.details });
        if (out?.length) { it.details = out; it.auto = true; touch(); redraw(it); }
      }
    }
  });

  $('#add', v).onclick = () => {
    const [st, en] = freeSlot(A.items);
    const it = newItem(date, st, en);
    A.items.push(it); touch(); drawList();
    const n = tl.querySelector(`[data-id="${it.id}"] .tl-title`);
    n?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => n?.focus(), 250);
  };
  drawList(); drawCarry();

  // ---------- Lengkapi: 1 halaman ----------
  $('#next', v).onclick = async () => {
    $$('.tl-title', tl).forEach(inp => { const it = findIt(inp); if (it) it.title = inp.value.trim(); });
    A.items = A.items.filter(i => i.title);
    if (!A.items.some(i => i.kind !== 'tetap')) { drawList(); return toast('Tambahkan minimal satu kegiatan'); }
    for (const it of A.items) if (it.kind !== 'tetap' && !it.details.length) await autoFill(it);
    drawList();
    await lengkapi();
  };

  async function lengkapi() {
    const work = () => sorted().filter(i => i.kind !== 'tetap');
    const kerja = () => sorted().filter(i => i.kind === 'kerja');
    const [memRefs, memPics, memSup, memDec, memAl, memPend, kamus, decAll] = await Promise.all([
      memList('refs', REFS), memList('pics'), memList('supportPics'), memList('decisions'), memList('alasan'), memList('pendukung'), getKamus(), allDecisions()]);
    const pend = decAll.filter(d => d.status === 'pending' && d.created < date);
    let drafts = decAll.filter(d => d.created === date && A.decisionIds.includes(d.id));
    const dropped = new Set();
    const editOI = new Set();
    // tebakan dari riwayat
    for (const it of work()) {
      const mem = await lookupTitle(it.title);
      if (!it.ref && mem?.ref) { it.ref = mem.ref; it._pred = true; }
      if (!it.pics?.length) { it.pics = mem?.pics?.length ? [...mem.pics] : [s.nama].filter(Boolean); }
      if (it.support === null && mem?.support) { it.support = { ...mem.support }; it._predSup = true; }
    }
    if (!A.items.some(i => i.star)) [...kerja()].sort((a, b) => (menit(b.end) - menit(b.start)) - (menit(a.end) - menit(a.start))).slice(0, 3).forEach(i => { i.star = true; i._predStar = true; });
    if (!A.pendukung.length && memPend.length) A.pendukung = memPend.slice(0, 3);
    const words = unknownWords(work().flatMap(i => [i.title, ...i.details]), kamus);
    const kw = Object.fromEntries(words.map(w => [w, '']));

    const sh = sheet({ title: 'Cek sebelum PDF', full: true, html: '<div class="stack" id="ck" style="gap:12px"></div>', actions: [{ label: 'Buat PDF', primary: true, onClick: () => submit() }] });
    const body = $('#ck', sh.el);

    function draw() {
      body.innerHTML = `
        ${words.length ? `<section class="wiz-card"><h4>Kata baru</h4>${words.map(w => `<div class="kw"><span><b>${esc(w)}</b>, maksud Anda:</span>
          <div class="field"><input data-kw="${esc(w)}" placeholder="kepanjangan ${esc(w)}" value="${esc(kw[w])}"></div></div>`).join('')}<p class="hint">Disimpan ke Kamus supaya ke depan dimengerti. Kosongkan untuk lewati.</p></section>` : ''}
        <section class="wiz-card"><h4>A. Prioritas ${work().some(i => i._predStar) ? '<span class="pt sun mini">✨ ditebak</span>' : ''}</h4>
          ${work().map(it => `<div class="pr" data-id="${it.id}"><button class="chip ${it.star ? 'on' : ''}" data-p="star">${it.star ? it.label + ' ' : ''}${esc(short(it.title))}</button>
            ${it.star ? `<div class="seg seg-mini"><button data-p="lab" data-v="🎯" class="${it.label !== '▶️' ? 'on' : ''}">🎯 Hari ini</button><button data-p="lab" data-v="▶️" class="${it.label === '▶️' ? 'on' : ''}">▶️ Mulai</button></div>
            ${it.label === '▶️' ? `<div class="field"><span class="muted">Target</span><input type="date" data-p="target" value="${it.target > date ? it.target : ''}" min="${date}"></div>` : ''}` : ''}</div>`).join('')}
        </section>
        ${kerja().length ? `<section class="wiz-card"><h4>C. Open Item ${kerja().some(i => i._pred) ? '<span class="pt sun mini">✨ dari riwayat</span>' : ''}</h4>
          ${kerja().map(it => { const ed = editOI.has(it.id) || (it.oi && !it.ref); return `<div class="oi-row" data-id="${it.id}">
            <div class="oi-sum"><span class="row-main"><span class="row-t">${esc(short(it.title))}</span><span class="row-s">${it.oi ? `${it.caseId ? esc(it.caseId) + ' · ' : ''}${esc(it.ref || 'pilih referensi')} · ${esc((it.pics || []).join(', '))}` : 'bukan Open Item'}</span></span>
              ${ed ? '' : '<button class="btn btn-text btn-sm" data-o="edit">ubah</button>'}</div>
            ${ed ? `<label class="toggle-row"><span class="spacer">Catat sebagai Open Item</span><span class="switch"><input type="checkbox" data-o="oi" ${it.oi ? 'checked' : ''}><span></span></span></label>
              ${it.oi ? `<span class="label">Referensi</span><div class="chips" data-c="ref"></div><span class="label">PIC</span><div class="chips" data-c="pics"></div>` : ''}` : ''}
          </div>`; }).join('')}</section>` : ''}
        <section class="wiz-card"><h4>D. Need Support ${work().some(i => i._predSup) ? '<span class="pt sun mini">✨ dari riwayat</span>' : ''}</h4>
          ${work().map(it => `<div class="sp" data-id="${it.id}"><span class="row-s">${esc(short(it.title))}</span><div class="chips" data-c="sp"></div></div>`).join('')}
        </section>
        <section class="wiz-card"><h4>E. Need Decision</h4>
          ${pend.map(d => `<div class="sp" data-pd="${d.id}"><span class="row-t" style="font-size:14px">${esc(d.what)}</span><div class="seg seg-mini"><button data-keep="1" class="${!dropped.has(d.id) ? 'on' : ''}">Masih dibutuhkan</button><button data-keep="0" class="${dropped.has(d.id) ? 'on' : ''}">Tidak perlu</button></div></div>`).join('')}
          ${drafts.map((d, k) => `<div class="stack" data-d="${k}"><div class="field"><input data-f="what" list="dl-dec" placeholder="Keputusan yang dibutuhkan" value="${esc(d.what)}"></div>
            <div class="field"><input data-f="reason" list="dl-al" placeholder="Alasan / dampaknya" value="${esc(d.reason)}"></div><button class="btn btn-text btn-sm" data-ddel="${k}">Hapus</button></div>`).join('')}
          <button class="btn btn-soft btn-sm" data-dadd>${icon('plus')}${pend.length || drafts.length ? 'Keputusan baru' : 'Ada keputusan'}</button>
          <datalist id="dl-dec">${[...work().map(i => `Persetujuan ${i.title}`), ...memDec].map(p => `<option value="${esc(p)}">`).join('')}</datalist>
          <datalist id="dl-al">${memAl.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
        </section>
        <section class="wiz-card"><h4>📋 Pekerjaan pendukung</h4><div class="chips" id="pendc"></div></section>`;
      for (const row of $$('.oi-row', body)) {
        const it = A.items.find(i => i.id === row.dataset.id);
        const r = $('[data-c="ref"]', row), p = $('[data-c="pics"]', row);
        if (r) chips(r, { options: memRefs, selected: it.ref ? [it.ref] : [], onChange: x => { it.ref = x[0] || ''; it._pred = false; } });
        if (p) chips(p, { options: [s.nama, ...memPics].filter(Boolean), selected: it.pics || [], multi: true, onChange: x => it.pics = x });
      }
      for (const row of $$('.sp[data-id]', body)) {
        const it = A.items.find(i => i.id === row.dataset.id);
        chips($('[data-c="sp"]', row), { options: memSup, selected: it.support?.pic ? [it.support.pic] : [], addLabel: '+ PIC', onChange: x => { it.support = x[0] ? { pic: x[0], what: it.title } : false; it._predSup = false; } });
      }
      chips($('#pendc', body), { options: memPend, selected: A.pendukung, multi: true, addLabel: '+ Tambah', onChange: x => A.pendukung = x });
    }
    body.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return;
      const row = t.closest('[data-id]'); const it = row && A.items.find(i => i.id === row.dataset.id);
      if (t.dataset.p === 'star' && it) {
        if (!it.star && A.items.filter(i => i.star).length >= 3) return toast('Maksimal 3 prioritas');
        it.star = !it.star; work().forEach(i => delete i._predStar); draw();
      }
      if (t.dataset.p === 'lab' && it) { it.label = t.dataset.v; if (it.label === '🎯') it.target = date; draw(); }
      if (t.dataset.o === 'edit' && it) { editOI.add(it.id); draw(); }
      if (t.dataset.keep) { const id = t.closest('[data-pd]').dataset.pd; t.dataset.keep === '1' ? dropped.delete(id) : dropped.add(id); draw(); }
      if (t.hasAttribute('data-dadd')) { drafts.push(newDecision(date)); draw(); }
      if (t.dataset.ddel) { drafts.splice(+t.dataset.ddel, 1); draw(); }
    });
    body.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.kw) kw[t.dataset.kw] = t.value;
      const d = t.closest('[data-d]'); if (d && t.dataset.f) drafts[+d.dataset.d][t.dataset.f] = t.value;
    });
    body.addEventListener('change', e => {
      const t = e.target; const row = t.closest('[data-id]'); const it = row && A.items.find(i => i.id === row.dataset.id);
      if (t.dataset.p === 'target' && it) it.target = t.value || date;
      if (t.dataset.o === 'oi' && it) { it.oi = t.checked; draw(); }
    });
    draw();

    // tebak kepanjangan singkatan dengan AI (di belakang layar)
    if (words.length) import('./ai.js').then(async ai => {
      if (!(await ai.enabled())) return;
      for (const w of words) {
        if (kw[w]) continue;
        const ctx = work().find(i => i.title.includes(w))?.title || w;
        const g = await ai.run('meaning', { word: w, context: ctx });
        if (g && !kw[w]) { kw[w] = g; const inp = body.querySelector(`[data-kw="${w}"]`); if (inp && !inp.value) inp.value = g; }
      }
    });

    async function submit() {
      const p = A.items.filter(i => i.star);
      if (!p.length) return toast('Pilih minimal 1 prioritas');
      const noT = p.find(i => i.label === '▶️' && !(i.target > date)); if (noT) return toast(`Isi target untuk "${short(noT.title)}"`);
      const noRef = kerja().find(i => i.oi && !i.ref); if (noRef) { editOI.add(noRef.id); draw(); return toast(`Pilih referensi untuk "${short(noRef.title)}"`); }
      drafts = drafts.filter(d => d.what.trim());
      const noR = drafts.find(d => !d.reason.trim()); if (noR) return toast('Isi alasan keputusan');
      // simpan kamus & keputusan
      const kwE = Object.entries(kw).filter(([, a]) => a.trim()); if (kwE.length) await saveKamus(kwE);
      const all = await allDecisions();
      const ids = new Set(drafts.map(d => d.id));
      const kept = all.filter(d => !(d.created === date && A.decisionIds.includes(d.id) && !ids.has(d.id)));
      for (const d of drafts) { const i = kept.findIndex(x => x.id === d.id); if (i >= 0) kept[i] = d; else kept.push(d); }
      for (const d of kept) if (dropped.has(d.id)) { d.status = 'dropped'; d.decidedDate = date; }
      await saveDecisions(kept);
      A.decisionIds = drafts.map(d => d.id);
      await remember('decisions', drafts.map(d => d.what)); await remember('alasan', drafts.map(d => d.reason));
      A.support = work().filter(i => i.support?.pic).map(i => ({ what: i.support.what || i.title, pic: i.support.pic }));
      sh.close();
      await finalize();
    }
  }

  // ---------- Simpan: Case ID, memori, PDF ----------
  async function finalize() {
    for (const it of sorted()) {
      const isOI = it.kind === 'kerja' && it.oi;
      const all = await allOpenItems();
      const o = it.caseId && all.find(x => x.caseId === it.caseId);
      if (isOI && !it.caseId) {
        it.caseId = await nextCaseId(date);
        await saveOpenItem({ caseId: it.caseId, desc: it.desc || sentence(it.title), ref: it.ref, pic: it.pics, target: it.target || date, status: 'planned', created: date, agendaDate: date, history: [] });
      } else if (isOI && o) {
        Object.assign(o, { ref: it.ref || o.ref, pic: it.pics?.length ? it.pics : o.pic, target: it.star && it.label === '▶️' ? it.target : o.target });
        await saveOpenItem(o);
      } else if (!isOI && it.caseId) {
        if (o && o.agendaDate === date && !o.history?.length) await deleteOpenItem(o.caseId);
        it.caseId = null;
      }
    }
    const used = new Set(A.items.map(i => i.caseId).filter(Boolean));
    for (const o of await allOpenItems()) if (o.agendaDate === date && !used.has(o.caseId) && !o.history?.length) await deleteOpenItem(o.caseId);
    for (const it of A.items) {
      delete it._pred; delete it._predSup; delete it._predStar;
      if (it.kind !== 'tetap') await rememberTitle({ title: it.title, details: it.details, kind: it.kind, ref: it.ref, pics: it.pics, desc: it.desc, support: it.support?.pic ? { pic: it.support.pic, what: it.support.what } : null });
    }
    await remember('refs', A.items.map(i => i.ref)); await remember('pics', A.items.flatMap(i => i.pics || []).filter(p => p !== s.nama));
    await remember('supportPics', A.support.map(x => x.pic)); await remember('pendukung', A.pendukung);
    A.final = true;
    await saveDay(day);
    drawList(); drawCarry();

    const { agendaBlocks } = await import('./docs.js');
    const { sendDoc } = await import('./send.js');
    const openItems = await activeOpenItems(date);
    const decs = (await allDecisions()).filter(d => d.status === 'pending' && d.created <= date && (d.created < date || A.decisionIds.includes(d.id)));
    await sendDoc({ kind: 'agenda', blocks: agendaBlocks(s, day, { openItems, decisions: decs }), s, day, onSent: async () => { A.sentAt = nowHM(); await saveDay(day); toast('Agenda terkirim ✓'); } });
  }
}
