# Spesifikasi PWA Agenda & Laporan Kerja MCED

Dokumen acuan untuk membangun PWA **Agenda Kerja** dan **Laporan Kerja Harian** tim MCED (Marketing and Customer Experience Development, Sedjati Group / Labbaik Chicken). Disusun dari Standar Format Sedjati Group, rancangan MCED, dan pengalaman PWA Rutinin.

Teks aplikasi dalam Bahasa Indonesia. Backend: Google Sheets + Apps Script.

---

## 0. Keputusan yang sudah ditetapkan

| No | Keputusan |
|---|---|
| 1 | Hanya **periode Harian**. Mingguan/Bulanan/Triwulan belum dibuat. |
| 2 | **Daftar kegiatan, KPI, dan bobot kerja disimpan di Sheet** (bukan di kode). |
| 3 | **Tidak ada blok terkunci.** Sholat dan istirahat hanya **blok saran** yang bisa diubah atau dihapus. |
| 4 | **Jam kerja dipilih**: default Senin–Jumat 08.00–17.00, Sabtu 08.00–15.00, atau Custom 9 jam. |
| 5 | **Alasan tidak selesai** diambil dari Sheet; alasan baru yang diketik user ikut disimpan ke Sheet. |
| 6 | **Tanpa angka dan persen** di Agenda dan Laporan. Hasil dicatat dengan pilihan dan teks; status KPI berupa chip. |
| 7 | **Tidak ada batasan pengiriman.** Agenda dan Laporan boleh dikirim kapan saja dan berkali-kali; setiap kiriman tercatat. |
| 8 | **Case ID: `MCED/[KODE AKUN]/[NOMOR]`**, contoh `MCED/AB/001`. |
| 9 | **Open Item dibuat otomatis dari Agenda** dan **bisa ditambah manual**. |
| 10 | Hal lain mengikuti rancangan MCED. |

---

## 1. Prinsip isian

- Target waktu: **Agenda ≤ 3 menit**, **Laporan ≤ 5 menit**.
- Utamakan **pilih** daripada **ketik**.
- Yang bisa diambil dari data lain **terisi otomatis**.
- Laporan dibuat **dari Agenda**, bukan dari nol.
- UI tanpa emoji. Status memakai **chip warna + teks**.
- Data tersimpan di HP dulu (bisa offline), lalu tersinkron ke Sheet.

| Kode | Arti |
|---|---|
| AUTO | Diisi sistem, tidak bisa diubah user |
| PILIH | Dropdown / chip / toggle |
| KETIK | Teks bebas, dibatasi panjangnya |
| JAM / TGL | Pemilih jam / tanggal |
| FOTO | Kamera timestamp atau galeri |
| YA/TIDAK | Toggle |

> Tidak ada tipe ANGKA di Agenda maupun Laporan.

---

## 2. Data master di Sheet (dibaca aplikasi, diubah atasan/admin)

### 2.1 `Users`
| Kolom | Contoh | Keterangan |
|---|---|---|
| kode_akun | AB | Dipakai di Case ID, unik |
| nama | Nama Karyawan | |
| jabatan | Marketing Event Admin | |
| atasan | Nama Atasan | |
| unit | Marketing and Customer Experience Division | |
| pin | (teks) | Login sederhana: kode akun + PIN |
| aktif | YA | |

### 2.2 `MasterKegiatan` (daftar jenis kegiatan)
| Kolom | Keterangan |
|---|---|
| kode | FLD, CC, GCOM, CX, PROP, SOP, APP, KOMP, EVENT, PERJADIN, ADM |
| nama | Nama tampil, mis. "Fun Learning Day (FLD)" |
| kolom_hasil | Daftar isian hasil, format `label:tipe[:opsi1|opsi2]` dipisah `;` |
| foto_wajib | YA/TIDAK |
| lapangan | YA/TIDAK (kegiatan di luar kantor) |
| jadi_open_item | YA/TIDAK: default toggle "Jadikan Open Item" saat dimasukkan ke agenda |
| kode_kpi | Kode KPI yang terhubung (boleh lebih dari 1, dipisah koma) |
| urutan, aktif | |

Isi awal (tanpa angka):
| Kode | Nama | Kolom hasil | Foto wajib |
|---|---|---|---|
| FLD | Fun Learning Day | Nama TK:KETIK; Store pelaksana:STORE; Minat lanjutan:PILIH:Tidak|Cooking Class|Catering|GCOM; Catatan:KETIK | YA |
| CC | Cooking Class | Nama grup:KETIK; Store:STORE; Catatan:KETIK | YA |
| GCOM | Gathering Community | Nama komunitas:KETIK; Kontak PIC:KETIK; Lead catering:YA/TIDAK; Catatan:KETIK | YA |
| CX | Customer Experience | Store:STORE; Ajakan Google review:YA/TIDAK; Saran utama:KETIK | YA |
| PROP | Sebar Proposal | Jenis proposal:PILIH:Catering|GCOM|FLD|Cooking Class; Nama tujuan:KETIK; Cara:PILIH:Langsung|WA|Email | TIDAK |
| SOP | Cek SOP Store | Store:STORE; Hasil:PILIH:Sesuai standar|Ada temuan; Temuan:KETIK | TIDAK |
| APP | Cek Aplikasi Online | Store:STORE; Platform:PILIH:GoFood|GrabFood|ShopeeFood|Lainnya; Ada komplain baru:YA/TIDAK; Catatan:KETIK | TIDAK |
| KOMP | Kunjungan Komplain | Case ID:OPENITEM; Hasil penanganan:KETIK; Status komplain:PILIH:Selesai|Proses | YA |
| EVENT | Support Event / Catering | Nama event:KETIK; Peran:PILIH:Sponsor|Catering|Booth|Lainnya | YA |
| PERJADIN | Perjalanan Dinas | Tujuan:STORE; Jam berangkat:JAM; Jam tiba:JAM | TIDAK |
| ADM | Administrasi | Keterangan:KETIK | TIDAK |

Tipe khusus: `STORE` = pilihan dari `MasterStore` (+ "Lainnya" lalu ketik); `OPENITEM` = pilihan Open Item aktif.

### 2.3 `MasterKPI` (KPI dan bobot kerja)
| Kolom | Keterangan |
|---|---|
| kode_kpi | mis. KPI-FLD, KPI-GCOM, KPI-REVIEW, DIS-AGENDA |
| nama | Nama indikator |
| kelompok | Hasil / Disiplin Eksekusi / Kualitas |
| bobot | Bobot penilaian (dipakai Dashboard/assessment, **tidak tampil di PWA**) |
| keterangan | Cara menilai, untuk atasan |
| aktif | |

PWA hanya membaca kode dan nama KPI untuk menampilkan **status KPI berupa chip** (bagian 4.5). Perhitungan bobot dilakukan di Dashboard/assessment.

### 2.4 Daftar pilihan lain
| Sheet | Isi | Bisa ditambah user? |
|---|---|---|
| `MasterAlasan` | Alasan tidak selesai: Cuaca, Dibatalkan pihak luar, Waktu tidak cukup, Instruksi atasan, Lainnya | **Ya**, alasan baru otomatis tersimpan |
| `MasterReferensi` | Komplain, Hasil SOP, Hasil GCOM, Hasil FLD, Instruksi Atasan, KPI, Rapat, Audit | Tidak |
| `MasterTujuan` | Ditujukan ke: Atasan, Store Leader, Supply Chain, Finance, GA, Kreatif, Lainnya | Tidak |
| `MasterStore` | Daftar store | Tidak |
| `MasterPendukung` | Default: Cek aplikasi online, Cek komplain terbaru, Follow up lead, Update tracker proposal | Ya (per user) |
| `MasterBlokSaran` | Istirahat & Dzuhur 12.00–13.00; Ashar 15.15–15.30 | Tidak |
| `MasterJamKerja` | Senin–Jumat 08.00–17.00; Sabtu 08.00–15.00 | Tidak |

---

## 3. AGENDA KERJA HARIAN

### 3.1 Header (AUTO)
| Field | Sumber |
|---|---|
| Nama, Jabatan, Atasan, Unit Kerja | `Users` |
| Periode | Harian |
| Tanggal | Hari ini (bisa pilih tanggal lain) |
| Keterangan hari | PILIH: **Kerja** / Day Off / Cuti / Sakit / Izin. Selain Kerja, agenda hanya berisi header + keterangan + catatan (opsional) |
| Jam kerja | Lihat 3.2 |
| Jam kirim terakhir & jumlah kiriman | AUTO saat Kirim |

### 3.2 Jam kerja (PILIH, di atas timeline)
| Pilihan | Jam |
|---|---|
| Default | Senin–Jumat **08.00–17.00**, Sabtu **08.00–15.00** (terpilih otomatis sesuai hari) |
| Custom 9 jam | User pilih jam mulai, jam selesai otomatis **mulai + 9 jam** (mis. 07.00–16.00) |

Pilihan terakhir diingat per user.

### 3.3 Open Item aktif (AUTO, tampil paling atas)
- Open Item milik user (PIC) berstatus **Rencana / Proses / Ditunda**.
- Urutan: lewat target → target hari ini → lainnya. Yang lewat target diberi chip merah "Lewat target".
- Tiap item: tombol **Masukkan ke agenda**. Kegiatan baru terisi otomatis: jenis dari Open Item, judul = deskripsi, Case ID terkait, sumber = Open Item.
- Tombol **Tambah Open Item** (form bagian 6).

### 3.4 Daftar kegiatan (timeline)
Sumber: (1) Jadwal hari ini jika aplikasi punya fitur Jadwal, (2) dari Open Item, (3) **Tambah Kegiatan**.

| Field | Isian | Wajib | Catatan |
|---|---|---|---|
| Jenis kegiatan | PILIH | Ya | Dari `MasterKegiatan` |
| Judul singkat | KETIK | Ya | Maks. 60 karakter, mis. "FLD TK Al-Ikhlas". Saran dari riwayat judul jenis yang sama |
| Lokasi / Store | PILIH | Ya | `MasterStore` + Lainnya |
| Jam mulai – selesai | JAM | Ya | Default: slot kosong berikutnya, 1 jam |
| Prioritas | Toggle | Tidak | Maks. 3 per agenda |
| Label prioritas | PILIH | Jika prioritas | **Target Selesai** / **Mulai Dikerjakan** |
| Target selesai | TGL | Jika prioritas | Default hari ini; wajib > hari ini jika "Mulai Dikerjakan" |
| Sumber | PILIH | Ya | Jobdesk, KPI, Instruksi Atasan, Program Kerja, Open Item, Jadwal |
| Jadikan Open Item | Toggle | – | Default dari `MasterKegiatan.jadi_open_item`. Jika ON, Case ID dibuat otomatis saat agenda disimpan |
| Case ID terkait | AUTO/PILIH | Tidak | Terisi jika dari Open Item, atau pilih Open Item aktif |

### 3.5 Blok saran (bukan blok tetap)
- Dari `MasterBlokSaran`, otomatis ditambahkan **hanya jika berada di dalam jam kerja** (Ashar 15.15 tidak muncul untuk Sabtu 08.00–15.00).
- Tampil sebagai baris abu-abu bertanda "Saran". **Jam bisa diubah, blok bisa dihapus.**
- Tidak dihitung sebagai kegiatan dan tidak masuk Laporan.

### 3.6 Pekerjaan pendukung (tanpa jam)
- Daftar centang dari `MasterPendukung` + item terakhir user.
- Tambah item: KETIK maks. 60 karakter (tersimpan untuk hari berikutnya).

### 3.7 Need Support (opsional, bisa lebih dari 1)
| Field | Isian | Wajib |
|---|---|---|
| Dukungan yang dibutuhkan | KETIK maks. 150 | Ya |
| Ditujukan ke | PILIH `MasterTujuan` | Ya |
| Batas waktu | TGL | Ya |
| Kegiatan / Case ID terkait | PILIH | Tidak |

### 3.8 Need Decision (opsional, bisa lebih dari 1)
| Field | Isian | Wajib |
|---|---|---|
| Keputusan yang dibutuhkan | KETIK maks. 150 | Ya |
| Alasan / dampak | KETIK maks. 200 | Ya |
| Opsi | KETIK, maks. 3 opsi | Tidak |
| Batas waktu | TGL | Ya |

Need Support/Decision yang belum dijawab dari hari sebelumnya tampil otomatis dengan statusnya.

### 3.9 Validasi sebelum Kirim
| Aturan | Jenis |
|---|---|
| Minimal 1 kegiatan (kecuali keterangan hari bukan Kerja) | Wajib |
| Prioritas maks. 3 | Wajib |
| Field wajib terisi | Wajib |
| Jam kegiatan bertabrakan dengan kegiatan lain | **Peringatan** (tetap bisa kirim) |
| Jam kegiatan di luar jam kerja (mis. perjadin) | **Peringatan** |
| Open Item lewat target belum dimasukkan atau diubah statusnya | **Peringatan** |

**Tidak ada batasan pengiriman**: boleh kirim berkali-kali dan kapan saja. Setiap kirim mencatat jam dan nomor kiriman (`KirimLog`); Dashboard menampilkan versi terakhir.

---

## 4. LAPORAN KERJA HARIAN

### 4.1 Header (AUTO)
Sama dengan Agenda, ditambah ID Agenda, jam kirim laporan, dan (jika tersedia) jam absen masuk/pulang.

### 4.2 Realisasi kegiatan (AUTO dari Agenda)
Semua kegiatan agenda tampil otomatis (blok saran tidak). Bisa diisi siang hari lewat tombol **Selesai** pada kegiatan.

| Field | Isian | Wajib | Catatan |
|---|---|---|---|
| Status | PILIH | Ya | **Selesai / Sebagian / Tidak Terlaksana / Dipindah** |
| Kolom hasil | Sesuai `MasterKegiatan.kolom_hasil` | Jika Selesai/Sebagian | Tanpa angka |
| Foto bukti | FOTO | Jika `foto_wajib` = YA dan status Selesai/Sebagian | Minimal 1 |
| Alasan | PILIH `MasterAlasan` + KETIK | Jika Sebagian / Tidak Terlaksana / Dipindah | Alasan baru tersimpan ke `MasterAlasan` |
| Dipindah ke | TGL | Jika Dipindah | Kegiatan otomatis masuk agenda tanggal tersebut |

Tombol **Semua Selesai** untuk menandai semua sekaligus, lalu ubah yang tidak.

**Kegiatan tak terencana**: tombol "Tambah Kegiatan Tak Terencana", isian sama dengan kegiatan agenda, ditandai "Tak Terencana".

### 4.3 Pekerjaan pendukung
Centang yang selesai dari daftar di Agenda.

### 4.4 Lead & temuan → Open Item otomatis
Ditawarkan (bisa dibatalkan) saat kegiatan disimpan:
- FLD dengan minat lanjutan ≠ Tidak → Open Item "[LEAD] Follow up …"
- GCOM dengan Lead catering = Ya → Open Item "[LEAD-CATERING] …"
- Sebar Proposal → Open Item "[FOLLOW UP PROPOSAL] …"
- Cek SOP dengan Hasil = Ada temuan → Open Item "[TEMUAN SOP] …", PIC Store Leader, status Didelegasikan

### 4.5 Status KPI hari ini (AUTO, tanpa angka & persen)
Untuk setiap KPI yang terhubung dengan kegiatan hari ini (`MasterKegiatan.kode_kpi`):
| Status | Aturan |
|---|---|
| **Tercapai** (hijau) | Semua kegiatan terkait berstatus Selesai |
| **Dalam Progress** (kuning) | Ada yang Selesai/Sebagian, tapi belum semua |
| **Belum Tercapai** (merah) | Tidak ada yang Selesai/Sebagian |

Ditampilkan sebagai daftar: nama KPI + chip status + nama kegiatan terkait.

### 4.6 Open Item
Tampil semua Open Item yang aktif atau disentuh hari ini.
| Field | Isian | Wajib |
|---|---|---|
| Case ID, Deskripsi, Referensi, PIC, Target | AUTO | |
| Progress hari ini | KETIK maks. 150 | Ya jika ada aktivitas; terisi otomatis dari hasil kegiatan terkait, bisa diedit |
| Kendala | KETIK maks. 150 | Tidak |
| Status baru | PILIH | Ya |
| Target baru | TGL | Jika target diubah, wajib alasan |

Tombol **Tambah Open Item**.

### 4.7 Need Support / Need Decision
- Yang diajukan di Agenda tampil AUTO beserta status jawabannya.
- Bisa tambah baru (isian sama dengan Agenda).
- Need Decision di Laporan wajib field **Dampak bila belum diputuskan** (KETIK maks. 200).

### 4.8 Executive Summary
- Draft AUTO, maks. 5 poin, **tanpa angka/persen**, dari nama kegiatan + status. Contoh:
  - "FLD TK Al-Ikhlas selesai"
  - "CX di Store Antapani selesai, saran utama: antrean kasir"
  - "Follow up proposal catering PT X masih berjalan"
  - "Open Item MCED/AB/004 ditutup"
  - "Satu keputusan menunggu persetujuan atasan"
- User bisa edit, hapus, atau tambah poin.

### 4.9 Refleksi harian (singkat, opsional)
| Field | Isian |
|---|---|
| Pencapaian terbaik hari ini | KETIK maks. 150 |
| Kendala terbesar | KETIK maks. 150 |
| Rencana besok | KETIK maks. 150 |

### 4.10 Validasi sebelum Kirim
| Aturan | Jenis |
|---|---|
| Semua kegiatan punya status | Wajib |
| Kegiatan Selesai/Sebagian punya kolom hasil terisi | Wajib |
| Foto bukti untuk jenis `foto_wajib` | Wajib |
| Alasan untuk Sebagian / Tidak Terlaksana / Dipindah | Wajib |
| Agenda hari itu belum dikirim | **Peringatan** (tetap bisa kirim) |

**Tidak ada batasan pengiriman** dan **tidak ada tanda terlambat**. Setiap kirim tercatat di `KirimLog`.

### 4.11 Bagian atasan (di Dashboard, bukan di PWA ini)
Status review (Belum Direview / Direview / Perlu Revisi), catatan/coaching, jawaban Need Support/Decision (Disetujui / Ditolak / Dialihkan), dan tombol instruksi baru yang otomatis menjadi Open Item dengan referensi "Instruksi Atasan". PWA menampilkan catatan dan jawaban atasan sebagai info di Beranda.

---

## 5. Status & label (UI tanpa emoji)

| Tempat | Pilihan | Warna chip |
|---|---|---|
| Open Item | Rencana / Proses / Selesai / Didelegasikan / Ditunda / Batal | biru / kuning / hijau / ungu / abu / merah |
| Kegiatan (laporan) | Selesai / Sebagian / Tidak Terlaksana / Dipindah | hijau / kuning / merah / abu |
| KPI | Tercapai / Dalam Progress / Belum Tercapai | hijau / kuning / merah |
| Prioritas | Target Selesai / Mulai Dikerjakan | oranye / biru |
| Permintaan | Menunggu / Disetujui / Ditolak / Dialihkan | kuning / hijau / merah / abu |

Pemetaan ke format standar Sedjati (untuk PDF): Rencana = Planned, Proses = In Progress, Selesai = Completed, Didelegasikan = Delegated, Ditunda = On Hold, Batal = Cancelled. Target Selesai = 🎯, Mulai Dikerjakan = ▶️.

---

## 6. OPEN ITEM

### 6.1 Case ID
- Format **`MCED/[KODE AKUN]/[NOMOR]`**, contoh `MCED/AB/001`, `MCED/AB/002`.
- Nomor urut **per kode akun**, 3 digit, terus bertambah (tidak reset).
- Dibuat oleh Apps Script (pakai `LockService`) agar tidak dobel. Saat offline: nomor sementara, diganti nomor resmi saat sinkron. Setelah resmi, **tidak bisa diubah**.

### 6.2 Cara dibuat
1. **Otomatis dari Agenda**: kegiatan dengan toggle "Jadikan Open Item" ON mendapat Case ID saat agenda disimpan/dikirim.
2. **Otomatis dari hasil kegiatan**: lead dan temuan (bagian 4.4).
3. **Manual**: tombol Tambah Open Item di Agenda dan Laporan.

### 6.3 Form Open Item
| Field | Isian | Wajib | Catatan |
|---|---|---|---|
| Case ID | AUTO | | |
| Jenis | PILIH | Ya | Komplain, Temuan SOP, Lead Catering, Follow Up Proposal, Event, Instruksi Atasan, Lainnya |
| Deskripsi | KETIK maks. 120 | Ya | Ditampilkan dengan awalan jenis, mis. `[KOMPLAIN] …` |
| Referensi | PILIH `MasterReferensi` | Ya | |
| Store terkait | PILIH | Tidak | |
| PIC | PILIH, bisa > 1 | Ya | Dari `Users` + Store Leader |
| Target selesai | TGL | Ya | |
| Status | PILIH | Ya | Default Rencana |
| Dibuat oleh / tanggal | AUTO | | |
| Riwayat | AUTO | | Setiap perubahan progress/status tercatat dengan tanggal (`OpenItemLog`) |

### 6.4 Aturan status
- Status akhir sah: **Selesai, Didelegasikan, Batal**. Hanya ini yang menghilangkan item dari agenda berikutnya.
- **Didelegasikan**: wajib isi PIC baru.
- **Batal**: wajib isi alasan.
- **Ditunda**: wajib isi tanggal tinjau ulang; item muncul lagi di agenda pada tanggal itu.

---

## 7. Output: Kirim ke Sheet + PDF format standar Sedjati

Tombol **Kirim**:
1. Simpan ke Sheet (untuk Dashboard).
2. Buat PDF sesuai format standar Sedjati, lalu buka menu **Bagikan** Android (ke Telegram) dengan **PDF + teks keterangan** sekaligus. Teks juga disalin sebagai cadangan.

Nama file: `Agenda Kerja - DD-MM-YYYY.pdf` / `Laporan Kerja - DD-MM-YYYY.pdf`. PDF tanpa nomor halaman dan tanpa footer.

Teks keterangan:
```
AGENDA KERJA
SEDJATI GROUP
Nama            : Nama Karyawan
Jabatan         : Marketing Event Admin
Atasan          : Nama Atasan
Unit Kerja      : Marketing and Customer Experience Division
Periode         : Harian
Tanggal         : Sabtu, 05 September 2026
```
(Laporan: baris pertama `LAPORAN KERJA`. Jika keterangan hari bukan Kerja, tambahkan baris kosong lalu keterangannya, mis. `Day Off`.)

Isi PDF Agenda:
- **A. Prioritas**: `1. 🎯 [Judul] — Target selesai: [tanggal]`.
- **B. Agenda / Pekerjaan Utama**: Timeline per kegiatan (jam, `[JENIS] judul`, store) + Pekerjaan Pendukung.
- **C. Open Item**: kartu Case ID, Deskripsi, Referensi, PIC, Target, Status.
- **D. Need Support**: tabel Dukungan | Ditujukan ke | Batas waktu.
- **E. Need Decision**: Keputusan, Alasan/Dampak, Opsi, Batas waktu.

Isi PDF Laporan:
- **A. Executive Summary**.
- **B. KPI / Progress**: tabel Pekerjaan | Hasil (ringkas dari kolom hasil) | Status kegiatan, lalu daftar status KPI.
- **C. Problem Log / Open Item**: tabel Case ID | Deskripsi | Referensi | Progress Hari Ini | Kendala | PIC | Target | Status.
- **D. Need Support**: tabel Dukungan | Ditujukan ke | Alasan | Status.
- **E. Need Decision**: Keputusan, Alasan, Dampak bila belum diputuskan, Opsi, Status.
- **F. Refleksi** (3 pertanyaan harian).
- **Lampiran Dokumentasi**: foto bukti, 2 per baris, dengan judul kegiatan.

---

## 8. Struktur data di Sheet (transaksi)

| Sheet | Kolom |
|---|---|
| `Agenda` | id_agenda, kode_akun, tanggal, keterangan_hari, jam_kerja_mulai, jam_kerja_selesai, pendukung (JSON), jam_kirim_terakhir, jumlah_kirim |
| `Kegiatan` | id, id_agenda, kode_akun, tanggal, kode_jenis, judul, store, jam_mulai, jam_selesai, prioritas (YA/TIDAK), label_prioritas, target_tanggal, sumber, case_id, tak_terencana (YA/TIDAK), status, hasil (JSON), alasan, dipindah_ke, link_foto |
| `OpenItem` | case_id, kode_akun, jenis, deskripsi, referensi, store, pic, target, status, tgl_tinjau, alasan_batal, dibuat_oleh, tanggal_dibuat, tanggal_tutup |
| `OpenItemLog` | case_id, tanggal, progress, kendala, status, target_baru, alasan_ubah_target |
| `Laporan` | id_laporan, id_agenda, kode_akun, tanggal, summary (JSON), refleksi (JSON 3), pendukung_selesai (JSON), jam_kirim_terakhir, jumlah_kirim, status_review, catatan_atasan |
| `Permintaan` | id, kode_akun, tanggal, jenis (Support/Decision), isi, ditujukan_ke, alasan, dampak, opsi, batas_waktu, terkait, jawaban, status |
| `KirimLog` | waktu, kode_akun, jenis (Agenda/Laporan), tanggal_dokumen, nomor_kirim, link_pdf |
| `Foto` | id, tanggal, id_kegiatan, link_drive, gambar_kecil |

Foto bukti dan PDF disimpan di folder Google Drive, dengan link di Sheet.

Aksi Apps Script (POST JSON + PIN/kode akun): `login`, `master` (ambil semua Master*), `simpanAgenda`, `simpanLaporan`, `simpanOpenItem`, `nomorCaseId`, `tambahAlasan`, `unggahFile`, `ambilData` (pulihkan data user).

---

## 9. Layar PWA (ringkas)

Menu bawah: **Beranda · Agenda · Laporan · Open Item**

1. **Beranda**:
   - Tanggal.
   - Status Agenda/Laporan hari ini (Belum / Draf / Terkirim + jam).
   - Open Item lewat target.
   - Jawaban atasan terbaru.
   - Tombol keterangan hari (Day Off/Cuti/Sakit/Izin).
2. **Agenda**:
   - Chip jam kerja.
   - Kartu Open Item aktif.
   - Timeline kegiatan + blok saran.
   - Tombol Tambah Kegiatan.
   - Pekerjaan pendukung.
   - Need Support/Decision.
   - **Kirim** (peringatan tampil di atas tombol).
3. **Form Kegiatan** (bottom sheet): Jenis → Judul → Store → Jam → Sumber → Prioritas → Jadikan Open Item.
4. **Laporan**:
   - Daftar kegiatan dengan chip status (tap untuk ganti).
   - Tap kegiatan → form hasil sesuai jenis + foto + alasan.
   - Tombol Semua Selesai, Tak Terencana.
5. **Cek Laporan** (1 halaman):
   - Status KPI.
   - Open Item (progress/status).
   - Need Support/Decision.
   - Executive Summary.
   - Refleksi.
   - **Kirim**.
6. **Open Item**: daftar per status + form Tambah/Ubah + riwayat.
7. **Pengaturan**:
   - Akun.
   - Jam kerja default.
   - Pendukung favorit.
   - Sinkron.

Gaya tampilan mengikuti keluarga aplikasi *-in* (font Fredoka/Nunito, warna oranye, kartu membulat, tema terang/gelap).

---

## 10. Belum dibuat (fase berikutnya)
- Agenda & Laporan Mingguan/Bulanan/Triwulan (agregasi dari harian).
- Perhitungan nilai KPI dan bobot di Dashboard.
- Integrasi otomatis dengan fitur Jadwal, alat Cek SOP, dan data absen (jika aplikasi MCED sudah punya; sampai saat itu diisi manual).
