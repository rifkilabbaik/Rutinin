// Wizard tanya-jawab: hanya menanyakan yang belum terjawab, satu langkah per layar
import { $, toast, sheet } from './util.js';

// steps: [{ title, skip?(), render(body), validate?() → pesan error | null, apply?() }]
export function runWizard({ title, steps, finishLabel = 'Selesai' }) {
  return new Promise(resolve => {
    let i = 0, done = false;
    const list = () => steps.filter(s => !s.skip?.());
    const sh = sheet({
      title, full: true,
      html: '<div class="wiz-steps" id="wd"></div><div class="stack" id="wb" style="gap:14px"></div>',
      actions: [{ label: 'Kembali', onClick: () => back() }, { label: 'Lanjut', primary: true, onClick: () => next() }],
    });
    const body = $('#wb', sh.el), dots = $('#wd', sh.el);
    const [bBack, bNext] = sh.el.querySelectorAll('.sheet-actions .btn');
    const finish = ok => { if (done) return; done = true; sh.close(); resolve(ok); };
    sh.onClose = () => { if (!done) { done = true; resolve(false); } };

    async function draw() {
      const L = list(); i = Math.min(i, L.length - 1);
      const s = L[i];
      dots.innerHTML = L.map((_, k) => `<i class="${k <= i ? 'done' : ''}"></i>`).join('');
      bBack.textContent = i === 0 ? 'Tutup' : 'Kembali';
      bNext.textContent = i === L.length - 1 ? finishLabel : 'Lanjut';
      $('.sheet-head h2', sh.el).textContent = s.title || title;
      body.innerHTML = '';
      await s.render(body);
      sh.el.querySelector('.sheet-card').scrollTop = 0;
    }
    async function next() {
      const L = list(); const s = L[i];
      const err = await s.validate?.();
      if (err) { toast(err); return; }
      await s.apply?.();
      const L2 = list();
      const idx = L2.indexOf(s);
      if (idx < L2.length - 1) { i = idx + 1; draw(); } else finish(true);
    }
    function back() { if (i === 0) finish(false); else { i--; draw(); } }
    draw();
  });
}
