// Blok HTML → halaman A4 → PDF (html2canvas + jsPDF). Pratinjau = gambar halaman yang sama persis.
import { loadScript } from './util.js';

const W = 794, H = 1123, PT = 52, PB = 60;
const AVAIL = H - PT - PB;

async function waitImages(root) {
  await Promise.all([...root.querySelectorAll('img')].map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })));
}

export async function buildPdf(blocks, { title = 'Dokumen', filename = 'Dokumen.pdf', onProgress } = {}) {
  await Promise.all([loadScript('vendor/html2canvas.min.js'), loadScript('vendor/jspdf.umd.min.js')]);
  try { await document.fonts?.ready; } catch {}

  const root = document.createElement('div');
  root.className = 'doc-root';
  document.body.appendChild(root);
  try {
    // 1) ukur tinggi tiap blok
    const meas = document.createElement('div');
    meas.className = 'doc doc-measure';
    root.appendChild(meas);
    blocks.forEach(b => meas.appendChild(b));
    await waitImages(meas);
    const hs = blocks.map(b => b.getBoundingClientRect().height);
    const headers = {};
    blocks.forEach((b, i) => { if (b.dataset.th) headers[b.dataset.th] = { el: b.cloneNode(true), h: hs[i] }; });

    // 2) susun ke halaman (judul tidak ditinggal sendirian di bawah halaman, header tabel diulang)
    const pages = [[]]; let used = 0;
    blocks.forEach((b, i) => {
      let need = hs[i];
      if (b.dataset.keep === 'next' && i + 1 < blocks.length) need += hs[i + 1];
      if (used > 0 && used + need > AVAIL) {
        pages.push([]); used = 0;
        const th = b.dataset.thead && headers[b.dataset.thead];
        if (th) { pages.at(-1).push(th.el.cloneNode(true)); used += th.h; }
      }
      pages.at(-1).push(b); used += hs[i];
    });
    meas.remove();

    // 3) render tiap halaman
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    const images = [];
    for (let p = 0; p < pages.length; p++) {
      const page = document.createElement('div');
      page.className = 'doc doc-page';
      pages[p].forEach(b => page.appendChild(b));
      const foot = document.createElement('div');
      foot.className = 'doc-foot';
      foot.innerHTML = `<span>${title} · Rutinin</span><span>Halaman ${p + 1} dari ${pages.length}</span>`;
      page.appendChild(foot);
      root.appendChild(page);
      const canvas = await window.html2canvas(page, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true, width: W, height: H, windowWidth: 1200 });
      const data = canvas.toDataURL('image/jpeg', 0.88);
      if (p > 0) pdf.addPage();
      pdf.addImage(data, 'JPEG', 0, 0, 595.28, 841.89, undefined, 'FAST');
      images.push(data);
      page.remove();
      onProgress?.((p + 1) / pages.length);
    }
    pdf.setProperties({ title: filename.replace(/\.pdf$/, ''), creator: 'Rutinin' });
    const blob = pdf.output('blob');
    return { blob, images, filename, pages: pages.length };
  } finally {
    root.remove();
  }
}
