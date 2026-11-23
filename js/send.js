// Kirim manual lewat Telegram Web di dalam jendela: PDF disimpan, teks disalin, jendela grup terbuka
import { esc, icon, toast, sheet, download, copyText, openPortal } from './util.js';

// Dipanggil langsung dari klik (agar jendela tidak diblokir browser)
export function sendNow({ pdf, caption, link }) {
  download(pdf.blob, pdf.filename);
  copyText(caption);
  const opened = openPortal(link);
  if (opened) toast('PDF tersimpan & teks tersalin. Di Telegram: 📎 → File → pilih PDF → tempel teks → kirim', 6000);
}

export function sendSheet({ title, pdf, caption, link, linkLabel, onSent }) {
  const canShare = !!(navigator.canShare && navigator.canShare({ files: [new File([pdf.blob], pdf.filename, { type: 'application/pdf' })] }));
  const sh = sheet({
    title,
    html: `
      <div class="row" style="padding:0"><span class="av">${icon('laporan')}</span><span class="row-main"><span class="row-t">${esc(pdf.filename)}</span>
        <span class="row-s">${pdf.pages} halaman · ${(pdf.blob.size / 1024).toFixed(0)} KB</span></span></div>
      <ol class="steps-help">
        <li>Tekan <b>Kirim</b>: PDF tersimpan & teks header tersalin.</li>
        <li>Jendela Telegram terbuka di <b>${esc(linkLabel)}</b>.</li>
        <li>Tekan 📎 → <b>File</b> → pilih <b>${esc(pdf.filename)}</b>.</li>
        <li>Tempel teks di keterangan, lalu kirim. Tutup jendela (✕) untuk kembali.</li>
      </ol>
      <button class="btn btn-primary btn-big" data-s="send">${icon('send')}Kirim ke ${esc(linkLabel)}</button>
      <div class="btns">
        <button class="btn btn-soft btn-sm" data-s="copy">${icon('copy')}Salin teks</button>
        <button class="btn btn-soft btn-sm" data-s="dl">${icon('download')}Unduh PDF</button>
        ${canShare ? `<button class="btn btn-soft btn-sm" data-s="share">${icon('open')}Bagikan…</button>` : ''}
      </div>`,
  });
  sh.el.addEventListener('click', async e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    const a = b.dataset.s;
    if (a === 'send') { sendNow({ pdf, caption, link }); onSent?.(); b.classList.replace('btn-primary', 'btn-ok'); b.innerHTML = `${icon('check')}Sudah dibuka — kirim di Telegram`; }
    if (a === 'copy') { await copyText(caption); toast('Teks tersalin'); }
    if (a === 'dl') { download(pdf.blob, pdf.filename); toast('PDF tersimpan'); }
    if (a === 'share') {
      try { await navigator.share({ files: [new File([pdf.blob], pdf.filename, { type: 'application/pdf' })], text: caption }); onSent?.(); } catch {}
    }
  });
  return sh;
}
