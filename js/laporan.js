// LAPORAN KERJA — langsung dari agenda: tandai selesai/progress/belum, foto opsional, sisanya otomatis
import { $, $$, esc, icon, iso, uid, addDays, tglPanjang, tglPendek, jam, menit, nowHM, toast, sheet, chips, debounce, linesOf, sentence, compressImage, confirmBox } from './util.js';
import {
  getSettings, getDay, saveDay, allOpenItems, saveOpenItem, allDecisions, saveDecisions, newDecision,
  memList, remember, savePhoto, getPhoto, deletePhoto, STATUS, FINAL,
} from './store.js';
import { realisasiDefault, progressDefault, draftSummary, draftRefleksi } from './smart.js';
import { REFLEKSI_Q, sortItems } from './docs.js';
import { runWizard } from './wizard.js';

const ST = { done: `${icon('check')}Selesai`, progress: '◐ Progress', not: `${icon('x')}Belum` };
const NEXT = { progress: '🟨 Lanjut', hold: '⬜ On Hold', delegated: '🟪 Delegasi', cancelled: '🟥 Batal' };

export async function render(v, params, { go, topActions }) {
  const date = params.get('d') || iso();
  const s = await getSettings();
  const day = await getDay(date);

  topActions.innerHTML = `<label class="icon-btn" aria-label="Pilih tanggal" style="cursor:pointer">${icon('calendar')}<input type="date" id="pickDate" value="${date}" style="position:absolute;opacity:0;inset:0;width:100%;height:100%"></label>`;
  $('#pickDate', topActions).onchange = e => e.target.value && go('laporan', { d: e.target.value });

  if (day.type !== 'kerja') {
    v.innerHTML = `<section class="hero"><span class="bubble b1"></span><span class="bubble b2"></span>
        <div class="hero-label">${esc(tglPanjang(date))}</div><div class="hero-big">${esc(day.off)}</div>
        <div class="hero-label">Laporan hanya berisi keterangan ${esc(day.off)}.</div></section>
      <button class="btn btn-primary btn-big" id="resend">${icon('send')}Kirim keterangan</button>`;
    $('#resend', v).onclick = async () => (await import('./app.js')).sendOff(day);
    return;
  }
  if (!day.agenda && !day.laporan) {
    v.innerHTML = `<section class="card"><div class="empty-state"><span>${icon('agenda')}</span>Agenda ${esc(tglPanjang(date))} belum dibuat.<br>Laporan disusun dari agenda.</div>
      <a class="btn btn-primary" href="#/agenda?d=${date}">${icon('agenda')}Buat Agenda dulu</a>
      <button class="btn btn-soft" id="noag">Isi laporan tanpa agenda</button></section>`;
    $('#noag', v).onclick = async () => { day.laporan = blank(); day.laporan.extra.push(extraItem()); await saveDay(day); render(v, params, { go, topActions }); };
    return;
  }

  const L = day.laporan ||= blank();
  const A = day.agenda || { items: [], support: [], decisionIds: [] };
  const persist = debounce(() => saveDay(day), 400);
  const touch = () => { L.final = false; persist(); };
  const memKend = await memList('kendala');
  const urls = {};
  const photoUrl = async id => urls[id] ||= URL.createObjectURL((await getPhoto(id))?.blob || new Blob());

  const work = () => [...sortItems(A.items.filter(i => i.kind !== 'tetap')), ...L.extra];
  const res = it => (L.results[it.id] ||= { status: '', realisasi: '', kendala: '', photos: [] });
  // Open item yang relevan untuk laporan hari ini
  const relevantOIs = async () => (await allOpenItems()).filter(o => o.created <= date && (!FINAL.includes(o.status) || o.history?.some(h => h.date === date)))
    .sort((a, b) => a.caseId.localeCompare(b.caseId));
  const linkedIds = () => new Set(work().map(i => i.caseId).filter(Boolean));

  v.innerHTML = `
    <section class="hero"><span class="bubble b1"></span><span class="bubble b2"></span>
      <div class="hero-label">${esc(tglPanjang(date))}</div>
      <div class="hero-big" id="score">Laporan</div>
      <div class="hero-label">Tandai hasil tiap pekerjaan. Foto opsional. Ringkasan, tabel & refleksi disusun otomatis.</div>
      <div class="btns"><span class="pt" style="background:var(--surface)">${L.sentAt ? '✓ Terkirim ' + esc(L.sentAt) : L.final ? 'Siap kirim' : 'Draf tersimpan otomatis'}</span></div>
    </section>
    <div class="tl" id="list"></div>
    <button class="btn btn-soft" id="addx">${icon('plus')}Pekerjaan tambahan (di luar agenda)</button>
    <div id="others"></div>
    <div class="sticky-actions"><button class="btn btn-primary btn-big" id="next">${icon('sparkle')}Lengkapi & buat PDF</button></div>
    <datalist id="dl-kend">${memKend.map(k => `<option value="${esc(k)}">`).join('')}</datalist>`;
  const list = $('#list', v);

  function score() {
    const W = work(); const d = W.filter(i => res(i).status === 'done').length;
    $('#score', v).textContent = W.length ? `${d}/${W.length} selesai` : 'Laporan';
  }
  async function cardHTML(it) {
    const r = res(it), extra = L.extra.includes(it);
    const ph = await Promise.all(r.photos.map(async id => `<span class="ph" style="background-image:url(${await photoUrl(id)})"><button data-delph="${id}" aria-label="Hapus foto">✕</button></span>`));
    return `<div class="tl-item k-${it.kind || 'kerja'}" data-id="${it.id}">
      <div class="tl-time">${extra ? '<span class="pt sun">Tambahan</span>' : `<span class="pt mute">${jam(it.start)}–${jam(it.end)}</span>`}
        ${it.star ? `<span class="pt sun">${icon('star')} Prioritas</span>` : ''}${it.caseId ? `<span class="pt info">${esc(it.caseId)}</span>` : ''}
        <span class="spacer"></span>${extra ? `<button class="icon-btn flat sm" data-delx aria-label="Hapus">${icon('trash')}</button>` : ''}</div>
      ${extra ? `<input class="tl-title" data-x="title" placeholder="Nama pekerjaan…" value="${esc(it.title)}">` : `<h3 style="font-size:19px">${esc(it.title)}</h3>`}
      <div class="seg status">${Object.entries(ST).map(([k, l]) => `<button data-st="${k}" data-v="${k}" class="${r.status === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="field"><input data-r="realisasi" placeholder="Realisasi / hasil (opsional)" value="${esc(r.realisasi)}"></div>
      ${r.status && r.status !== 'done' ? `<div class="field"><input data-r="kendala" list="dl-kend" placeholder="Kendala" value="${esc(r.kendala)}"></div>` : ''}
      <div class="photos">${ph.join('')}<label class="ph" aria-label="Tambah foto">${icon('camera')}<input type="file" accept="image/*" multiple hidden data-ph></label></div>
    </div>`;
  }
  async function drawList() {
    const W = work();
    list.innerHTML = W.length ? (await Promise.all(W.map(cardHTML))).join('') : `<div class="card"><div class="empty-state"><span>${icon('laporan')}</span>Tidak ada pekerjaan di agenda.</div></div>`;
    score();
  }
  async function redraw(it) { const n = list.querySelector(`[data-id="${it.id}"]`); if (n) n.outerHTML = await cardHTML(it); score(); }
  const findIt = el => work().find(i => i.id === el.closest('[data-id]')?.dataset.id);

  list.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const it = findIt(b); if (!it) return;
    if (b.dataset.st) { res(it).status = b.dataset.st; L.summary = null; touch(); redraw(it); }
    if (b.dataset.delph) { const id = b.dataset.delph; res(it).photos = res(it).photos.filter(x => x !== id); await deletePhoto(id); touch(); redraw(it); }
    if (b.hasAttribute('data-delx')) { if (it.title && !(await confirmBox(`Hapus "${it.title}"?`, { ok: 'Hapus' }))) return; L.extra = L.extra.filter(x => x !== it); touch(); drawList(); }
  });
  list.addEventListener('input', e => {
    const it = findIt(e.target); if (!it) return;
    if (e.target.dataset.r) { res(it)[e.target.dataset.r] = e.target.value; touch(); }
    if (e.target.dataset.x === 'title') { it.title = e.target.value; touch(); }
  });
  list.addEventListener('change', async e => {
    if (!e.target.hasAttribute('data-ph')) return;
    const it = findIt(e.target);
    for (const f of e.target.files) { const blob = await compressImage(f); res(it).photos.push(await savePhoto(blob, { date, item: it.id })); }
    touch(); redraw(it); toast('Foto ditambahkan');
  });
  $('#addx', v).onclick = async () => { L.extra.push(extraItem()); touch(); await drawList(); list.lastElementChild?.querySelector('.tl-title')?.focus(); };

  // Open Item lain (tidak ada di timeline hari ini)
  async function drawOthers() {
    const ids = linkedIds();
    const others = (await relevantOIs()).filter(o => !ids.has(o.caseId));
    $('#others', v).innerHTML = others.length ? `<section class="card">
      <div class="card-head">${icon('bell')}<h2>Open Item lain</h2><span class="sub">${others.length}</span></div>
      <p class="hint">Tidak ada di timeline, tapi wajib dilaporkan. Ubah statusnya jika ada progress.</p>
      ${others.map(o => { const u = L.oiUpd[o.caseId] || {}; return `<div class="wiz-card" data-oi="${esc(o.caseId)}">
        <h4>${esc(o.desc)}</h4><span class="meta">${esc(o.caseId)} · ${STATUS[o.status].e} ${STATUS[o.status].l} · target ${esc(tglPendek(o.target))}</span>
        <div class="seg seg-mini">${[['', 'Tetap'], ['progress', '🟨'], ['done', '🟩'], ['hold', '⬜'], ['delegated', '🟪'], ['cancelled', '🟥']].map(([k, l]) => `<button data-n="${k}" class="${(u.next || '') === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        ${u.next ? `<div class="field"><input data-u="progress" placeholder="Progress hari ini" value="${esc(u.progress || '')}"></div>
          <div class="field"><input data-u="kendala" list="dl-kend" placeholder="Kendala (opsional)" value="${esc(u.kendala || '')}"></div>` : ''}
      </div>`; }).join('')}</section>` : '';
  }
  $('#others', v).addEventListener('click', e => {
    const b = e.target.closest('[data-n]'); if (!b) return;
    const id = b.closest('[data-oi]').dataset.oi;
    const u = L.oiUpd[id] ||= {};
    u.next = b.dataset.n || undefined; u.manual = true; touch(); drawOthers();
  });
  $('#others', v).addEventListener('input', e => {
    const c = e.target.closest('[data-oi]'); if (!c || !e.target.dataset.u) return;
    (L.oiUpd[c.dataset.oi] ||= {})[e.target.dataset.u] = e.target.value; touch();
  });

  await drawList(); drawOthers();

  // ---------- Wizard ----------
  $('#next', v).onclick = async () => {
    L.extra = L.extra.filter(x => x.title.trim());
    if (!work().length) { toast('Tidak ada pekerjaan untuk dilaporkan'); return; }
    const ok = await wizard();
    await saveDay(day);
    if (ok) await finalize();
    drawList(); drawOthers();
  };

  async function wizard() {
    const oiAll = await allOpenItems();
    const linked = () => work().filter(i => i.caseId && res(i).status && res(i).status !== 'done');
    const memPics = await memList('pics');
    const memAlS = await memList('alasanSupport');
    const memDampak = await memList('dampak');
    let decs = (await allDecisions()).filter(d => d.created <= date && (d.status === 'pending' || d.decidedDate === date) && d.status !== 'dropped');
    const newDecs = [];
    if (!L.support) L.support = (A.support || []).map(x => ({ ...x, reason: '', keep: true }));

    return runWizard({
      title: 'Lengkapi laporan', finishLabel: 'Buat PDF',
      steps: [
        { title: 'Status pekerjaan', skip: () => !work().some(i => !res(i).status),
          render(b) {
            b.innerHTML = `<p class="q">Bagaimana hasil pekerjaan ini?</p>
              ${work().filter(i => !res(i).status || i._ask).map(it => { it._ask = true; return `<div class="wiz-card" data-id="${it.id}"><h4>${esc(it.title)}</h4>
                <div class="seg status">${Object.entries(ST).map(([k, l]) => `<button data-v="${k}" class="${res(it).status === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>`; }).join('')}`;
            b.onclick = e => { const t = e.target.closest('[data-v]'); if (!t) return; res(work().find(i => i.id === t.closest('[data-id]').dataset.id)).status = t.dataset.v; this.render(b); };
          },
          validate() { if (work().some(i => !res(i).status)) return 'Tandai semua pekerjaan dulu'; },
          apply() { work().forEach(i => delete i._ask); },
        },
        { title: 'Kendala & kelanjutan', skip: () => !work().some(i => res(i).status && res(i).status !== 'done'),
          render(b) {
            b.innerHTML = `<p class="q">Apa kendalanya & bagaimana kelanjutannya?</p><p class="hint">Kendala tersimpan untuk dipilih lagi.</p>
              ${work().filter(i => res(i).status !== 'done').map(it => {
                const r = res(it), u = it.caseId ? (L.oiUpd[it.caseId] ||= {}) : null;
                if (u && !u.next) u.next = 'progress';
                if (u && !u.target) { const o = oiAll.find(x => x.caseId === it.caseId); u.target = o && o.target > date ? o.target : addDays(date, 1); }
                return `<div class="wiz-card" data-id="${it.id}"><h4>${esc(it.title)}</h4><span class="meta">${r.status === 'progress' ? '🟨 Dalam progress' : '🟥 Belum tercapai'}${it.caseId ? ' · ' + esc(it.caseId) : ''}</span>
                  <span class="label">Kendala</span><div class="chips" data-c="k"></div>
                  ${u ? `<span class="label">Kelanjutan Open Item</span>
                    <div class="seg seg-mini">${Object.entries(NEXT).map(([k, l]) => `<button data-nx="${k}" class="${u.next === k ? 'on' : ''}">${l}</button>`).join('')}</div>
                    ${u.next === 'progress' ? `<div class="field">${icon('calendar')}<span class="muted">Target baru</span><input type="date" data-t value="${u.target}" min="${date}"></div>` : ''}
                    ${u.next === 'delegated' ? `<span class="label">Didelegasikan ke</span><div class="chips" data-c="dl"></div>` : ''}
                    <div class="field"><input data-pg placeholder="Progress hari ini" value="${esc(u.progress || r.realisasi || progressDefault(r.status))}"></div>` : ''}
                </div>`; }).join('')}`;
            for (const card of $$('.wiz-card', b)) {
              const it = work().find(i => i.id === card.dataset.id), r = res(it);
              chips($('[data-c="k"]', card), { options: memKend, selected: r.kendala ? [r.kendala] : [], addLabel: '+ Tulis kendala', onChange: v => r.kendala = v[0] || '' });
              const dl = $('[data-c="dl"]', card);
              if (dl) chips(dl, { options: memPics, selected: L.oiUpd[it.caseId].delegate ? [L.oiUpd[it.caseId].delegate] : [], addLabel: '+ PIC', onChange: v => L.oiUpd[it.caseId].delegate = v[0] || '' });
            }
            b.onclick = e => { const t = e.target.closest('[data-nx]'); if (!t) return; const it = work().find(i => i.id === t.closest('[data-id]').dataset.id); L.oiUpd[it.caseId].next = t.dataset.nx; this.render(b); };
            b.oninput = e => {
              const it = work().find(i => i.id === e.target.closest('[data-id]')?.dataset.id); if (!it?.caseId) return;
              if (e.target.hasAttribute('data-t')) L.oiUpd[it.caseId].target = e.target.value;
              if (e.target.hasAttribute('data-pg')) L.oiUpd[it.caseId].progress = e.target.value;
            };
          },
          validate() {
            const d = work().find(i => i.caseId && res(i).status !== 'done' && L.oiUpd[i.caseId]?.next === 'delegated' && !L.oiUpd[i.caseId].delegate);
            if (d) return `Pilih PIC delegasi untuk "${d.title}"`;
          },
          async apply() { await remember('kendala', work().map(i => res(i).kendala)); },
        },
        { title: 'D. Need Support',
          render(b) {
            b.innerHTML = `<p class="q">Dukungan yang masih dibutuhkan</p><p class="hint">Dari agenda hari ini. Isi alasannya, atau tandai sudah tidak perlu.</p>
              ${L.support.map((x, k) => `<div class="wiz-card" data-k="${k}">
                <div class="toggle-row"><span class="row-main"><h4>${esc(x.what) || 'Dukungan baru'}</h4><span class="meta">PIC: ${esc(x.pic) || '-'}</span></span><label class="switch"><input type="checkbox" data-keep ${x.keep ? 'checked' : ''}><span></span></label></div>
                ${x.new ? `<div class="field"><input data-f="what" placeholder="Dukungan yang dibutuhkan" value="${esc(x.what)}"></div><div class="field"><input data-f="pic" placeholder="PIC / unit" value="${esc(x.pic)}"></div>` : ''}
                ${x.keep ? `<div class="field"><input data-f="reason" list="dl-als" placeholder="Alasan kebutuhan" value="${esc(x.reason)}"></div>` : ''}</div>`).join('')}
              ${!L.support.length ? '<p class="hint">Tidak ada dukungan di agenda.</p>' : ''}
              <button class="btn btn-soft" data-add>${icon('plus')}Tambah dukungan</button>
              <datalist id="dl-als">${memAlS.map(p => `<option value="${esc(p)}">`).join('')}</datalist>`;
            b.onchange = e => { const c = e.target.closest('[data-k]'); if (c && e.target.hasAttribute('data-keep')) { L.support[+c.dataset.k].keep = e.target.checked; this.render(b); } };
            b.oninput = e => { const c = e.target.closest('[data-k]'); if (c && e.target.dataset.f) L.support[+c.dataset.k][e.target.dataset.f] = e.target.value; };
            b.onclick = e => { if (e.target.closest('[data-add]')) { L.support.push({ what: '', pic: '', reason: '', keep: true, new: true }); this.render(b); } };
          },
          validate() { if (L.support.some(x => x.keep && x.what.trim() && !x.reason.trim())) return 'Isi alasan untuk setiap dukungan'; },
          async apply() { L.support = L.support.filter(x => x.what.trim()); await remember('alasanSupport', L.support.map(x => x.reason)); await remember('supportPics', L.support.map(x => x.pic)); },
        },
        { title: 'E. Need Decision',
          render(b) {
            b.innerHTML = `<p class="q">Keputusan yang dibutuhkan</p>
              ${decs.map((d, k) => `<div class="wiz-card" data-k="${k}"><h4>${esc(d.what)}</h4><span class="meta">sejak ${esc(tglPendek(d.created))}</span>
                <div class="seg seg-mini"><button data-s="pending" class="${d.status === 'pending' ? 'on' : ''}">Belum diputuskan</button><button data-s="decided" class="${d.status === 'decided' ? 'on' : ''}">Sudah diputuskan</button></div>
                ${!d.reason ? `<div class="field"><input data-f="reason" placeholder="Alasan" value=""></div>` : ''}
                ${d.status === 'decided' ? `<div class="field"><input data-f="answer" placeholder="Keputusannya apa?" value="${esc(d.answer)}"></div>`
                  : `<div class="field"><input data-f="impact" list="dl-dmp" placeholder="Dampak apabila belum diambil" value="${esc(d.impact)}"></div>`}
              </div>`).join('')}
              ${!decs.length ? '<p class="hint">Tidak ada keputusan yang menunggu. Tambahkan jika ada.</p>' : ''}
              <button class="btn btn-soft" data-add>${icon('plus')}Tambah keputusan</button>
              <datalist id="dl-dmp">${memDampak.map(p => `<option value="${esc(p)}">`).join('')}</datalist>`;
            b.onclick = e => {
              const t = e.target.closest('[data-s]'); if (t) { const d = decs[+t.closest('[data-k]').dataset.k]; d.status = t.dataset.s; d.decidedDate = d.status === 'decided' ? date : ''; this.render(b); }
              if (e.target.closest('[data-add]')) {
                const what = prompt('Keputusan yang dibutuhkan:'); if (!what?.trim()) return;
                const d = newDecision(date, what.trim()); decs.push(d); newDecs.push(d); this.render(b);
              }
            };
            b.oninput = e => { const c = e.target.closest('[data-k]'); if (c && e.target.dataset.f) decs[+c.dataset.k][e.target.dataset.f] = e.target.value; };
          },
          validate() {
            const m = decs.find(d => d.status === 'pending' && !d.impact.trim()); if (m) return `Isi dampak untuk "${m.what}"`;
            const r = decs.find(d => !d.reason?.trim()); if (r) return `Isi alasan untuk "${r.what}"`;
          },
          async apply() {
            const all = await allDecisions();
            for (const d of decs) { const i = all.findIndex(x => x.id === d.id); if (i >= 0) all[i] = d; else all.push(d); }
            await saveDecisions(all);
            L.decisionIds = decs.map(d => d.id);
            await remember('dampak', decs.map(d => d.impact)); await remember('decisions', newDecs.map(d => d.what));
          },
        },
        { title: 'A. Executive Summary',
          async render(b) {
            if (!L.summary) L.summary = draftSummary(await model(true));
            b.innerHTML = `<p class="q">Ringkasan hasil kerja</p><p class="hint">Disusun otomatis, maksimal 5 poin. Satu baris satu poin, silakan edit.</p>
              <div class="field ta"><textarea id="sum" rows="6">${esc(L.summary.join('\n'))}</textarea></div>
              <div class="btns"><button class="btn btn-soft btn-sm" data-re>${icon('sync')}Susun ulang</button><button class="btn btn-soft btn-sm" data-ai>${icon('sparkle')}Bantu tulis (AI)</button></div>`;
            $('#sum', b).oninput = e => L.summary = linesOf(e.target.value).slice(0, 5);
            b.onclick = async e => {
              if (e.target.closest('[data-re]')) { L.summary = draftSummary(await model(true)); this.render(b); }
              if (e.target.closest('[data-ai]')) {
                const ai = await import('./ai.js'); const m = await model(true);
                const out = await ai.withAI(x => x.summary(m)); if (out?.length) { L.summary = out.slice(0, 5); this.render(b); }
              }
            };
          },
          validate() { if (!L.summary?.length) return 'Isi minimal 1 poin ringkasan'; if (L.summary.length > 5) return 'Maksimal 5 poin'; },
        },
        { title: 'F. Refleksi',
          async render(b) {
            if (!L.refleksi) {
              const m = await model(true);
              const nextTitles = m.problem.filter(p => !FINAL.includes(p.status)).map(p => p.desc);
              L.refleksi = draftRefleksi({ ...m, nextTitles, lastUsulan: (await memList('usulan'))[0] || '' });
            }
            b.innerHTML = `<p class="hint">Draf otomatis dari data hari ini. Edit seperlunya.</p>
              ${REFLEKSI_Q.map((q, i) => `<span class="label">${i + 1}. ${esc(q)}</span><div class="field ta"><textarea rows="2" data-i="${i}">${esc(L.refleksi[i] || '')}</textarea></div>`).join('')}
              <div class="btns"><button class="btn btn-soft btn-sm" data-ai>${icon('sparkle')}Bantu tulis (AI)</button></div>`;
            b.oninput = e => { if (e.target.dataset.i) L.refleksi[+e.target.dataset.i] = e.target.value; };
            b.onclick = async e => {
              if (!e.target.closest('[data-ai]')) return;
              const ai = await import('./ai.js'); const m = await model(true);
              const out = await ai.withAI(x => x.refleksi(m)); if (out?.length === 5) { L.refleksi = out; this.render(b); }
            };
          },
          validate() { if (L.refleksi.some(x => !String(x || '').trim())) return 'Isi semua jawaban refleksi'; },
          async apply() { await remember('usulan', [L.refleksi[4]].filter(x => x && x !== '-')); },
        },
      ],
    });
  }

  // Bentuk data laporan (dipakai wizard, PDF & AI)
  async function model(preview = false) {
    const oiAll = await relevantOIs();
    const kpi = work().map(it => {
      const r = res(it); const st = r.status || 'not';
      return { title: it.title, caseId: it.caseId, kind: it.kind || 'kerja', star: !!it.star, status: st,
        target: L.extra.includes(it) ? 'Pekerjaan tambahan' : it.star && it.label === '▶️' && it.target > date ? `Dimulai, target ${tglPendek(it.target)}` : 'Selesai hari ini',
        realisasi: r.realisasi?.trim() || realisasiDefault(st), kendala: st !== 'done' ? r.kendala : '' };
    });
    const linkedMap = Object.fromEntries(work().filter(i => i.caseId).map(i => [i.caseId, i]));
    const problem = oiAll.map(o => {
      const it = linkedMap[o.caseId], u = L.oiUpd[o.caseId] || {};
      let status = o.status, progress = '-', kendala = '-';
      const h = o.history?.find(x => x.date === date);
      if (it) {
        const r = res(it); const st = r.status || 'not';
        status = st === 'done' ? 'done' : (u.next || (st === 'progress' ? 'progress' : o.status));
        progress = u.progress?.trim() || r.realisasi?.trim() || progressDefault(st);
        kendala = (st !== 'done' && r.kendala) || '-';
      } else if (u.next) { status = u.next; progress = u.progress?.trim() || '-'; kendala = u.kendala || '-'; }
      else if (h && !preview) { status = h.status; progress = h.progress; kendala = h.kendala; }
      else { progress = h?.progress || 'Belum ada progress hari ini'; }
      const pic = [...(o.pic || []), ...(u.next === 'delegated' && u.delegate ? [`→ ${u.delegate}`] : [])].join(', ');
      return { caseId: o.caseId, desc: o.desc, ref: o.ref, progress, kendala, pic, target: u.next === 'progress' && u.target ? u.target : o.target, targetShort: tglPendek(u.next === 'progress' && u.target ? u.target : o.target), status };
    });
    const decAll = await allDecisions();
    const decisions = decAll.filter(d => d.created <= date && d.status !== 'dropped' && (d.status === 'pending' || d.decidedDate === date));
    const support = (L.support || (A.support || []).map(x => ({ ...x, reason: '', keep: true }))).filter(x => x.keep !== false);
    const closed = problem.filter(p => p.status === 'done').length;
    return { date, kpi, problem, decisions, support, closed, summary: L.summary || [], refleksi: L.refleksi || [] };
  }

  async function finalize() {
    const m = await model(true);
    // terapkan perubahan ke Open Item
    const all = await allOpenItems();
    for (const p of m.problem) {
      const o = all.find(x => x.caseId === p.caseId); if (!o) continue;
      const it = work().find(i => i.caseId === o.caseId), u = L.oiUpd[o.caseId] || {};
      if (!it && !u.next) continue;
      o.status = p.status; o.target = p.target;
      if (p.status === 'delegated' && u.delegate && !o.pic?.includes(u.delegate)) o.delegatedTo = u.delegate;
      o.closedDate = FINAL.includes(p.status) ? date : '';
      o.history = (o.history || []).filter(h => h.date !== date);
      o.history.push({ date, status: p.status, progress: p.progress, kendala: p.kendala });
      await saveOpenItem(o);
    }
    L.final = true;
    await saveDay(day);
    await preview();
  }

  async function preview() {
    const prog = sheet({ title: 'Menyusun Laporan Kerja…', html: '<div class="loading"><div class="dots"><i></i><i></i><i></i></div><span id="pp">Membuat PDF</span></div>', dismissible: false });
    const made = [];
    try {
      const m = await model();
      m.summary = L.summary; m.refleksi = L.refleksi;
      m.photos = [];
      for (const it of work()) for (const id of res(it).photos) {
        const p = await getPhoto(id); if (!p) continue;
        const url = URL.createObjectURL(p.blob); made.push(url);
        m.photos.push({ url, caption: it.title });
      }
      const { laporanBlocks, caption, pdfName } = await import('./docs.js');
      const { buildPdf } = await import('./pdf.js');
      const pdf = await buildPdf(laporanBlocks(s, day, m), { title: 'Laporan Kerja', filename: pdfName('laporan', date), onProgress: p => { const e = $('#pp'); if (e) e.textContent = `Membuat PDF ${Math.round(p * 100)}%`; } });
      prog.close();
      const { sendSheet } = await import('./send.js');
      sheet({
        title: 'Pratinjau Laporan', full: true,
        html: `<div class="preview-pages">${pdf.images.map(src => `<img src="${src}" alt="Halaman">`).join('')}</div>`,
        actions: [{ label: 'Edit lagi', onClick: x => x.close() }, { label: 'Kirim →', primary: true, onClick: () => {
          sendSheet({ title: 'Kirim Laporan Kerja', pdf, caption: caption('laporan', s, day), link: s.links.laporan, linkLabel: 'Laporan Kerja',
            onSent: async () => { L.sentAt = nowHM(); await saveDay(day); } });
        } }],
      });
    } catch (e) {
      prog.close(); console.error(e); toast('Gagal membuat PDF: ' + e.message, 5000);
    } finally { setTimeout(() => made.forEach(u => URL.revokeObjectURL(u)), 120000); }
  }

  return () => Object.values(urls).forEach(u => URL.revokeObjectURL(u));
}

function blank() { return { results: {}, extra: [], oiUpd: {}, support: null, decisionIds: [], summary: null, refleksi: null, final: false, sentAt: null }; }
function extraItem() { return { id: uid(), title: '', kind: 'kerja', extra: true }; }
