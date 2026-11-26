import { h, sheet, toast, memuat, unduh, salin, keBase64, keDataUrl } from './util.js';
import { S, api } from './api.js';
import { db } from './db.js';
import { buatPdf } from './pdf.js';
import { blokAgenda, blokLaporan, blokFoto, caption, namaPdf } from './docs.js';

export async function bagikan(blob, nama, teks) {
  const file = new File([blob], nama, { type: blob.type || 'application/octet-stream' });
  if (teks) await salin(teks);
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share(teks ? { files: [file], text: teks } : { files: [file] }); return true; }
    catch (e) { if (e.name === 'AbortError') return false; }
  }
  unduh(file, nama);
  toast(teks ? 'File tersimpan, teks tersalin' : 'File tersimpan');
  return true;
}

export async function kirimPdf({ jenis, tanggal, blok, namaFile, teks, onTerkirim }) {
  const tunggu = sheet({ title: 'Menyiapkan PDF', body: memuat() });
  let pdf;
  try { pdf = await buatPdf(blok, namaFile); }
  catch { tunggu.close(); toast('PDF gagal dibuat.'); return; }
  tunggu.close();
  sheet({
    title: namaFile.replace(/\.pdf$/, ''), full: true,
    body: h('div', { class: 'preview' }, pdf.gambar.map((src, i) => h('img', { src, alt: 'Halaman ' + (i + 1) }))),
    actions: [
      { label: 'Ubah', onClick: x => x.close() },
      {
        label: 'Kirim', primary: true, onClick: async x => {
          if (!(await bagikan(pdf.blob, pdf.namaFile, teks))) return;
          x.close();
          let link = '';
          try { link = (await api('unggah', { jenis: 'pdf', nama: namaFile, data: await keBase64(pdf.blob), tanggal })).link; } catch {}
          try { onTerkirim?.(await api('catatKirim', { jenis, tanggal, link })); }
          catch (e) { toast('Catatan kirim gagal: ' + e.message); }
        }
      }
    ]
  });
}

export function kirimAgenda(d, onTerkirim) {
  return kirimPdf({ jenis: 'Agenda', tanggal: d.date, blok: blokAgenda(d, S.profil, S.oi || []), namaFile: namaPdf('Agenda Kerja', d.date), teks: caption('Agenda', S.profil, d), onTerkirim });
}

export async function kirimLaporan(d, onTerkirim) {
  const fotos = [];
  for (const i of d.items) {
    for (const f of i.fotos || []) {
      const p = f.id ? await db.get('photos', f.id).catch(() => null) : null;
      if (p) fotos.push({ src: await keDataUrl(p.blob), caption: i.judul });
    }
  }
  return kirimPdf({ jenis: 'Laporan', tanggal: d.date, blok: [...blokLaporan(d, S.profil), ...blokFoto(fotos)], namaFile: namaPdf('Laporan Kerja', d.date), teks: caption('Laporan', S.profil, d), onTerkirim });
}
