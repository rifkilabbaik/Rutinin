// Kirim lewat menu Bagikan Android → aplikasi Telegram. PDF + teks keterangan sekaligus; teks juga disalin sebagai cadangan.
import { download, copyText, toast } from './util.js';

export async function shareFile(blob, name, text = '') {
  const file = new File([blob], name, { type: blob.type || (name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg') });
  if (text) copyText(text);
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share(text ? { files: [file], text } : { files: [file] }); return true; }
    catch (e) { if (e.name === 'AbortError') return false; }
  }
  download(file, name);
  toast(text ? 'File tersimpan & teks tersalin' : 'File tersimpan');
  return true;
}

// Pratinjau PDF → tombol Kirim (menu Bagikan). PDF juga diarsip ke Drive lewat Spreadsheet.
export async function sendDoc({ kind, blocks, s, day, onSent }) {
  const { sheet } = await import('./util.js');
  const { buildPdf } = await import('./pdf.js');
  const { caption, pdfName } = await import('./docs.js');
  const { queueUpload } = await import('./store.js');
  const prog = sheet({ title: 'Menyiapkan PDF…', dismissible: false, html: '<div class="loading"><div class="dots"><i></i><i></i><i></i></div></div>' });
  let pdf;
  try { pdf = await buildPdf(blocks, { filename: pdfName(kind, day.date) }); }
  catch (e) { prog.close(); toast('Gagal membuat PDF: ' + (e?.message || e)); return; }
  prog.close();
  const text = caption(kind, s, day);
  sheet({
    title: pdf.filename.replace('.pdf', ''), full: true,
    html: `<div class="preview-pages">${pdf.images.map(src => `<img src="${src}" alt="">`).join('')}</div>`,
    actions: [{ label: 'Ubah', onClick: x => x.close() }, { label: 'Kirim', primary: true, onClick: async x => {
      if (!(await shareFile(pdf.blob, pdf.filename, text))) return;
      x.close();
      await queueUpload({ id: `pdf-${kind}-${day.date}`, kind: 'pdf', date: day.date, jenis: kind, name: pdf.filename, blob: pdf.blob });
      onSent?.();
    } }],
  });
}
