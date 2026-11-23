# Rutinin

PWA untuk kegiatan rutin harian karyawan Sedjati Group: absen, foto absen bercap waktu, **Agenda Kerja**, dan **Laporan Kerja** sesuai Standar Format Sedjati Group. Tampilannya mengikuti keluarga aplikasi *-in* (Hitungin, Loyalin, Jadwalin).

## Fitur

- **Absen**: membuka web absen sebagai jendela di atas aplikasi. Login cukup sekali.
- **Foto Absen**:
  - Kamera dengan cap waktu di kanan bawah: tanggal, jam, dan alamat dari GPS.
  - Hasil foto **tidak mirror**. Ada tombol balik kamera.
  - Alamat bisa diubah manual bila GPS tidak tersedia.
  - Tombol **Simpan & buka Grup Grooming**.
- **Agenda Kerja**:
  - Cukup isi timeline (jam + nama kegiatan). Blok rutin dan tetap (Daily Task, Sholat, Istirahat) otomatis masuk.
  - Rincian kegiatan terisi otomatis dari aturan dan riwayat.
  - Open Item yang belum selesai diingatkan saat menyusun timeline.
  - Wizard hanya menanyakan yang belum terjawab: Prioritas (🎯/▶️, maks 3), Referensi & PIC Open Item, Need Support, dan Need Decision. Jawaban tersimpan untuk dipilih lagi.
  - Case ID otomatis `MCED-RR/2026-001`, berurutan dan tidak dobel.
  - Pratinjau, lalu **Agenda Kerja - dd-mm-yyyy.pdf**.
- **Laporan Kerja**:
  - Langsung dari agenda: tandai Selesai, Progress, atau Belum. Foto opsional per kegiatan.
  - Kendala dan kelanjutan Open Item ditanyakan (Lanjut, On Hold, Delegasi, Batal).
  - Executive Summary dan Refleksi disusun otomatis.
  - Isi PDF: KPI/Progress, Problem Log, Need Support/Decision, dan Lampiran Dokumentasi.
- **Day Off / Cuti / Sakit / Izin**: Agenda dan Laporan hanya berisi header dan keterangan.
- **Kirim ke Telegram** (manual, tanpa bot):
  1. Tekan **Kirim**. PDF tersimpan dan teks header tersalin.
  2. Jendela Telegram Web terbuka di grup atau topik tujuan.
  3. Tekan 📎, pilih **File**, pilih PDF-nya, tempel teks, lalu kirim.
- **Spreadsheet**: data tersimpan di HP dulu (tetap jalan tanpa sinyal), lalu tersinkron ke Google Spreadsheet lewat Apps Script.
- **Rekap**:
  - Rentang tanggal bebas: hari ini, minggu ini, bulan ini, atau custom.
  - Unduh CSV Pekerjaan dan Open Item.
- **AI lokal (opsional)**:
  - Qwen2.5 1.5B lewat WebLLM + WebGPU, berjalan langsung di HP tanpa API.
  - Unduh sekali ±1 GB.
  - Dipakai untuk tombol ✨ *Bantu tulis*. Tanpa AI, tombol *Isi otomatis* tetap instan.
- Tema Oranye/Peach/Mint/Lavender dan Terang/Gelap/Otomatis. Bisa dipasang ke layar utama dan tetap bisa dibuka offline.

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
| `_Data` | Disembunyikan; cadangan untuk fitur **Pulihkan** |

Filter kolom Tanggal untuk menarik data per rentang tanggal.

## Struktur

```
index.html, manifest.webmanifest, sw.js   PWA
css/app.css                                desain keluarga -in
js/app.js        navigasi, Beranda, Portal, Day Off, setup link
js/camera.js     kamera timestamp
js/agenda.js     Agenda Kerja + wizard
js/laporan.js    Laporan Kerja + wizard
js/docs.js       format dokumen sesuai standar
js/pdf.js        HTML → PDF A4 (html2canvas + jsPDF)
js/smart.js      penyusun otomatis (aturan + memori)
js/ai.js         AI lokal (WebLLM)
js/sync.js       sinkron Apps Script
js/rekap.js, js/settings.js, js/store.js, js/db.js, js/util.js, js/wizard.js, js/send.js
apps-script/Code.gs
```
