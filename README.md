# Rutinin

Aplikasi harian karyawan store untuk kamera timestamp, absen, agenda, report, jadwal, dan cek SOP.

Status: gambaran tampilan. Data masih contoh dan belum tersambung ke spreadsheet.

## Menjalankan

```bash
python3 -m http.server 8000
```

Buka `http://localhost:8000`.

## Deploy

- Frontend: hosting statis dari branch `main`, folder root (misalnya GitHub Pages: Settings, Pages, Branch `main`).
- Setiap rilis, naikkan `CACHE_NAME` di `service-worker.js`.
- Backend Apps Script dan spreadsheet: menyusul.
