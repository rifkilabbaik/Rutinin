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
8. Setiap kali `Code.gs` diperbarui: tempel ulang, jalankan `siapkanSheet` (sheet baru dibuat, kolom yang kurang ditambahkan), lalu deploy versi baru.
9. Perubahan di sheet master (Pilihan, Master*, Pengaturan) terbaca aplikasi paling lambat 5 menit kemudian.

### Jenis jadwal

Sheet `MasterJadwal` mengatur jenis jadwal dan isiannya. Kolom `isian` berformat `Label:slot[:angka]` dipisah `;`, dengan slot `k1`, `k2`, `pic`, atau `wa`. Isian pertama wajib diisi. Jenis dengan `kode_kegiatan` kosong (Lainnya) meminta pengguna memilih kegiatan dari `MasterKegiatan`.

### Impor data Jadwalin

1. Buat sheet `ImporJadwalin`, tempel data Jadwalin beserta baris judulnya (Tanggal, Nama, Nama Toko, Kegiatan, ID, Keterangan 1, Keterangan 2, Status, Dibuat, Diubah, PIC, Nomor PIC, Keterangan).
2. Jalankan fungsi `imporJadwalin`. Hasilnya tampil di log eksekusi. ID yang sudah ada dilewati, jadi aman dijalankan ulang.
3. Data tanpa jam diberi jam 08.00. Kegiatan Lain-lain yang memuat kata cooking menjadi Cooking Class, yang memuat pesanan, box, atau catering menjadi Catering, sisanya Lainnya.

### Frontend

- GitHub Pages: Settings, Pages, Deploy from a branch, `main`, folder root.
- Setiap rilis, naikkan `CACHE_NAME` di `service-worker.js` dan `VERSI` di `js/config.js`. Pengguna akan melihat pemberitahuan "Versi baru tersedia".
