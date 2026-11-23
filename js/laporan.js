// LAPORAN KERJA — tap status per kegiatan; realisasi/kendala/ringkasan/refleksi terisi otomatis (✨), dicek di 1 halaman
import { $, $$, esc, icon, iso, uid, addDays, hari, tglPanjang, tglPendek, nowHM, toast, sheet, chips, debounce, linesOf, compressImage, norm } from './util.js';
import {
  getSettings, getDay, saveDay, allOpenItems, saveOpenItem, allDecisions, saveDecisions, newDecision, memList, remember, rememberTitle,
  lookupTitle, memMap, rememberMap, savePhoto, getPhoto, deletePhoto, queueUpload, STATUS, FINAL,
} from './store.js';
import { suggestRealisasi, progressDefault, draftSummary, draftRefleksi } from './smart.js';
import { REFLEKSI_Q, sortItems } from './docs.js';

const SYM = { done: '✓', progress: '½', not: '✕' };
const LBL = { done: 'Selesai', progress: 'Progress', not: 'Belum' };
const NEXT = { progress: '🟨 Lanjut', hold: '⬜ Hold', delegated: '🟪 Delegasi', cancelled: '🟥 Batal' };
const blank = () => ({ results: {}, extra: [], oiUpd: {}, support: null, decisionIds: [], summary: null, refleksi: null, final: false, sentAt: null });

export async function render(v, params, { go, topActions }) {
  const date = params.get('d') || iso();
  const s = await getSettings();
  const day = await getDay(date);
  topActions.innerHTML = `<label class="pt" style="height:36px;padding:0 14px;cursor:pointer;position:relative">${hari(date).slice(0, 3)}, ${tglPendek(date)}<input type="date" id="pickDate" value="${date}" style="position:absolute;inset:0;opacity:0"></label>`;
  $('#pickDate', topActions).onchange = e => e.target.value && go('laporan', { d: e.target.value });

  if (day.type !== 'kerja') {
    v.innerHTML = `<section class="hero"><span class="bubble b1"></span><span class="bubble b2"></span><div class="hero-label">${esc(tglPanjang(date))}</div><div class="hero-big">${esc(day.off)}</div></section>
      <button class="btn btn-primary btn-big" id="send">${icon('send')}Kirim keterangan</button>`;
    $('#send', v).onclick = async () => (await import('./app.js')).dayOffFlow(date);
    return;
  }
  if (!day.agenda && !day.laporan) {
    v.innerHTML = `<section class="card"><div class="empty-state"><span>${icon('agenda')}</span>Agenda hari ini belum dibuat.</div>
      <a class="btn btn-primary" href="#/agenda?d=${date}">Buat Agenda</a><button class="btn btn-soft" id="noag">Lapor tanpa agenda</button></section>`;
    $('#noag', v).onclick = async () => { day.laporan = blank(); await saveDay(day); render(v, params, { go, topActions }); };
    return;
  }

  const L = day.laporan ||= blank();
  const A = day.agenda || { items: [], support: [], decisionIds: [] };
  const persist = debounce(() => saveDay(day), 400);
  const touch = () => { L.final = false; persist(); };
  const urls = {};
  const photoUrl = async id => urls[id] ||= URL.createObjectURL((await getPhoto(id))?.blob || new Blob());
  const work = () => [...sortItems(A.items.filter(i => i.kind !== 'tetap')), ...L.extra];
  const res = it => (L.results[it.id] ||= { status: '', realisasi: '', kendala: '', photos: [], auto: true });

  v.innerHTML = `
    ${L.sentAt ? `<span class="pt ok" style="align-self:flex-start">${icon('check')} Terkirim ${esc(L.sentAt)}</span>` : ''}
    <div class="lbar"><span><b id="cnt"></b> selesai</span><div class="progress"><i id="pb"></i></div><button class="btn btn-soft btn-sm" id="all">${icon('check')}Semua selesai</button></div>
    <div class="stack" id="list" style="gap:10px"></div>
    <button class="link" id="addx">${icon('plus')}Pekerjaan tambahan</button>
    <div class="sticky-actions"><button class="btn btn-primary btn-big" id="next">${icon('sparkle')}Buat Laporan</button></div>`;
  const list = $('#list', v);

  async function setStatus(it, st) {
    const r = res(it); const mem = await lookupTitle(it.title);
    r.status = st;
    if (r.auto || !r.realisasi) { r.realisasi = suggestRealisasi(it.title, st, mem); r.auto = true; }
    if (st === 'done') r.kendala = ''; else if (!r.kendala && mem?.kendala) r.kendala = mem.kendala;
    if (!L.summaryEdited) L.summary = null;
    touch();
  }
  function rowHTML(it) {
    const r = res(it);
    return `<div class="lr" data-id="${it.id}">
      <div class="lt"><b class="t">${esc(it.title) || '<span class="muted">Tanpa judul</span>'}</b><span class="st">${Object.keys(SYM).map(k => `<button class="s ${k} ${r.status === k ? 'on' : ''}" data-st="${k}" aria-label="${LBL[k]}">${SYM[k]}</button>`).join('')}</span></div>
      ${r.status ? `<p class="ai">${r.auto ? '✨ ' : ''}${esc(r.realisasi)}${r.status !== 'done' ? `<br><span class="k">${r.kendala ? 'Kendala: ' + esc(r.kendala) : 'Kendala belum diisi'}</span>` : ''}</p>` : '<p class="ai muted">Tap status</p>'}
      ${r.photos.length ? `<span class="ph1">${icon('camera')} ${r.photos.length}</span>` : ''}
    </div>`;
  }
  function drawList() {
    const W = work();
    list.innerHTML = W.map(rowHTML).join('') || `<div class="card"><div class="empty-state">Belum ada pekerjaan.</div></div>`;
    const d = W.filter(i => res(i).status === 'done').length;
    $('#cnt', v).textContent = `${d}/${W.length}`;
    $('#pb', v).style.width = (W.length ? d / W.length * 100 : 0) + '%';
  }
  list.addEventListener('click', async e => {
    const row = e.target.closest('.lr'); if (!row) return;
    const it = work().find(i => i.id === row.dataset.id);
    const b = e.target.closest('[data-st]');
    if (b) { await setStatus(it, b.dataset.st); drawList(); return; }
    edit(it);
  });
  $('#all', v).onclick = async () => { for (const it of work()) await setStatus(it, 'done'); drawList(); };
  $('#addx', v).onclick = () => { const it = { id: uid(), title: '', kind: 'kerja', extra: true }; L.extra.push(it); edit(it, true); };

  // ---------- B. Ubah satu kegiatan ----------
  async function edit(it, isNew = false) {
    const r = res(it);
    const mem = await lookupTitle(it.title);
    const [memKend, memPics, oiAll] = await Promise.all([memList('kendala'), memList('pics'), allOpenItems()]);
    const oi = it.caseId && oiAll.find(o => o.caseId === it.caseId);
    const u = it.caseId ? (L.oiUpd[it.caseId] ||= {}) : null;
    const sh = sheet({ title: isNew ? 'Pekerjaan tambahan' : it.title, html: '<div class="stack" id="ed" style="gap:10px"></div>',
      actions: [...(it.extra ? [{ label: 'Hapus', cls: 'btn-danger', onClick: x => { L.extra = L.extra.filter(i => i !== it); touch(); x.close(); drawList(); } }] : []),
        { label: 'Simpan', primary: true, onClick: x => { if (it.extra && !it.title.trim()) { L.extra = L.extra.filter(i => i !== it); } touch(); x.close(); drawList(); } }] });
    sh.onClose = () => { if (it.extra && !it.title.trim()) L.extra = L.extra.filter(i => i !== it); drawList(); };
    const box = $('#ed', sh.el);
    async function draw() {
      const sugg = [...new Set([r.status && suggestRealisasi(it.title, r.status, mem), mem?.real?.[r.status]].filter(x => x && x !== r.realisasi))];
      const ph = await Promise.all(r.photos.map(async id => `<span class="ph" style="background-image:url(${await photoUrl(id)})"><button data-delph="${id}" aria-label="Hapus foto">✕</button></span>`));
      if (u && r.status && r.status !== 'done') { u.next ||= 'progress'; u.target ||= oi && oi.target > date ? oi.target : addDays(date, 1); }
      box.innerHTML = `
        ${it.extra ? `<div class="field"><input data-x="title" placeholder="Nama pekerjaan" value="${esc(it.title)}"></div>` : ''}
        <div class="seg seg-mini status">${Object.keys(LBL).map(k => `<button data-v="${k}" class="${r.status === k ? 'on' : ''}">${LBL[k]}</button>`).join('')}</div>
        ${r.status ? `<span class="label">Realisasi ${r.auto ? '<span class="pt sun mini">✨ cek dulu</span>' : ''}</span>
          <div class="field"><input data-x="realisasi" value="${esc(r.realisasi)}"></div>
          ${sugg.length ? `<div class="chips">${sugg.map(x => `<button class="chip" data-sug="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}` : ''}
        ${r.status && r.status !== 'done' ? `<span class="label">Kendala</span><div class="chips" id="kc"></div>` : ''}
        ${u && r.status && r.status !== 'done' ? `<span class="label">Kelanjutan Open Item</span>
          <div class="chips">${Object.entries(NEXT).map(([k, l]) => `<button class="chip ${u.next === k ? 'on' : ''}" data-nx="${k}">${l}${k === 'progress' ? ' ' + tglPendek(u.target) : ''}</button>`).join('')}</div>
          ${u.next === 'progress' ? `<div class="field"><span class="muted">Target baru</span><input type="date" data-x="target" value="${u.target}" min="${date}"></div>` : ''}
          ${u.next === 'delegated' ? '<div class="chips" id="dc"></div>' : ''}` : ''}
        <span class="label">Foto (opsional)</span>
        <div class="photos">${ph.join('')}<label class="ph" aria-label="Tambah foto">${icon('camera')}<input type="file" accept="image/*" multiple hidden data-ph></label></div>`;
      const kc = $('#kc', box);
      if (kc) chips(kc, { options: [mem?.kendala, ...memKend].filter(Boolean), selected: r.kendala ? [r.kendala] : [], addLabel: '+ Tulis', onChange: x => { r.kendala = x[0] || ''; touch(); } });
      const dc = $('#dc', box);
      if (dc) chips(dc, { options: memPics, selected: u.delegate ? [u.delegate] : [], addLabel: '+ PIC', onChange: x => { u.delegate = x[0] || ''; touch(); } });
    }
    box.addEventListener('click', async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.v) { await setStatus(it, t.dataset.v); draw(); }
      if (t.dataset.sug) { r.realisasi = t.dataset.sug; r.auto = false; touch(); draw(); }
      if (t.dataset.nx) { u.next = t.dataset.nx; touch(); draw(); }
      if (t.dataset.delph) { r.photos = r.photos.filter(x => x !== t.dataset.delph); await deletePhoto(t.dataset.delph); touch(); draw(); }
    });
    box.addEventListener('input', e => {
      const x = e.target.dataset.x; if (!x) return;
      if (x === 'title') it.title = e.target.value;
      if (x === 'realisasi') { r.realisasi = e.target.value; r.auto = false; }
      if (x === 'target') u.target = e.target.value;
      touch();
    });
    box.addEventListener('change', async e => {
      if (!e.target.hasAttribute('data-ph')) return;
      for (const f of e.target.files) r.photos.push(await savePhoto(await compressImage(f, 1600, 0.82), { date, item: it.id }));
      touch(); draw();
    });
    draw();
    if (isNew) setTimeout(() => $('[data-x="title"]', box)?.focus(), 300);
  }

  drawList();

  // ---------- Data laporan (dipakai halaman cek, PDF & AI) ----------
  const relevantOIs = async () => (await allOpenItems()).filter(o => o.created <= date && (!FINAL.includes(o.status) || o.history?.some(h => h.date === date))).sort((a, b) => a.caseId.localeCompare(b.caseId));
  async function model() {
    const kpi = work().map(it => { const r = res(it), st = r.status || 'not';
      return { title: it.title, caseId: it.caseId, kind: it.kind || 'kerja', star: !!it.star, status: st,
        target: it.extra ? 'Pekerjaan tambahan' : it.star && it.label === '▶️' && it.target > date ? `Dimulai, target ${tglPendek(it.target)}` : 'Selesai hari ini',
        realisasi: r.realisasi || '-', kendala: st !== 'done' ? r.kendala : '' }; });
    const linked = Object.fromEntries(work().filter(i => i.caseId).map(i => [i.caseId, i]));
    const problem = (await relevantOIs()).map(o => {
      const it = linked[o.caseId], u = L.oiUpd[o.caseId] || {}, h = o.history?.find(x => x.date === date);
      let status = o.status, progress = h?.progress || 'Belum ada progress hari ini', kendala = h?.kendala || '-';
      if (it) { const r = res(it), st = r.status || 'not'; status = st === 'done' ? 'done' : u.next || 'progress'; progress = r.realisasi || progressDefault(st); kendala = st !== 'done' && r.kendala || '-'; }
      else if (u.next) { status = u.next; progress = u.progress || '-'; kendala = u.kendala || '-'; }
      const target = status === 'progress' && u.target ? u.target : o.target;
      return { caseId: o.caseId, desc: o.desc, ref: o.ref, progress, kendala, pic: [...(o.pic || []), ...(status === 'delegated' && u.delegate ? ['→ ' + u.delegate] : [])].join(', '), target, targetShort: tglPendek(target), status, linked: !!it };
    });
    const decisions = (await allDecisions()).filter(d => d.created <= date && d.status !== 'dropped' && (d.status === 'pending' || d.decidedDate === date));
    return { date, kpi, problem, decisions, support: (L.support || []).filter(x => x.keep !== false), closed: problem.filter(p => p.status === 'done').length };
  }

  // ---------- C. Cek Laporan (1 halaman) ----------
  $('#next', v).onclick = async () => {
    const W = work().filter(i => i.title.trim());
    if (!W.length) return toast('Belum ada pekerjaan');
    const miss = W.find(i => !res(i).status); if (miss) return toast(`Tandai status "${miss.title}"`);
    await cek();
  };

  async function cek() {
    const [memKend, aSup, dampak] = await Promise.all([memList('kendala'), memMap('alasanSupport'), memMap('dampak')]);
    L.support ||= (A.support || []).map(x => ({ ...x, reason: aSup[norm(x.what)] || '', keep: true, auto: true }));
    for (const it of work()) if (it.caseId && res(it).status !== 'done') { const u = L.oiUpd[it.caseId] ||= {}; u.next ||= 'progress'; u.target ||= addDays(date, 1); }
    let decs = (await model()).decisions.map(d => ({ ...d }));
    for (const d of decs) if (d.status === 'pending' && !d.impact) { d.impact = dampak[norm(d.what)] || ''; d._auto = !!d.impact; }
    const m0 = await model();
    if (!L.summary) { L.summary = draftSummary(m0); L.summaryAuto = true; }
    if (!L.refleksi) { L.refleksi = draftRefleksi({ ...m0, nextTitles: m0.problem.filter(p => !FINAL.includes(p.status)).map(p => p.desc), lastUsulan: (await memList('usulan'))[0] || '' }); L.refAuto = true; }
    const openOI = new Set(); let showRef = false;

    const sh = sheet({ title: 'Cek Laporan', full: true, html: '<div class="stack" id="ck" style="gap:12px"></div>', actions: [{ label: 'Lihat PDF & Kirim', primary: true, onClick: () => submit() }] });
    const body = $('#ck', sh.el);
    async function draw() {
      const m = await model();
      const noK = work().filter(i => res(i).status !== 'done' && !res(i).kendala);
      body.innerHTML = `
        ${noK.length ? `<section class="wiz-card"><h4>Kendala belum diisi</h4>${noK.map(it => `<div class="sp" data-k="${it.id}"><span class="row-s">${esc(it.title)}</span><div class="chips"></div></div>`).join('')}</section>` : ''}
        <section class="wiz-card"><h4>A. Ringkasan ${L.summaryAuto ? '<span class="pt sun mini">✨ cek dulu</span>' : ''}<span class="ai-tag" id="aiSum"></span></h4>
          <div class="field ta"><textarea id="sum" rows="4">${esc(L.summary.join('\n'))}</textarea></div></section>
        ${m.problem.length ? `<section class="wiz-card"><h4>C. Open Item</h4>${m.problem.map(p => { const u = L.oiUpd[p.caseId] ||= {}; const ed = openOI.has(p.caseId); return `<div class="oi-row" data-oi="${esc(p.caseId)}">
          <div class="oi-sum"><span class="row-main"><span class="row-t" style="font-size:14px">${STATUS[p.status].e} ${esc(p.desc)}</span><span class="row-s">${esc(p.caseId)} · ${STATUS[p.status].l}${p.status === 'progress' ? ' · target ' + esc(p.targetShort) : ''}</span></span>${p.status === 'done' && p.linked ? '' : `<button class="btn btn-text btn-sm" data-oe>${ed ? 'tutup' : 'ubah'}</button>`}</div>
          ${ed ? (p.linked ? `<div class="chips">${Object.entries(NEXT).map(([k, l]) => `<button class="chip ${u.next === k ? 'on' : ''}" data-nx="${k}">${l}</button>`).join('')}</div>
              ${u.next === 'progress' ? `<div class="field"><span class="muted">Target</span><input type="date" data-u="target" value="${u.target || addDays(date, 1)}" min="${date}"></div>` : ''}
              ${u.next === 'delegated' ? `<div class="field"><input data-u="delegate" placeholder="Didelegasikan ke" value="${esc(u.delegate || '')}"></div>` : ''}`
            : `<div class="chips">${[['', 'Tetap'], ['progress', '🟨'], ['done', '🟩'], ['hold', '⬜'], ['delegated', '🟪'], ['cancelled', '🟥']].map(([k, l]) => `<button class="chip ${(u.next || '') === k ? 'on' : ''}" data-un="${k}">${l}</button>`).join('')}</div>
              ${u.next ? `<div class="field"><input data-u="progress" placeholder="Progress hari ini" value="${esc(u.progress || '')}"></div>` : ''}`) : ''}
        </div>`; }).join('')}</section>` : ''}
        <section class="wiz-card"><h4>D. Need Support ${L.support.some(x => x.auto && x.reason) ? '<span class="pt sun mini">✨ dari riwayat</span>' : ''}</h4>
          ${L.support.map((x, k) => `<div class="stack" data-s="${k}"><div class="toggle-row"><span class="row-main"><span class="row-t" style="font-size:14px">${esc(x.what) || 'Dukungan baru'}</span><span class="row-s">${esc(x.pic) || '-'}</span></span><span class="switch"><input type="checkbox" data-keep ${x.keep ? 'checked' : ''}><span></span></span></div>
            ${x.new ? `<div class="field"><input data-f="what" placeholder="Dukungan yang dibutuhkan" value="${esc(x.what)}"></div><div class="field"><input data-f="pic" placeholder="PIC / unit" value="${esc(x.pic)}"></div>` : ''}
            ${x.keep ? `<div class="field"><input data-f="reason" placeholder="Alasan kebutuhan" value="${esc(x.reason)}"></div>` : ''}</div>`).join('') || '<p class="hint">Tidak ada.</p>'}
          <button class="btn btn-text btn-sm" data-sadd>${icon('plus')}Dukungan</button></section>
        <section class="wiz-card"><h4>E. Need Decision ${decs.some(d => d._auto) ? '<span class="pt sun mini">✨ dari riwayat</span>' : ''}</h4>
          ${decs.map((d, k) => `<div class="stack" data-dk="${k}"><span class="row-t" style="font-size:14px">${esc(d.what)}</span>
            <div class="seg seg-mini"><button data-ds="pending" class="${d.status === 'pending' ? 'on' : ''}">Belum diputuskan</button><button data-ds="decided" class="${d.status === 'decided' ? 'on' : ''}">Sudah</button></div>
            ${!d.reason ? `<div class="field"><input data-f="reason" placeholder="Alasan" value=""></div>` : ''}
            <div class="field"><input data-f="${d.status === 'decided' ? 'answer' : 'impact'}" placeholder="${d.status === 'decided' ? 'Keputusannya' : 'Dampak bila belum diambil'}" value="${esc(d.status === 'decided' ? d.answer : d.impact)}"></div></div>`).join('') || '<p class="hint">Tidak ada.</p>'}
          <button class="btn btn-text btn-sm" data-dadd>${icon('plus')}Keputusan</button></section>
        <section class="wiz-card"><h4>F. Refleksi ${L.refAuto ? '<span class="pt sun mini">✨ cek dulu</span>' : ''}<span class="ai-tag" id="aiRef"></span><button class="btn btn-text btn-sm" data-ref style="margin-left:auto">${showRef ? 'tutup' : 'lihat'}</button></h4>
          ${showRef ? REFLEKSI_Q.map((q, i) => `<span class="label">${i + 1}. ${esc(q)}</span><div class="field ta"><textarea rows="2" data-ri="${i}">${esc(L.refleksi[i] || '')}</textarea></div>`).join('') : `<p class="hint">${esc(L.refleksi[0])} …</p>`}</section>`;
      for (const row of $$('[data-k]', body)) {
        const it = work().find(i => i.id === row.dataset.k);
        chips($('.chips', row), { options: memKend, selected: [], addLabel: '+ Tulis', onChange: x => { res(it).kendala = x[0] || ''; touch(); } });
      }
    }
    body.addEventListener('click', async e => {
      const t = e.target.closest('button'); if (!t) return;
      const oiRow = t.closest('[data-oi]'); const id = oiRow?.dataset.oi; const u = id && (L.oiUpd[id] ||= {});
      if (t.hasAttribute('data-oe')) { openOI.has(id) ? openOI.delete(id) : openOI.add(id); draw(); }
      if (t.dataset.nx) { u.next = t.dataset.nx; touch(); draw(); }
      if (t.dataset.un !== undefined) { u.next = t.dataset.un || undefined; touch(); draw(); }
      if (t.hasAttribute('data-sadd')) { L.support.push({ what: '', pic: '', reason: '', keep: true, new: true }); draw(); }
      if (t.dataset.ds) { const d = decs[+t.closest('[data-dk]').dataset.dk]; d.status = t.dataset.ds; d.decidedDate = d.status === 'decided' ? date : ''; draw(); }
      if (t.hasAttribute('data-dadd')) { const w = prompt('Keputusan yang dibutuhkan:'); if (w?.trim()) { const d = newDecision(date, w.trim()); d._new = true; decs.push(d); draw(); } }
      if (t.hasAttribute('data-ref')) { showRef = !showRef; draw(); }
    });
    body.addEventListener('input', e => {
      const t = e.target;
      if (t.id === 'sum') { L.summary = linesOf(t.value).slice(0, 5); L.summaryEdited = true; L.summaryAuto = false; }
      if (t.dataset.ri) { L.refleksi[+t.dataset.ri] = t.value; L.refAuto = false; L.refEdited = true; }
      const sr = t.closest('[data-s]'); if (sr && t.dataset.f) { const x = L.support[+sr.dataset.s]; x[t.dataset.f] = t.value; x.auto = false; }
      const dr = t.closest('[data-dk]'); if (dr && t.dataset.f) { const d = decs[+dr.dataset.dk]; d[t.dataset.f] = t.value; d._auto = false; }
      const or = t.closest('[data-oi]'); if (or && t.dataset.u) (L.oiUpd[or.dataset.oi] ||= {})[t.dataset.u] = t.value;
      touch();
    });
    body.addEventListener('change', e => { const sr = e.target.closest('[data-s]'); if (sr && e.target.hasAttribute('data-keep')) { L.support[+sr.dataset.s].keep = e.target.checked; draw(); } });
    await draw();

    // AI merapikan ringkasan & refleksi di belakang layar (tidak menimpa yang sudah kamu ubah)
    import('./ai.js').then(async ai => {
      if (!(await ai.enabled())) return;
      const tag = (id, t) => { const el = $('#' + id, body); if (el) el.textContent = t; };
      tag('aiSum', ' ✨ AI menulis…'); tag('aiRef', ' ✨ AI menulis…');
      const m = await model();
      const sum = await ai.run('summary', m);
      if (sum?.length && !L.summaryEdited) { L.summary = sum; L.summaryAuto = true; touch(); }
      const ref = await ai.run('refleksi', m);
      if (ref?.length === 5 && !L.refEdited) { L.refleksi = ref; L.refAuto = true; touch(); }
      if (document.body.contains(body)) draw();
    });

    async function submit() {
      const noK = work().find(i => res(i).status !== 'done' && !res(i).kendala); if (noK) return toast(`Isi kendala "${noK.title}"`);
      const dl = work().find(i => i.caseId && res(i).status !== 'done' && L.oiUpd[i.caseId]?.next === 'delegated' && !L.oiUpd[i.caseId].delegate); if (dl) return toast('Isi PIC delegasi');
      L.support = L.support.filter(x => x.what.trim());
      if (L.support.some(x => x.keep && !x.reason.trim())) return toast('Isi alasan dukungan');
      if (decs.some(d => !d.reason?.trim())) return toast('Isi alasan keputusan');
      if (decs.some(d => d.status === 'pending' && !d.impact?.trim())) return toast('Isi dampak keputusan');
      if (!L.summary?.length) return toast('Ringkasan masih kosong');
      if (L.refleksi.some(x => !String(x || '').trim())) { showRef = true; draw(); return toast('Lengkapi refleksi'); }
      const all = await allDecisions();
      for (const d of decs) { const { _auto, _new, ...clean } = d; const i = all.findIndex(x => x.id === d.id); if (i >= 0) all[i] = clean; else all.push(clean); }
      await saveDecisions(all);
      sh.close();
      await finalize(decs);
    }
  }

  // ---------- Simpan, unggah foto, PDF & kirim ----------
  async function finalize(decs) {
    const m = await model();
    const all = await allOpenItems();
    for (const p of m.problem) {
      const o = all.find(x => x.caseId === p.caseId); if (!o) continue;
      if (!p.linked && !L.oiUpd[o.caseId]?.next) continue;
      o.status = p.status; o.target = p.target;
      const u = L.oiUpd[o.caseId] || {}; if (p.status === 'delegated' && u.delegate) o.delegatedTo = u.delegate;
      o.closedDate = FINAL.includes(p.status) ? date : '';
      o.history = (o.history || []).filter(h => h.date !== date).concat({ date, status: p.status, progress: p.progress, kendala: p.kendala });
      await saveOpenItem(o);
    }
    // memori jawaban
    for (const it of work()) { const r = res(it); if (r.status) await rememberTitle({ title: it.title, real: { [r.status]: r.realisasi }, kendala: r.kendala || undefined }); }
    await remember('kendala', work().map(i => res(i).kendala));
    await rememberMap('alasanSupport', L.support.map(x => [x.what, x.reason])); await remember('supportPics', L.support.map(x => x.pic));
    await rememberMap('dampak', decs.map(d => [d.what, d.impact])); await remember('usulan', [L.refleksi[4]].filter(x => x && x !== '-'));
    // foto → antrean unggah Drive
    for (const it of work()) for (const id of res(it).photos) await queueUpload({ id: 'photo-' + id, kind: 'photo', date, photoId: id, title: it.title, name: `Foto ${date} ${it.title.slice(0, 40)} ${id}.jpg` });
    L.final = true; await saveDay(day);

    const photos = [];
    for (const it of work()) for (const id of res(it).photos) photos.push({ url: await photoUrl(id), caption: it.title });
    const { laporanBlocks } = await import('./docs.js');
    const { sendDoc } = await import('./send.js');
    await sendDoc({ kind: 'laporan', blocks: laporanBlocks(s, day, { ...m, summary: L.summary, refleksi: L.refleksi, photos }), s, day, onSent: async () => { L.sentAt = nowHM(); await saveDay(day); toast('Laporan terkirim ✓'); } });
    drawList();
  }

  return () => Object.values(urls).forEach(u => URL.revokeObjectURL(u));
}
