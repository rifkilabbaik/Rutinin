# Rutinin

Aplikasi harian tim MCED untuk kamera timestamp, absen, agenda kerja, laporan kerja, jadwal, komplain, dan Takbiran.

## Menjalankan

```bash
python3 -m http.server 8000
```

Buka `http://localhost:8000`.

## Deploy

### Apps Script

1. Di proyek Apps Script (URL-nya ada di `js/config.js`), buat dua file dan tempel isi `apps-script/Code.gs` dan `apps-script/SeedSop.gs`.
2. Project Settings, Script Properties:
   - `SPREADSHEET_ID`: ID spreadsheet Rutinin
   - `REKAPIN_SPREADSHEET_ID`: ID spreadsheet Rekapin (sumber komplain)
   - `DRIVE_FOLDER_ID`: folder Drive untuk foto bukti dan PDF
3. Jalankan fungsi `siapkanSheet` satu kali. Sheet yang belum ada dibuat beserta isi awalnya.
4. Isi sheet `Pengaturan` (`telegram_admin`, `link_absen`) dan sheet `Pilihan` (Jabatan, Atasan, Unit Kerja).
5. Sheet `Toko` wajib punya kolom yang judulnya mengandung kata Region, Area, dan Montaz.
6. Deploy, Manage deployments, edit deployment yang ada, Version: New version. Execute as: Me, Who has access: Anyone.
7. Aktifkan akun dengan mengisi kolom `status` di sheet `Users`: `member` (hanya region sendiri) atau `admin` (semua region).

### Frontend

- GitHub Pages: Settings, Pages, Deploy from a branch, `main`, folder root.
- Setiap rilis, naikkan `CACHE_NAME` di `service-worker.js`.
