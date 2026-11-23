# Rutinin

PWA untuk kegiatan rutin harian karyawan Sedjati Group: absen, foto absen bercap waktu, **Agenda Kerja**, dan **Laporan Kerja** sesuai Standar Format Sedjati Group. Tampilannya mengikuti keluarga aplikasi *-in* (Hitungin, Loyalin, Jadwalin).

## Fitur

- **Absen**: web absen terbuka di dalam aplikasi. Kalau web absen menolak ditampilkan, ada tombol untuk membukanya di jendela.
- **Foto Absen**: cap waktu (tanggal, jam, alamat GPS) di kanan bawah. Hasil kamera depan mirror seperti di layar, teks tetap terbaca normal. Setelah jepret: **Ulangi** atau **Kirim**.
- **Agenda Kerja**:
  - Cukup ketik jam dan judul. Rincian dan jenis kegiatan ditebak dari riwayat (✨).
  - Tombol **Lanjutkan dari kemarin** memasukkan pekerjaan dan Open Item yang belum selesai.
  - **Cek sebelum PDF** dalam 1 halaman: Kata baru (singkatan disimpan ke Kamus), Prioritas, Open Item, Need Support, Need Decision, dan Pekerjaan pendukung. Semua diisi dari riwayat; yang ditanyakan hanya yang belum diketahui.
- **Laporan Kerja**:
  - Tap ✓ / ½ / ✕ per kegiatan, atau **Semua selesai**.
  - Realisasi dan kendala terisi otomatis (✨). Tap kegiatan untuk mengubah atau menambah foto.
  - **Cek Laporan** dalam 1 halaman: Ringkasan, Open Item, Need Support, Need Decision, dan Refleksi, semuanya otomatis dan dicek dulu sebelum dikirim.
- **Kirim**: menu Bagikan Android ke aplikasi Telegram, PDF dan teks keterangan sekaligus. Teks juga tersalin sebagai cadangan.
- **Day Off / Cuti / Sakit / Izin**: Agenda dan Laporan hanya berisi header dan keterangan.
- **Spreadsheet & Drive**: data tersimpan di HP dulu, lalu tersinkron. Foto laporan dan arsip PDF disimpan ke folder Drive **Rutinin**.
- **AI lokal (opsional)**: Qwen2.5 1.5B di prosesor HP (wllama, tanpa GPU dan tanpa API), unduh sekali ±1,1 GB. Menulis ringkasan, refleksi, rincian, dan menebak singkatan di belakang layar. Kalau HP kehabisan memori saat memuat, AI otomatis dimatikan.
- **Rekap** per rentang tanggal + unduh CSV.

## Pasang di HP (Android)

1. Buka `https://rifkilabbaik.github.io/Rutinin/` di Chrome.
2. Menu ⋮ → **Tambahkan ke layar utama / Instal aplikasi**.
3. Buka *link setup* pribadi (dikirim terpisah) supaya profil, link portal, dan blok rutin langsung terisi. Bisa juga diisi manual di **Pengaturan**.

## Hubungkan Spreadsheet (Apps Script)

1. Buka spreadsheet → **Ekstensi → Apps Script**, atau buka project Apps Script yang sudah ada.
2. Hapus isi `Code.gs`, lalu tempel seluruh isi [`apps-script/Code.gs`](apps-script/Code.gs).
3. Isi dua baris paling atas:
   - `SHEET_ID`: bagian di antara `/d/` dan `/edit` pada link spreadsheet.
   - `PIN`: angka bebas, harus sama dengan yang diisi di aplikasi.
   - Script kini juga menyimpan foto & PDF ke Google Drive, jadi saat deploy akan diminta izin akses Drive.
4. Simpan, lalu **Deploy**:
   - Jika sudah pernah deploy: **Deploy → Kelola deployment → ✎ Edit → Versi: Versi baru → Deploy**. URL tetap sama.
   - Jika belum: **Deploy → Deployment baru → Aplikasi web**, *Jalankan sebagai: Saya*, *Siapa yang memiliki akses: Siapa saja*.
5. Izinkan akses saat diminta.
6. Di Rutinin → **Pengaturan → Spreadsheet**:
   1. Isi URL `/exec` dan PIN.
   2. Tekan **Tes koneksi**.

Sheet yang dibuat otomatis:

| Sheet | Isi |
|---|---|
| Harian | Satu baris per hari |
| Agenda | Satu baris per kegiatan |
| Laporan | Satu baris per kegiatan |
| Open Item | Daftar Open Item |
| Keputusan | Daftar Need Decision |
| Kamus | Kata/singkatan baru dan artinya |
| Foto | Foto laporan (gambar kecil + link Drive) |
| Arsip PDF | Link PDF Agenda & Laporan di Drive |
| `_Data` | Disembunyikan; cadangan untuk fitur **Pulihkan** |

Filter kolom Tanggal untuk menarik data per rentang tanggal.

## Struktur

```
index.html, manifest.webmanifest, sw.js   PWA
css/app.css                                desain keluarga -in
js/app.js        navigasi, Beranda, Absen, Day Off, setup link
js/camera.js     kamera timestamp
js/agenda.js     Agenda Kerja + Cek sebelum PDF
js/laporan.js    Laporan Kerja + Cek Laporan
js/docs.js       format dokumen sesuai standar
js/pdf.js        HTML → PDF A4 (html2canvas + jsPDF)
js/smart.js      penyusun otomatis (aturan + memori)
js/ai.js         AI lokal lewat CPU (wllama)
js/sync.js       sinkron Apps Script
js/rekap.js, js/settings.js, js/store.js, js/db.js, js/util.js, js/send.js
vendor/wllama/   llama.cpp WebAssembly (lisensi MIT)
apps-script/Code.gs
```
