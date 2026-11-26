import { h, muatSkrip } from './util.js';

const W = 794, H = 1123, PT = 52, PB = 60;
const RUANG = H - PT - PB;

export async function buatPdf(blok, namaFile) {
  await muatSkrip('vendor/html2canvas.min.js');
  await muatSkrip('vendor/jspdf.umd.min.js');
  try { await document.fonts?.ready; } catch {}
  const root = h('div', { class: 'doc-root' });
  document.body.append(root);
  try {
    const ukur = h('div', { class: 'doc doc-measure' }, blok);
    root.append(ukur);
    await Promise.all([...ukur.querySelectorAll('img')].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
    const tinggi = blok.map(b => b.getBoundingClientRect().height);
    const kepala = {};
    blok.forEach((b, i) => { if (b.dataset.th) kepala[b.dataset.th] = { el: b, h: tinggi[i] }; });
    const hal = [[]];
    let pakai = 0;
    blok.forEach((b, i) => {
      let perlu = tinggi[i];
      if (b.dataset.keep && i + 1 < blok.length) perlu += tinggi[i + 1];
      if (pakai > 0 && pakai + perlu > RUANG) {
        hal.push([]);
        pakai = 0;
        const th = b.dataset.thead && kepala[b.dataset.thead];
        if (th) { hal.at(-1).push(th.el.cloneNode(true)); pakai += th.h; }
      }
      hal.at(-1).push(b);
      pakai += tinggi[i];
    });
    ukur.remove();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    const gambar = [];
    for (let p = 0; p < hal.length; p++) {
      const page = h('div', { class: 'doc doc-page' }, hal[p]);
      root.append(page);
      const c = await window.html2canvas(page, { scale: 2, backgroundColor: '#ffffff', logging: false, width: W, height: H, windowWidth: 1200 });
      const data = c.toDataURL('image/jpeg', 0.88);
      if (p > 0) pdf.addPage();
      pdf.addImage(data, 'JPEG', 0, 0, 595.28, 841.89, undefined, 'FAST');
      gambar.push(data);
      page.remove();
    }
    pdf.setProperties({ title: namaFile.replace(/\.pdf$/, '') });
    return { blob: pdf.output('blob'), gambar, namaFile };
  } finally {
    root.remove();
  }
}
