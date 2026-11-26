const TZ = 'Asia/Jakarta';

const KOLOM = {
  Users: ['nama', 'kode_akun', 'password_hash', 'salt', 'status', 'region', 'jabatan', 'atasan', 'unit', 'tanggal_daftar'],
  Sesi: ['token_hash', 'kode_akun', 'dibuat'],
  Pengaturan: ['kunci', 'nilai'],
  Pilihan: ['Jabatan', 'Atasan', 'Unit Kerja'],
  MasterKegiatan: ['kode', 'nama', 'kolom_hasil', 'foto_wajib', 'lapangan', 'jadi_open_item', 'kode_kpi', 'urutan', 'aktif'],
  MasterKPI: ['kode_kpi', 'nama', 'kelompok', 'bobot', 'keterangan', 'aktif'],
  MasterAlasan: ['alasan'],
  MasterReferensi: ['referensi'],
  MasterTujuan: ['tujuan'],
  MasterPendukung: ['item', 'kode_akun'],
  MasterBlokSaran: ['nama', 'mulai', 'selesai'],
  MasterJamKerja: ['hari', 'mulai', 'selesai'],
  MasterSOP: ['jenis', 'bagian', 'item', 'bobot', 'k1', 'k2', 'k3', 'k4', 'k5', 'urutan', 'aktif'],
  Agenda: ['id_agenda', 'kode_akun', 'tanggal', 'keterangan_hari', 'catatan', 'mode_jam', 'jam_kerja_mulai', 'jam_kerja_selesai', 'saran', 'pendukung', 'jam_simpan', 'jam_kirim_terakhir', 'jumlah_kirim'],
  Kegiatan: ['id', 'id_agenda', 'kode_akun', 'tanggal', 'kode_jenis', 'judul', 'store', 'jam_mulai', 'jam_selesai', 'prioritas', 'label_prioritas', 'target_tanggal', 'sumber', 'jadi_open_item', 'case_id', 'id_jadwal', 'tak_terencana', 'status', 'hasil', 'alasan', 'dipindah_ke', 'link_foto'],
  OpenItem: ['case_id', 'kode_akun', 'jenis', 'deskripsi', 'referensi', 'store', 'pic', 'target', 'status', 'tgl_tinjau', 'alasan_batal', 'dibuat_oleh', 'tanggal_dibuat', 'tanggal_tutup'],
  OpenItemLog: ['case_id', 'tanggal', 'oleh', 'progress', 'kendala', 'status', 'target_baru', 'alasan_ubah_target'],
  Laporan: ['id_laporan', 'id_agenda', 'kode_akun', 'tanggal', 'summary', 'refleksi', 'pendukung_selesai', 'jam_simpan', 'jam_kirim_terakhir', 'jumlah_kirim', 'status_review', 'catatan_atasan'],
  Permintaan: ['id', 'kode_akun', 'tanggal', 'jenis', 'isi', 'ditujukan_ke', 'alasan', 'dampak', 'opsi', 'batas_waktu', 'terkait', 'jawaban', 'status'],
  KirimLog: ['waktu', 'kode_akun', 'jenis', 'tanggal_dokumen', 'nomor_kirim', 'link_pdf'],
  Foto: ['id', 'tanggal', 'kode_akun', 'terkait', 'link_drive'],
  Jadwal: ['id', 'kode_akun', 'nama', 'region', 'tanggal', 'jam', 'kode_jenis', 'store', 'keterangan', 'status', 'dibuat'],
  HasilSOP: ['id', 'kode_akun', 'tanggal', 'jam', 'jenis', 'store', 'petugas', 'area', 'hasil', 'poin', 'kategori', 'waktu_simpan']
};

const SEED = {
  Pengaturan: [['telegram_admin', ''], ['link_absen', '']],
  MasterKegiatan: [
    ['FLD', 'Fun Learning Day (FLD)', 'Nama TK:KETIK; Store pelaksana:STORE; Minat lanjutan:PILIH:Tidak|Cooking Class|Catering|GCOM; Catatan:KETIK', 'YA', 'YA', 'TIDAK', 'KPI-FLD', 1, 'YA'],
    ['CC', 'Cooking Class', 'Nama grup:KETIK; Store:STORE; Catatan:KETIK', 'YA', 'YA', 'TIDAK', 'KPI-FLD', 2, 'YA'],
    ['GCOM', 'Gathering Community', 'Nama komunitas:KETIK; Kontak PIC:KETIK; Lead catering:YA/TIDAK; Catatan:KETIK', 'YA', 'YA', 'TIDAK', 'KPI-GCOM', 3, 'YA'],
    ['CX', 'Customer Experience', 'Store:STORE; Ajakan Google review:YA/TIDAK; Saran utama:KETIK', 'YA', 'YA', 'TIDAK', 'KPI-REVIEW', 4, 'YA'],
    ['PROP', 'Sebar Proposal', 'Jenis proposal:PILIH:Catering|GCOM|FLD|Cooking Class; Nama tujuan:KETIK; Cara:PILIH:Langsung|WA|Email', 'TIDAK', 'YA', 'YA', '', 5, 'YA'],
    ['SOP', 'Cek SOP Store', 'Store:STORE; Hasil:PILIH:Sesuai standar|Ada temuan; Temuan:KETIK', 'TIDAK', 'YA', 'TIDAK', 'KPI-REVIEW', 6, 'YA'],
    ['APP', 'Cek Aplikasi Online', 'Store:STORE; Platform:PILIH:GoFood|GrabFood|ShopeeFood|Lainnya; Ada komplain baru:YA/TIDAK; Catatan:KETIK', 'TIDAK', 'TIDAK', 'TIDAK', '', 7, 'YA'],
    ['KOMP', 'Kunjungan Komplain', 'Case ID:OPENITEM; Hasil penanganan:KETIK; Status komplain:PILIH:Selesai|Proses', 'YA', 'YA', 'TIDAK', '', 8, 'YA'],
    ['EVENT', 'Support Event / Catering', 'Nama event:KETIK; Peran:PILIH:Sponsor|Catering|Booth|Lainnya', 'YA', 'YA', 'TIDAK', '', 9, 'YA'],
    ['PERJADIN', 'Perjalanan Dinas', 'Tujuan:STORE; Jam berangkat:JAM; Jam tiba:JAM', 'TIDAK', 'YA', 'TIDAK', '', 10, 'YA'],
    ['ADM', 'Administrasi', 'Keterangan:KETIK', 'TIDAK', 'TIDAK', 'TIDAK', '', 11, 'YA']
  ],
  MasterKPI: [
    ['KPI-FLD', 'Pelaksanaan FLD dan Cooking Class', 'Hasil', '', '', 'YA'],
    ['KPI-GCOM', 'Gathering Community', 'Hasil', '', '', 'YA'],
    ['KPI-REVIEW', 'Customer Experience dan review', 'Kualitas', '', '', 'YA'],
    ['DIS-AGENDA', 'Disiplin agenda dan laporan', 'Disiplin Eksekusi', '', '', 'YA']
  ],
  MasterAlasan: [['Cuaca'], ['Dibatalkan pihak luar'], ['Waktu tidak cukup'], ['Instruksi atasan'], ['Lainnya']],
  MasterReferensi: [['Komplain'], ['Hasil SOP'], ['Hasil GCOM'], ['Hasil FLD'], ['Instruksi Atasan'], ['KPI'], ['Rapat'], ['Audit']],
  MasterTujuan: [['Atasan'], ['Store Leader'], ['Supply Chain'], ['Finance'], ['GA'], ['Kreatif'], ['Lainnya']],
  MasterPendukung: [['Cek aplikasi online', ''], ['Cek komplain terbaru', ''], ['Follow up lead', ''], ['Update tracker proposal', '']],
  MasterBlokSaran: [['Istirahat dan Dzuhur', '12:00', '13:00'], ['Ashar', '15:15', '15:30']],
  MasterJamKerja: [['Senin,Selasa,Rabu,Kamis,Jumat', '08:00', '17:00'], ['Sabtu', '08:00', '15:00']]
};

const KET_HARI = ['Kerja', 'Day Off', 'Cuti', 'Sakit', 'Izin'];
const SUMBER = ['Jobdesk', 'KPI', 'Instruksi Atasan', 'Program Kerja', 'Open Item', 'Jadwal', 'Dipindah'];
const LABEL_PRIO = ['Target Selesai', 'Mulai Dikerjakan'];
const STATUS_KEG = ['Selesai', 'Sebagian', 'Tidak Terlaksana', 'Dipindah'];
const STATUS_OI = ['Rencana', 'Proses', 'Selesai', 'Didelegasikan', 'Ditunda', 'Batal'];
const OI_AKHIR = ['Selesai', 'Didelegasikan', 'Batal'];
const JENIS_OI = ['Komplain', 'Temuan SOP', 'Lead Catering', 'Follow Up Proposal', 'Event', 'Instruksi Atasan', 'Lainnya'];
const STATUS_JADWAL = ['Belum dikonfirmasi', 'Terkonfirmasi', 'Batal'];
const JENIS_SOP = ['7langkah', 'doublecheck', 'kebersihan'];
const KATEGORI_SOP = ['Sempurna', 'Sangat Baik', 'Baik', 'Cukup', 'Buruk'];
const JENIS_KIRIM = ['Agenda', 'Laporan', 'Takbiran'];

const AKSI = {
  daftar: { publik: true, tulis: true, fn: aksiDaftar },
  masuk: { publik: true, tulis: true, fn: aksiMasuk },
  keluar: { tulis: true, fn: aksiKeluar },
  master: { fn: aksiMaster },
  beranda: { fn: aksiBeranda },
  simpanProfil: { tulis: true, fn: aksiSimpanProfil },
  hari: { fn: aksiHari },
  hariLalu: { fn: aksiHariLalu },
  simpanAgenda: { tulis: true, fn: aksiSimpanAgenda },
  simpanLaporan: { tulis: true, fn: aksiSimpanLaporan },
  openItem: { fn: aksiOpenItem },
  riwayatOpenItem: { fn: aksiRiwayatOpenItem },
  simpanOpenItem: { tulis: true, fn: aksiSimpanOpenItem },
  jadwal: { fn: aksiJadwal },
  simpanJadwal: { tulis: true, fn: aksiSimpanJadwal },
  komplain: { fn: aksiKomplain },
  simpanSop: { tulis: true, fn: aksiSimpanSop },
  unggah: { tulis: true, fn: aksiUnggah },
  catatKirim: { tulis: true, fn: aksiCatatKirim }
};

function doGet() {
  return jsonOut({ ok: false, pesan: 'Aksi tidak dikenal.' });
}

function doPost(e) {
  let out;
  try {
    const raw = (e && e.postData && e.postData.contents) || '';
    if (raw.length > 15000000) gagal('Data terlalu besar.');
    let b;
    try { b = JSON.parse(raw); } catch (x) { gagal('Format permintaan tidak valid.'); }
    if (!b || typeof b.action !== 'string' || !Object.prototype.hasOwnProperty.call(AKSI, b.action)) gagal('Aksi tidak dikenal.');
    const a = AKSI[b.action];
    batasi('semua', 400, 60);
    let u = null;
    if (!a.publik) {
      u = pengguna(b.token);
      batasi('u:' + u.kode_akun, 90, 60);
    }
    let data;
    if (a.tulis) {
      const lock = LockService.getScriptLock();
      if (!lock.tryLock(25000)) gagal('Server sedang sibuk. Coba lagi.');
      try { data = a.fn(b, u); } finally { lock.releaseLock(); }
    } else {
      data = a.fn(b, u);
    }
    out = { ok: true, data: data };
  } catch (err) {
    if (err && err.pesan) out = { ok: false, pesan: err.pesan, kode: err.kode || '' };
    else { console.error(err); out = { ok: false, pesan: 'Terjadi kesalahan di server.' }; }
  }
  return jsonOut(out);
}

function jsonOut(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function gagal(pesan, kode) {
  throw { pesan: pesan, kode: kode || '' };
}

function siapkanSheet() {
  const s = ss();
  Object.keys(KOLOM).forEach(function (nama) {
    let sh = s.getSheetByName(nama);
    if (sh) return;
    sh = s.insertSheet(nama);
    const head = KOLOM[nama];
    sh.getRange(1, 1, sh.getMaxRows(), head.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1);
    const seed = nama === 'MasterSOP' ? SEED_SOP : SEED[nama];
    if (seed && seed.length) sh.getRange(2, 1, seed.length, head.length).setValues(seed.map(function (r) { return r.map(String); }));
  });
}

let ssMemo = null;
function ss() {
  if (!ssMemo) {
    const id = prop('SPREADSHEET_ID');
    if (!id) gagal('SPREADSHEET_ID belum diatur.');
    ssMemo = SpreadsheetApp.openById(id);
  }
  return ssMemo;
}

function prop(k) {
  return PropertiesService.getScriptProperties().getProperty(k);
}

function norm(h) {
  return String(h).trim().toLowerCase().replace(/\s+/g, '_');
}

function sel(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    if (isNaN(v.getTime())) return '';
    if (v.getFullYear() < 1901) return Utilities.formatDate(v, TZ, 'HH:mm');
    const t = Utilities.formatDate(v, TZ, 'HH:mm');
    return Utilities.formatDate(v, TZ, 'yyyy-MM-dd') + (t === '00:00' ? '' : ' ' + t);
  }
  return typeof v === 'string' ? v.trim() : String(v);
}

function baca(nama) {
  const sh = ss().getSheetByName(nama);
  if (!sh) gagal('Sheet ' + nama + ' belum ada.');
  const v = sh.getDataRange().getValues();
  const head = (v.shift() || []).map(norm);
  return {
    sh: sh,
    head: head,
    rows: v.map(function (r, i) {
      const o = { _baris: i + 2 };
      head.forEach(function (h, j) { if (h) o[h] = sel(r[j]); });
      return o;
    })
  };
}

function nilaiSel(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'boolean') return v ? 'YA' : 'TIDAK';
  const s = String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function barisDari(t, obj, lama) {
  return t.head.map(function (h) {
    if (Object.prototype.hasOwnProperty.call(obj, h)) return nilaiSel(obj[h]);
    return lama ? nilaiSel(lama[h]) : '';
  });
}

function tambah(t, objs) {
  if (!objs.length) return;
  const rows = objs.map(function (o) { return barisDari(t, o); });
  const start = t.sh.getLastRow() + 1;
  t.sh.getRange(start, 1, rows.length, t.head.length).setNumberFormat('@').setValues(rows);
}

function ubah(t, lama, obj) {
  t.sh.getRange(lama._baris, 1, 1, t.head.length).setValues([barisDari(t, obj, lama)]);
}

function hapus(t, rows) {
  rows.map(function (r) { return r._baris; }).sort(function (a, b) { return b - a; }).forEach(function (n) { t.sh.deleteRow(n); });
}

function batasi(kunci, maks, detik) {
  const c = CacheService.getScriptCache();
  const k = 'r:' + kunci;
  const n = Number(c.get(k) || 0);
  if (n >= maks) gagal('Terlalu banyak permintaan. Coba lagi sebentar.');
  c.put(k, String(n + 1), detik);
}

function sekarang() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm');
}

function hariIni() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

function geserHari(s, n) {
  const p = s.split('-').map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
}

function hex(bytes) {
  return bytes.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}

function sha(s) {
  return hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8));
}

function hashPw(pw, salt) {
  let h = salt + ':' + pw;
  for (let i = 0; i < 1000; i++) h = sha(h + ':' + salt);
  return h;
}

function acak() {
  return Utilities.getUuid().replace(/-/g, '');
}

function teks(v, maks, wajib, label) {
  if (v === undefined || v === null) v = '';
  if (typeof v !== 'string' && typeof v !== 'number') gagal((label || 'Isian') + ' tidak valid.');
  const s = String(v).replace(/[\u0000-\u0008\u000B-\u001F]/g, '').trim();
  if (wajib && !s) gagal((label || 'Isian') + ' wajib diisi.');
  if (s.length > maks) gagal((label || 'Isian') + ' terlalu panjang.');
  return s;
}

function pilih(v, daftar, label, boleh) {
  if ((v === '' || v === undefined || v === null) && boleh) return '';
  if (daftar.indexOf(v) < 0) gagal((label || 'Pilihan') + ' tidak valid.');
  return v;
}

function tgl(v, label, boleh) {
  if (!v && boleh) return '';
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) gagal((label || 'Tanggal') + ' tidak valid.');
  return v;
}

function jamValid(v, label, boleh) {
  if (!v && boleh) return '';
  if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) gagal((label || 'Jam') + ' tidak valid.');
  return v;
}

function idValid(v) {
  if (typeof v !== 'string' || !/^[A-Za-z0-9_-]{4,40}$/.test(v)) gagal('ID tidak valid.');
  return v;
}

function caseIdValid(v) {
  if (typeof v !== 'string' || !/^MCED\/[A-Z0-9]{2,6}\/\d{3,6}$/.test(v)) gagal('Case ID tidak valid.');
  return v;
}

function linkValid(v) {
  if (typeof v !== 'string' || v.length > 300 || !/^https:\/\/(drive|docs)\.google\.com\//.test(v)) gagal('Link tidak valid.');
  return v;
}

function daftarTeks(v, maksJumlah, maks, label) {
  if (!v) return [];
  if (!Array.isArray(v) || v.length > maksJumlah) gagal((label || 'Daftar') + ' tidak valid.');
  return v.map(function (x) { return teks(x, maks, true, label); });
}

function ya(v) {
  return String(v).trim().toUpperCase() === 'YA';
}

function aktifRow(r) {
  return !r.aktif || ya(r.aktif);
}

function jsonAman(s, def) {
  if (!s) return def;
  try { return JSON.parse(s); } catch (e) { return def; }
}

function setelan(kunci) {
  const r = baca('Pengaturan').rows.filter(function (x) { return x.kunci === kunci; })[0];
  return r ? r.nilai : '';
}

function pesanAdmin(awal) {
  const tg = setelan('telegram_admin');
  return tg ? awal + ' Hubungi Telegram ' + tg + '.' : awal;
}

function namaBersih(v) {
  const s = teks(v, 60, true, 'Nama').replace(/\s+/g, ' ');
  if (s.length < 3 || !/^[\p{L} .'-]+$/u.test(s)) gagal('Nama tidak valid.');
  return s;
}

function samaNama(a, b) {
  return String(a).trim().replace(/\s+/g, ' ').toLowerCase() === String(b).trim().replace(/\s+/g, ' ').toLowerCase();
}

function sandi(v) {
  if (typeof v !== 'string' || v.length < 6 || v.length > 64) gagal('Password 6 sampai 64 karakter.');
  return v;
}

function buatKode(nama, ada) {
  const k = nama.toUpperCase().replace(/[^A-Z ]/g, '').split(' ').filter(Boolean);
  if (!k.length) gagal('Nama tidak valid.');
  const akhir = k[k.length - 1];
  const dasar = k.length === 1 ? (akhir + akhir).slice(0, 2) : k[0][0] + akhir[0];
  const calon = [dasar, dasar + akhir[akhir.length - 1]];
  for (let i = 2; i < 1000; i++) calon.push(dasar + i);
  return calon.filter(function (c) { return ada.indexOf(c) < 0; })[0];
}

function aktif(u) {
  const s = String(u.status).trim().toLowerCase();
  return s === 'member' || s === 'admin';
}

function admin(u) {
  return String(u.status).trim().toLowerCase() === 'admin';
}

function profil(u) {
  return {
    nama: u.nama, kode: u.kode_akun, status: admin(u) ? 'Admin' : 'Member', region: u.region,
    jabatan: u.jabatan, atasan: u.atasan ? u.atasan.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : [], unit: u.unit
  };
}

function pengguna(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) gagal('Sesi berakhir.', 'SESI');
  const th = sha(token);
  const c = CacheService.getScriptCache();
  let kode = c.get('s:' + th);
  if (!kode) {
    const s = baca('Sesi').rows.filter(function (r) { return r.token_hash === th; })[0];
    if (!s) gagal('Sesi berakhir.', 'SESI');
    kode = s.kode_akun;
    c.put('s:' + th, kode, 21600);
  }
  const u = baca('Users').rows.filter(function (r) { return r.kode_akun === kode; })[0];
  if (!u || !aktif(u)) gagal('Akun tidak aktif.', 'SESI');
  u._th = th;
  return u;
}

function aksiDaftar(b) {
  batasi('daftar', 20, 60);
  const nama = namaBersih(b.nama);
  const pw = sandi(b.password);
  const t = baca('Users');
  if (t.rows.some(function (r) { return samaNama(r.nama, nama); })) gagal('Nama sudah terdaftar.');
  const kode = buatKode(nama, t.rows.map(function (r) { return String(r.kode_akun).toUpperCase(); }));
  const salt = acak();
  tambah(t, [{ nama: nama, kode_akun: kode, password_hash: hashPw(pw, salt), salt: salt, status: '', tanggal_daftar: sekarang() }]);
  return { pesan: pesanAdmin('Pendaftaran terkirim.') };
}

function aksiMasuk(b) {
  batasi('masuk', 60, 60);
  const nama = namaBersih(b.nama);
  batasi('m:' + nama.toLowerCase(), 8, 600);
  const pw = sandi(b.password);
  const u = baca('Users').rows.filter(function (r) { return samaNama(r.nama, nama); })[0];
  if (!u || hashPw(pw, u.salt) !== u.password_hash) gagal('Nama atau password salah.');
  if (!aktif(u)) gagal(pesanAdmin('Akun belum aktif.'));
  const token = acak() + acak();
  tambah(baca('Sesi'), [{ token_hash: sha(token), kode_akun: u.kode_akun, dibuat: sekarang() }]);
  return { token: token, profil: profil(u) };
}

function aksiKeluar(b, u) {
  const t = baca('Sesi');
  hapus(t, t.rows.filter(function (r) { return r.token_hash === u._th; }));
  CacheService.getScriptCache().remove('s:' + u._th);
  return {};
}

function bacaToko() {
  const c = CacheService.getScriptCache();
  const memo = c.get('toko');
  if (memo) return JSON.parse(memo);
  const sh = ss().getSheets().filter(function (s) { return s.getName().trim().toLowerCase() === 'toko'; })[0];
  if (!sh) gagal('Sheet Toko tidak ditemukan.');
  const v = sh.getDataRange().getValues();
  const head = (v.shift() || []).map(function (h) { return String(h).toLowerCase(); });
  const cari = function (k) { for (let i = 0; i < head.length; i++) if (head[i].indexOf(k) >= 0) return i; return -1; };
  const iR = cari('region'), iA = cari('area'), iT = cari('montaz');
  if (iR < 0 || iT < 0) gagal('Kolom region atau montaz di sheet Toko tidak ditemukan.');
  const out = v.map(function (r) {
    return { nama: sel(r[iT]), region: sel(r[iR]), area: iA >= 0 ? sel(r[iA]) : '' };
  }).filter(function (t) { return t.nama; });
  c.put('toko', JSON.stringify(out), 600);
  return out;
}

function tokoUntuk(u) {
  const all = bacaToko();
  if (admin(u)) return all;
  const r = String(u.region).toLowerCase();
  return r ? all.filter(function (t) { return t.region.toLowerCase() === r; }) : [];
}

function kolomPilihan(k) {
  const out = [];
  baca('Pilihan').rows.forEach(function (r) { if (r[k] && out.indexOf(r[k]) < 0) out.push(r[k]); });
  return out;
}

function daftarRegion() {
  const out = [];
  bacaToko().forEach(function (t) { if (t.region && out.indexOf(t.region) < 0) out.push(t.region); });
  return out.sort();
}

function masterKegiatan() {
  return baca('MasterKegiatan').rows.filter(aktifRow).sort(function (a, b) { return Number(a.urutan) - Number(b.urutan); }).map(function (r) {
    return {
      kode: r.kode, nama: r.nama, hasil: r.kolom_hasil, foto: ya(r.foto_wajib), lapangan: ya(r.lapangan), oi: ya(r.jadi_open_item),
      kpi: r.kode_kpi ? r.kode_kpi.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : []
    };
  });
}

function kolomSatu(nama, k) {
  return baca(nama).rows.map(function (r) { return r[k]; }).filter(Boolean);
}

function aksiMaster(b, u) {
  const sop = baca('MasterSOP').rows.filter(aktifRow).sort(function (a, b2) { return Number(a.urutan) - Number(b2.urutan); }).map(function (r) {
    return { jenis: r.jenis, bagian: r.bagian, item: r.item, bobot: Number(r.bobot) || 0, k: [r.k1, r.k2, r.k3, r.k4, r.k5] };
  });
  return {
    profil: profil(u),
    pilihan: { region: daftarRegion(), jabatan: kolomPilihan('jabatan'), atasan: kolomPilihan('atasan'), unit: kolomPilihan('unit_kerja') },
    kegiatan: masterKegiatan(),
    kpi: baca('MasterKPI').rows.filter(aktifRow).map(function (r) { return { kode: r.kode_kpi, nama: r.nama }; }),
    alasan: kolomSatu('MasterAlasan', 'alasan'),
    referensi: kolomSatu('MasterReferensi', 'referensi'),
    tujuan: kolomSatu('MasterTujuan', 'tujuan'),
    pendukung: baca('MasterPendukung').rows.filter(function (r) { return r.item && (!r.kode_akun || r.kode_akun === u.kode_akun); }).map(function (r) { return r.item; }),
    saran: baca('MasterBlokSaran').rows.filter(function (r) { return r.nama; }).map(function (r) { return { nama: r.nama, mulai: r.mulai, selesai: r.selesai }; }),
    jamKerja: baca('MasterJamKerja').rows.filter(function (r) { return r.hari; }).map(function (r) { return { hari: r.hari.split(',').map(function (x) { return x.trim(); }), mulai: r.mulai, selesai: r.selesai }; }),
    sop: sop,
    toko: tokoUntuk(u),
    member: baca('Users').rows.filter(aktif).map(function (r) { return r.nama; }).sort(),
    linkAbsen: setelan('link_absen')
  };
}

function aksiSimpanProfil(b, u) {
  const region = pilih(b.region, daftarRegion(), 'Region');
  const jabatan = pilih(b.jabatan, kolomPilihan('jabatan'), 'Jabatan');
  const daftarAtasan = kolomPilihan('atasan');
  if (!Array.isArray(b.atasan) || !b.atasan.length || b.atasan.length > 5) gagal('Atasan wajib dipilih.');
  const atasan = b.atasan.map(function (a) { return pilih(a, daftarAtasan, 'Atasan'); });
  const unit = pilih(b.unit, kolomPilihan('unit_kerja'), 'Unit Kerja');
  const t = baca('Users');
  const row = t.rows.filter(function (r) { return r.kode_akun === u.kode_akun; })[0];
  ubah(t, row, { region: region, jabatan: jabatan, atasan: atasan.join(', '), unit: unit });
  return profil(Object.assign({}, row, { region: region, jabatan: jabatan, atasan: atasan.join(', '), unit: unit }));
}

function picBerisi(pic, nama) {
  return String(pic).split(',').some(function (p) { return samaNama(p, nama); });
}

function oiKeluar(r) {
  return {
    caseId: r.case_id, jenis: r.jenis, deskripsi: r.deskripsi, referensi: r.referensi, store: r.store,
    pic: r.pic ? r.pic.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : [], target: r.target, status: r.status,
    tglTinjau: r.tgl_tinjau, alasanBatal: r.alasan_batal, dibuatOleh: r.dibuat_oleh, tanggalDibuat: r.tanggal_dibuat, tanggalTutup: r.tanggal_tutup
  };
}

function oiMilik(r, u) {
  return r.kode_akun === u.kode_akun || picBerisi(r.pic, u.nama);
}

function oiSaya(u, semua) {
  return baca('OpenItem').rows.filter(function (r) {
    return r.case_id && oiMilik(r, u) && (semua || OI_AKHIR.indexOf(r.status) < 0);
  }).map(oiKeluar);
}

function jadwalKeluar(r, u) {
  return { id: r.id, nama: r.nama, tanggal: r.tanggal, jam: r.jam, jenis: r.kode_jenis, store: r.store, keterangan: r.keterangan, status: r.status, milik: r.kode_akun === u.kode_akun || admin(u) };
}

function jadwalTerlihat(u, dari, sampai) {
  const reg = String(u.region).toLowerCase();
  return baca('Jadwal').rows.filter(function (r) {
    return r.id && r.tanggal >= dari && r.tanggal <= sampai && (admin(u) || r.kode_akun === u.kode_akun || String(r.region).toLowerCase() === reg);
  }).sort(function (a, b) { return (a.tanggal + a.jam).localeCompare(b.tanggal + b.jam); }).map(function (r) { return jadwalKeluar(r, u); });
}

function permintaanKeluar(r) {
  return {
    id: r.id, tanggal: r.tanggal, jenis: r.jenis, isi: r.isi, tujuan: r.ditujukan_ke, alasan: r.alasan, dampak: r.dampak,
    opsi: jsonAman(r.opsi, []), batas: r.batas_waktu, terkait: r.terkait, jawaban: r.jawaban, status: r.status || 'Menunggu'
  };
}

function statusDok(nama, id) {
  const r = baca(nama).rows.filter(function (x) { return x[nama === 'Agenda' ? 'id_agenda' : 'id_laporan'] === id; })[0];
  return r ? { simpan: r.jam_simpan, kirim: r.jam_kirim_terakhir, jumlah: Number(r.jumlah_kirim) || 0 } : null;
}

function aksiBeranda(b, u) {
  const hari = hariIni();
  const p = hari.split('-').map(Number);
  const dow = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
  const senin = geserHari(hari, dow === 0 ? -6 : 1 - dow);
  const jad = jadwalTerlihat(u, senin, geserHari(hari, 60));
  const minggu = geserHari(senin, 6);
  let komplain = null, komplainGagal = '';
  try { komplain = komplainUntuk(u).slice(0, 3); } catch (e) { komplainGagal = e && e.pesan ? e.pesan : 'Komplain gagal dimuat.'; }
  const id = u.kode_akun + '-' + hari.replace(/-/g, '');
  const catatan = baca('Laporan').rows.filter(function (r) { return r.kode_akun === u.kode_akun && r.catatan_atasan; })
    .sort(function (a, c) { return c.tanggal.localeCompare(a.tanggal); }).slice(0, 3)
    .map(function (r) { return { tanggal: r.tanggal, catatan: r.catatan_atasan, review: r.status_review }; });
  return {
    hari: hari,
    jadwalMinggu: jad.filter(function (j) { return j.tanggal <= minggu && j.status !== 'Batal'; }).slice(0, 20),
    jadwalBelum: jad.filter(function (j) { return j.tanggal >= hari && j.status === 'Belum dikonfirmasi'; }).slice(0, 20),
    komplain: komplain,
    komplainGagal: komplainGagal,
    openItem: oiSaya(u, false),
    permintaan: baca('Permintaan').rows.filter(function (r) { return r.kode_akun === u.kode_akun && (r.status === 'Menunggu' || !r.status || r.tanggal >= geserHari(hari, -7)); }).map(permintaanKeluar),
    agenda: statusDok('Agenda', id),
    laporan: statusDok('Laporan', id),
    catatan: catatan
  };
}

function kegiatanKeluar(r) {
  return {
    id: r.id, jenis: r.kode_jenis, judul: r.judul, store: r.store, mulai: r.jam_mulai, selesai: r.jam_selesai, prio: ya(r.prioritas),
    label: r.label_prioritas, target: r.target_tanggal, sumber: r.sumber, oi: ya(r.jadi_open_item), caseId: r.case_id, jadwal: r.id_jadwal,
    tak: ya(r.tak_terencana), status: r.status, hasil: jsonAman(r.hasil, {}), alasan: r.alasan, pindah: r.dipindah_ke, foto: jsonAman(r.link_foto, [])
  };
}

function aksiHari(b, u) {
  const tanggal = tgl(b.tanggal);
  const id = u.kode_akun + '-' + tanggal.replace(/-/g, '');
  const a = baca('Agenda').rows.filter(function (r) { return r.id_agenda === id; })[0];
  const l = baca('Laporan').rows.filter(function (r) { return r.id_laporan === id; })[0];
  return {
    agenda: a ? {
      ket: a.keterangan_hari, catatan: a.catatan, mode: a.mode_jam, mulai: a.jam_kerja_mulai, selesai: a.jam_kerja_selesai,
      saran: jsonAman(a.saran, []), pendukung: jsonAman(a.pendukung, []), simpan: a.jam_simpan, kirim: a.jam_kirim_terakhir, jumlah: Number(a.jumlah_kirim) || 0
    } : null,
    kegiatan: baca('Kegiatan').rows.filter(function (r) { return r.id_agenda === id; }).map(kegiatanKeluar),
    laporan: l ? {
      summary: jsonAman(l.summary, []), refleksi: jsonAman(l.refleksi, []), pendukung: jsonAman(l.pendukung_selesai, []),
      simpan: l.jam_simpan, kirim: l.jam_kirim_terakhir, jumlah: Number(l.jumlah_kirim) || 0, review: l.status_review, catatan: l.catatan_atasan
    } : null,
    permintaan: baca('Permintaan').rows.filter(function (r) {
      return r.kode_akun === u.kode_akun && (r.tanggal === tanggal || (r.tanggal < tanggal && (r.status === 'Menunggu' || !r.status)));
    }).map(permintaanKeluar),
    jadwal: baca('Jadwal').rows.filter(function (r) { return r.kode_akun === u.kode_akun && r.tanggal === tanggal && r.status !== 'Batal'; }).map(function (r) { return jadwalKeluar(r, u); }),
    openItem: oiSaya(u, false)
  };
}

function aksiHariLalu(b, u) {
  const tanggal = tgl(b.tanggal);
  const batas = geserHari(tanggal, -14);
  const kerja = baca('Agenda').rows.filter(function (r) {
    return r.kode_akun === u.kode_akun && r.tanggal < tanggal && r.tanggal >= batas && r.keterangan_hari === 'Kerja';
  }).map(function (r) { return r.id_agenda; });
  const keg = baca('Kegiatan').rows.filter(function (r) { return kerja.indexOf(r.id_agenda) >= 0; });
  if (!keg.length) return null;
  const t = keg.map(function (r) { return r.tanggal; }).sort().pop();
  return { tanggal: t, kegiatan: keg.filter(function (r) { return r.tanggal === t; }).map(kegiatanKeluar) };
}

function cekKegiatan(x, kodeJenis, mode, tanggal) {
  if (!x || typeof x !== 'object') gagal('Kegiatan tidak valid.');
  const status = pilih(x.status, STATUS_KEG, 'Status kegiatan', mode !== 'laporan');
  const k = {
    id: idValid(x.id),
    jenis: pilih(x.jenis, kodeJenis, 'Jenis kegiatan'),
    judul: teks(x.judul, 60, true, 'Judul'),
    store: teks(x.store, 80, true, 'Store'),
    mulai: jamValid(x.mulai, 'Jam mulai'),
    selesai: jamValid(x.selesai, 'Jam selesai'),
    prio: !!x.prio,
    label: x.prio ? pilih(x.label, LABEL_PRIO, 'Label prioritas') : '',
    target: x.prio ? tgl(x.target, 'Target selesai') : '',
    sumber: pilih(x.sumber, SUMBER, 'Sumber'),
    oi: !!x.oi,
    caseId: x.caseId ? caseIdValid(x.caseId) : '',
    jadwal: x.jadwal ? idValid(x.jadwal) : '',
    tak: !!x.tak,
    status: status,
    hasil: {},
    alasan: teks(x.alasan, 150, false, 'Alasan'),
    pindah: tgl(x.pindah, 'Tanggal pindah', true),
    foto: (Array.isArray(x.foto) ? x.foto : []).slice(0, 10).map(linkValid)
  };
  if (k.selesai <= k.mulai && k.jenis !== 'PERJADIN') gagal('Jam selesai harus setelah jam mulai.');
  if (k.label === 'Mulai Dikerjakan' && k.target <= tanggal) gagal('Target "Mulai Dikerjakan" harus setelah tanggal agenda.');
  if (x.hasil && typeof x.hasil === 'object') {
    const keys = Object.keys(x.hasil);
    if (keys.length > 12) gagal('Kolom hasil tidak valid.');
    keys.forEach(function (key) { k.hasil[teks(key, 60, true, 'Kolom hasil')] = teks(x.hasil[key], 200, false, key); });
  }
  if (mode === 'laporan' && ['Sebagian', 'Tidak Terlaksana', 'Dipindah'].indexOf(status) >= 0 && !k.alasan) gagal('Alasan wajib diisi untuk ' + k.judul + '.');
  if (status === 'Dipindah' && !k.pindah) gagal('Tanggal pindah wajib diisi untuk ' + k.judul + '.');
  return k;
}

function cekPermintaan(x) {
  if (!x || typeof x !== 'object') gagal('Permintaan tidak valid.');
  const jenis = pilih(x.jenis, ['Support', 'Decision'], 'Jenis permintaan');
  return {
    id: idValid(x.id), jenis: jenis,
    isi: teks(x.isi, 150, true, jenis === 'Support' ? 'Dukungan' : 'Keputusan'),
    tujuan: jenis === 'Support' ? teks(x.tujuan, 60, true, 'Ditujukan ke') : '',
    alasan: teks(x.alasan, 200, jenis === 'Decision', 'Alasan'),
    dampak: teks(x.dampak, 200, false, 'Dampak'),
    opsi: daftarTeks(x.opsi, 3, 100, 'Opsi'),
    batas: tgl(x.batas, 'Batas waktu'),
    terkait: teks(x.terkait, 80, false, 'Terkait')
  };
}

function cekHari(d, mode) {
  if (!d || typeof d !== 'object') gagal('Data tidak valid.');
  const kodeJenis = masterKegiatan().map(function (m) { return m.kode; });
  const tanggal = tgl(d.date);
  const ket = pilih(d.ket, KET_HARI, 'Keterangan hari');
  if (!Array.isArray(d.items) || d.items.length > 40) gagal('Daftar kegiatan tidak valid.');
  const items = ket === 'Kerja' ? d.items.map(function (x) { return cekKegiatan(x, kodeJenis, mode, tanggal); }) : [];
  if (ket === 'Kerja' && !items.length) gagal('Minimal satu kegiatan.');
  if (items.filter(function (i) { return i.prio; }).length > 3) gagal('Prioritas maksimal 3.');
  const jam = d.jam || {};
  const saran = (Array.isArray(d.saran) ? d.saran : []).slice(0, 10).map(function (s) {
    return { nama: teks(s.nama, 60, true, 'Blok saran'), mulai: jamValid(s.mulai), selesai: jamValid(s.selesai) };
  });
  const pendukung = (Array.isArray(d.pendukung) ? d.pendukung : []).slice(0, 30).map(function (p) {
    return { teks: teks(p.teks, 60, true, 'Pekerjaan pendukung'), pilih: !!p.pilih, cek: !!p.cek };
  });
  const permintaan = (Array.isArray(d.support) ? d.support : []).concat(Array.isArray(d.decision) ? d.decision : []);
  if (permintaan.length > 20) gagal('Permintaan terlalu banyak.');
  return {
    tanggal: tanggal, ket: ket, catatan: teks(d.catatan, 300, false, 'Catatan'),
    mode: pilih(jam.mode, ['default', 'custom'], 'Jam kerja'), mulai: jamValid(jam.mulai), selesai: jamValid(jam.selesai),
    items: items, saran: saran, pendukung: pendukung,
    permintaan: permintaan.map(cekPermintaan)
  };
}

function nomorCase(rows, kode) {
  const re = new RegExp('^MCED/' + kode + '/(\\d+)$');
  let maks = 0;
  rows.forEach(function (r) { const m = re.exec(r.case_id); if (m) maks = Math.max(maks, Number(m[1])); });
  return 'MCED/' + kode + '/' + ('00' + (maks + 1)).slice(-3);
}

function jenisOiDari(kode, sumber) {
  return { KOMP: 'Komplain', SOP: 'Temuan SOP', PROP: 'Follow Up Proposal', EVENT: 'Event' }[kode] || (sumber === 'Instruksi Atasan' ? 'Instruksi Atasan' : 'Lainnya');
}

function refDari(kode, sumber) {
  return { KOMP: 'Komplain', SOP: 'Hasil SOP', GCOM: 'Hasil GCOM', FLD: 'Hasil FLD' }[kode] || (sumber === 'Instruksi Atasan' ? 'Instruksi Atasan' : 'KPI');
}

function gantiKegiatan(id, u, v) {
  let t = baca('Kegiatan');
  hapus(t, t.rows.filter(function (r) { return r.id_agenda === id; }));
  t = baca('Kegiatan');
  tambah(t, v.items.map(function (k) {
    return {
      id: k.id, id_agenda: id, kode_akun: u.kode_akun, tanggal: v.tanggal, kode_jenis: k.jenis, judul: k.judul, store: k.store,
      jam_mulai: k.mulai, jam_selesai: k.selesai, prioritas: k.prio, label_prioritas: k.label, target_tanggal: k.target, sumber: k.sumber,
      jadi_open_item: k.oi, case_id: k.caseId, id_jadwal: k.jadwal, tak_terencana: k.tak, status: k.status, hasil: k.hasil,
      alasan: k.alasan, dipindah_ke: k.pindah, link_foto: k.foto
    };
  }));
}

function simpanPermintaan(u, v) {
  const t = baca('Permintaan');
  const ids = v.permintaan.map(function (p) { return p.id; });
  hapus(t, t.rows.filter(function (r) {
    return r.kode_akun === u.kode_akun && r.tanggal === v.tanggal && ids.indexOf(r.id) < 0 && (r.status === 'Menunggu' || !r.status);
  }));
  const t2 = baca('Permintaan');
  const baru = [];
  v.permintaan.forEach(function (p) {
    const ada = t2.rows.filter(function (r) { return r.id === p.id; })[0];
    const obj = { isi: p.isi, ditujukan_ke: p.tujuan, alasan: p.alasan, dampak: p.dampak, opsi: p.opsi, batas_waktu: p.batas, terkait: p.terkait };
    if (ada) { if (ada.kode_akun === u.kode_akun) ubah(t2, ada, obj); }
    else baru.push(Object.assign({ id: p.id, kode_akun: u.kode_akun, tanggal: v.tanggal, jenis: p.jenis, status: 'Menunggu', jawaban: '' }, obj));
  });
  tambah(t2, baru);
}

function upsert(nama, kunci, nilai, obj) {
  const t = baca(nama);
  const ada = t.rows.filter(function (r) { return r[kunci] === nilai; })[0];
  if (ada) ubah(t, ada, obj); else tambah(t, [obj]);
}

function aksiSimpanAgenda(b, u) {
  const v = cekHari(b.hari, 'agenda');
  const id = u.kode_akun + '-' + v.tanggal.replace(/-/g, '');
  const oi = baca('OpenItem');
  const caseIds = {};
  const baruOi = [];
  v.items.forEach(function (k) {
    if (!k.oi || k.caseId) return;
    const cid = nomorCase(oi.rows.concat(baruOi.map(function (x) { return { case_id: x.case_id }; })), u.kode_akun);
    k.caseId = cid;
    caseIds[k.id] = cid;
    baruOi.push({
      case_id: cid, kode_akun: u.kode_akun, jenis: jenisOiDari(k.jenis, k.sumber), deskripsi: k.judul, referensi: refDari(k.jenis, k.sumber),
      store: k.store, pic: u.nama, target: k.target || v.tanggal, status: 'Rencana', dibuat_oleh: u.nama, tanggal_dibuat: sekarang()
    });
  });
  tambah(oi, baruOi);
  if (baruOi.length) tambah(baca('OpenItemLog'), baruOi.map(function (x) { return { case_id: x.case_id, tanggal: sekarang(), oleh: u.nama, progress: 'Dibuat dari agenda', status: 'Rencana' }; }));
  gantiKegiatan(id, u, v);
  const jam = sekarang();
  upsert('Agenda', 'id_agenda', id, {
    id_agenda: id, kode_akun: u.kode_akun, tanggal: v.tanggal, keterangan_hari: v.ket, catatan: v.catatan, mode_jam: v.mode,
    jam_kerja_mulai: v.mulai, jam_kerja_selesai: v.selesai, saran: v.saran, pendukung: v.pendukung, jam_simpan: jam
  });
  simpanPermintaan(u, v);
  const mp = baca('MasterPendukung');
  const sudah = mp.rows.filter(function (r) { return !r.kode_akun || r.kode_akun === u.kode_akun; }).map(function (r) { return r.item.toLowerCase(); });
  tambah(mp, v.pendukung.filter(function (p) { return sudah.indexOf(p.teks.toLowerCase()) < 0; }).map(function (p) { return { item: p.teks, kode_akun: u.kode_akun }; }));
  return { caseIds: caseIds, jamSimpan: jam };
}

function cekPerubahanOi(x) {
  if (!x || typeof x !== 'object') gagal('Open Item tidak valid.');
  return {
    caseId: caseIdValid(x.caseId),
    progress: teks(x.progress, 150, false, 'Progress'),
    kendala: teks(x.kendala, 150, false, 'Kendala'),
    status: pilih(x.status, STATUS_OI, 'Status'),
    target: tgl(x.target, 'Target', true),
    alasanTarget: teks(x.alasanTarget, 150, false, 'Alasan ubah target'),
    pic: daftarTeks(x.pic, 5, 60, 'PIC'),
    tglTinjau: tgl(x.tglTinjau, 'Tanggal tinjau', true),
    alasanBatal: teks(x.alasanBatal, 150, false, 'Alasan batal')
  };
}

function terapkanOi(t, log, row, x, u) {
  if (!admin(u) && !oiMilik(row, u)) gagal('Open Item ' + row.case_id + ' bukan milik Anda.');
  const ubahTarget = x.target && x.target !== row.target;
  if (ubahTarget && !x.alasanTarget) gagal('Alasan ubah target wajib untuk ' + row.case_id + '.');
  if (x.status === 'Didelegasikan' && !x.pic.length) gagal('PIC baru wajib untuk ' + row.case_id + '.');
  if (x.status === 'Batal' && !x.alasanBatal) gagal('Alasan batal wajib untuk ' + row.case_id + '.');
  if (x.status === 'Ditunda' && !x.tglTinjau) gagal('Tanggal tinjau wajib untuk ' + row.case_id + '.');
  const obj = { status: x.status };
  if (ubahTarget) obj.target = x.target;
  if (x.pic.length) obj.pic = x.pic.join(', ');
  if (x.status === 'Ditunda') obj.tgl_tinjau = x.tglTinjau;
  if (x.status === 'Batal') obj.alasan_batal = x.alasanBatal;
  obj.tanggal_tutup = OI_AKHIR.indexOf(x.status) >= 0 ? (row.tanggal_tutup || hariIni()) : '';
  ubah(t, row, obj);
  log.push({ case_id: row.case_id, tanggal: sekarang(), oleh: u.nama, progress: x.progress, kendala: x.kendala, status: x.status, target_baru: ubahTarget ? x.target : '', alasan_ubah_target: ubahTarget ? x.alasanTarget : '' });
}

function aksiSimpanLaporan(b, u) {
  const v = cekHari(b.hari, 'laporan');
  const id = u.kode_akun + '-' + v.tanggal.replace(/-/g, '');
  v.items.forEach(function (k) { if (k.oi && !k.caseId) gagal('Simpan agenda dulu sebelum laporan.'); });
  gantiKegiatan(id, u, v);
  const pindah = v.items.filter(function (k) { return k.status === 'Dipindah' && k.pindah; });
  if (pindah.length) {
    const t = baca('Kegiatan');
    tambah(t, pindah.filter(function (k) { return !t.rows.some(function (r) { return r.id === k.id + 'p'; }); }).map(function (k) {
      return {
        id: (k.id + 'p').slice(0, 40), id_agenda: u.kode_akun + '-' + k.pindah.replace(/-/g, ''), kode_akun: u.kode_akun, tanggal: k.pindah,
        kode_jenis: k.jenis, judul: k.judul, store: k.store, jam_mulai: k.mulai, jam_selesai: k.selesai, sumber: 'Dipindah',
        case_id: k.caseId, jadi_open_item: k.oi, prioritas: false, tak_terencana: false
      };
    }));
  }
  const ma = baca('MasterAlasan');
  const adaAlasan = ma.rows.map(function (r) { return String(r.alasan).toLowerCase(); });
  tambah(ma, v.items.filter(function (k, i, arr) {
    return k.alasan && adaAlasan.indexOf(k.alasan.toLowerCase()) < 0 && arr.findIndex(function (y) { return y.alasan.toLowerCase() === k.alasan.toLowerCase(); }) === i;
  }).map(function (k) { return { alasan: k.alasan }; }));
  const perubahan = (Array.isArray(b.oi) ? b.oi : []).slice(0, 30).map(cekPerubahanOi);
  if (perubahan.length) {
    const t = baca('OpenItem');
    const log = [];
    perubahan.forEach(function (x) {
      const row = t.rows.filter(function (r) { return r.case_id === x.caseId; })[0];
      if (row) terapkanOi(t, log, row, x, u);
    });
    tambah(baca('OpenItemLog'), log);
  }
  const L = b.laporan || {};
  const summary = daftarTeks(L.summary, 5, 200, 'Executive summary');
  const refleksi = (Array.isArray(L.refleksi) ? L.refleksi : []).slice(0, 3).map(function (x) { return teks(x, 150, false, 'Refleksi'); });
  const jam = sekarang();
  upsert('Laporan', 'id_laporan', id, {
    id_laporan: id, id_agenda: id, kode_akun: u.kode_akun, tanggal: v.tanggal, summary: summary, refleksi: refleksi,
    pendukung_selesai: v.pendukung.filter(function (p) { return p.pilih && p.cek; }).map(function (p) { return p.teks; }), jam_simpan: jam
  });
  upsert('Agenda', 'id_agenda', id, { id_agenda: id, kode_akun: u.kode_akun, tanggal: v.tanggal, keterangan_hari: v.ket, catatan: v.catatan, mode_jam: v.mode, jam_kerja_mulai: v.mulai, jam_kerja_selesai: v.selesai, saran: v.saran, pendukung: v.pendukung });
  simpanPermintaan(u, v);
  return { jamSimpan: jam };
}

function aksiOpenItem(b, u) {
  return oiSaya(u, true).sort(function (a, c) { return String(c.tanggalDibuat).localeCompare(String(a.tanggalDibuat)); }).slice(0, 150);
}

function aksiRiwayatOpenItem(b, u) {
  const cid = caseIdValid(b.caseId);
  const row = baca('OpenItem').rows.filter(function (r) { return r.case_id === cid; })[0];
  if (!row || (!admin(u) && !oiMilik(row, u))) gagal('Open Item tidak ditemukan.');
  return baca('OpenItemLog').rows.filter(function (r) { return r.case_id === cid; }).map(function (r) {
    return { tanggal: r.tanggal, oleh: r.oleh, progress: r.progress, kendala: r.kendala, status: r.status, target: r.target_baru, alasan: r.alasan_ubah_target };
  });
}

function aksiSimpanOpenItem(b, u) {
  const x = b.item;
  if (!x || typeof x !== 'object') gagal('Open Item tidak valid.');
  const t = baca('OpenItem');
  if (x.caseId) {
    const cid = caseIdValid(x.caseId);
    const row = t.rows.filter(function (r) { return r.case_id === cid; })[0];
    if (!row) gagal('Open Item tidak ditemukan.');
    const log = [];
    terapkanOi(t, log, row, cekPerubahanOi(x), u);
    tambah(baca('OpenItemLog'), log);
    return oiKeluar(baca('OpenItem').rows.filter(function (r) { return r.case_id === cid; })[0]);
  }
  const pic = daftarTeks(x.pic, 5, 60, 'PIC');
  if (!pic.length) gagal('PIC wajib diisi.');
  const status = pilih(x.status || 'Rencana', STATUS_OI, 'Status');
  const obj = {
    case_id: nomorCase(t.rows, u.kode_akun), kode_akun: u.kode_akun,
    jenis: pilih(x.jenis, JENIS_OI, 'Jenis'),
    deskripsi: teks(x.deskripsi, 120, true, 'Deskripsi'),
    referensi: pilih(x.referensi, kolomSatu('MasterReferensi', 'referensi'), 'Referensi'),
    store: teks(x.store, 80, false, 'Store'),
    pic: pic.join(', '),
    target: tgl(x.target, 'Target selesai'),
    status: status,
    tgl_tinjau: status === 'Ditunda' ? tgl(x.tglTinjau, 'Tanggal tinjau') : '',
    alasan_batal: status === 'Batal' ? teks(x.alasanBatal, 150, true, 'Alasan batal') : '',
    dibuat_oleh: u.nama, tanggal_dibuat: sekarang(), tanggal_tutup: OI_AKHIR.indexOf(status) >= 0 ? hariIni() : ''
  };
  tambah(t, [obj]);
  tambah(baca('OpenItemLog'), [{ case_id: obj.case_id, tanggal: sekarang(), oleh: u.nama, progress: teks(x.progress, 150, false, 'Progress') || 'Dibuat', status: status }]);
  return oiKeluar(obj);
}

function aksiJadwal(b, u) {
  const hari = hariIni();
  return jadwalTerlihat(u, geserHari(hari, -7), geserHari(hari, 90));
}

function aksiSimpanJadwal(b, u) {
  const x = b.item;
  if (!x || typeof x !== 'object') gagal('Jadwal tidak valid.');
  const t = baca('Jadwal');
  if (x.id) {
    const row = t.rows.filter(function (r) { return r.id === idValid(x.id); })[0];
    if (!row || (row.kode_akun !== u.kode_akun && !admin(u))) gagal('Jadwal tidak ditemukan.');
    if (x.hapus === true) { hapus(t, [row]); return { id: row.id, hapus: true }; }
    ubah(t, row, { status: pilih(x.status, STATUS_JADWAL, 'Status') });
    return { id: row.id };
  }
  const kode = masterKegiatan().map(function (m) { return m.kode; });
  const store = teks(x.store, 80, true, 'Store');
  const toko = bacaToko().filter(function (s) { return s.nama === store; })[0];
  const obj = {
    id: 'J' + acak().slice(0, 16), kode_akun: u.kode_akun, nama: u.nama, region: toko ? toko.region : u.region,
    tanggal: tgl(x.tanggal), jam: jamValid(x.jam), kode_jenis: pilih(x.jenis, kode, 'Jenis kegiatan'), store: store,
    keterangan: teks(x.keterangan, 150, false, 'Keterangan'), status: 'Belum dikonfirmasi', dibuat: sekarang()
  };
  tambah(t, [obj]);
  return { id: obj.id };
}

function komplainUntuk(u) {
  const id = prop('REKAPIN_SPREADSHEET_ID');
  if (!id) gagal('Sumber komplain belum diatur.');
  const kunci = 'k:' + (admin(u) ? '*' : String(u.region).toLowerCase());
  const c = CacheService.getScriptCache();
  const memo = c.get(kunci);
  if (memo) return JSON.parse(memo);
  const sh = SpreadsheetApp.openById(id).getSheetByName('Komplain');
  if (!sh) gagal('Sheet Komplain tidak ditemukan.');
  const v = sh.getDataRange().getValues();
  const head = (v.shift() || []).map(function (h) { return String(h).trim().toLowerCase(); });
  const ix = function (n) { return head.indexOf(n); };
  const I = { tanggal: ix('tanggal'), store: ix('store'), regional: ix('regional'), media: ix('media'), kategori: ix('kategori'), detail: ix('detail komplain'), prioritas: ix('prioritas'), status: ix('status follow up'), pic: ix('pic follow up') };
  if (I.tanggal < 0 || I.store < 0 || I.regional < 0 || I.detail < 0) gagal('Format sheet Komplain tidak dikenali.');
  const reg = String(u.region).toLowerCase();
  const ambil = function (r, i) { return i >= 0 ? sel(r[i]) : ''; };
  const tglNorm = function (s) {
    const m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/.exec(s);
    return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : s.slice(0, 10);
  };
  const out = v.filter(function (r) { return admin(u) || ambil(r, I.regional).toLowerCase() === reg; }).map(function (r) {
    return {
      tanggal: tglNorm(ambil(r, I.tanggal)), store: ambil(r, I.store), media: ambil(r, I.media), kategori: ambil(r, I.kategori),
      detail: ambil(r, I.detail).slice(0, 300), prioritas: ambil(r, I.prioritas), status: ambil(r, I.status), pic: ambil(r, I.pic)
    };
  }).filter(function (k) { return k.detail; }).sort(function (a, b2) { return b2.tanggal.localeCompare(a.tanggal); }).slice(0, 50);
  c.put(kunci, JSON.stringify(out), 300);
  return out;
}

function aksiKomplain(b, u) {
  return komplainUntuk(u);
}

function aksiSimpanSop(b, u) {
  const x = b.data;
  if (!x || typeof x !== 'object') gagal('Data tidak valid.');
  if (!Array.isArray(x.hasil) || !x.hasil.length || x.hasil.length > 200) gagal('Hasil penilaian tidak valid.');
  const hasil = x.hasil.map(function (h) {
    return {
      bagian: teks(h.bagian, 80, true, 'Bagian'), item: teks(h.item, 200, true, 'Item'), nilai: teks(h.nilai, 10, true, 'Nilai'),
      ket: teks(h.ket, 200, false, 'Keterangan'), foto: (Array.isArray(h.foto) ? h.foto : []).slice(0, 5).map(linkValid)
    };
  });
  const poin = Number(x.poin);
  if (!isFinite(poin) || poin < 0 || poin > 100) gagal('Poin tidak valid.');
  const obj = {
    id: 'S' + acak().slice(0, 16), kode_akun: u.kode_akun, tanggal: tgl(x.tanggal), jam: jamValid(x.jam),
    jenis: pilih(x.jenis, JENIS_SOP, 'Jenis penilaian'), store: teks(x.store, 80, true, 'Store'), petugas: teks(x.petugas, 60, true, 'Nama petugas'),
    area: daftarTeks(x.area, 10, 40, 'Area').join(', '), hasil: hasil, poin: Math.round(poin * 100) / 100,
    kategori: pilih(x.kategori, KATEGORI_SOP, 'Kategori'), waktu_simpan: sekarang()
  };
  tambah(baca('HasilSOP'), [obj]);
  return { id: obj.id, jamSimpan: obj.waktu_simpan };
}

function folder(jenis, tanggal) {
  const id = prop('DRIVE_FOLDER_ID');
  if (!id) gagal('DRIVE_FOLDER_ID belum diatur.');
  const ambil = function (induk, nama) { const it = induk.getFoldersByName(nama); return it.hasNext() ? it.next() : induk.createFolder(nama); };
  return ambil(ambil(DriveApp.getFolderById(id), jenis === 'pdf' ? 'PDF' : 'Foto'), tanggal.slice(0, 7));
}

function aksiUnggah(b, u) {
  batasi('up:' + u.kode_akun, 40, 60);
  const jenis = pilih(b.jenis, ['foto', 'pdf'], 'Jenis file');
  const mime = jenis === 'pdf' ? 'application/pdf' : 'image/jpeg';
  if (typeof b.data !== 'string' || !b.data.length || b.data.length > 14000000 || !/^[A-Za-z0-9+/=]+$/.test(b.data)) gagal('File tidak valid.');
  const nama = teks(b.nama, 120, true, 'Nama file').replace(/[\\/:*?"<>|]/g, '-');
  const tanggal = tgl(b.tanggal);
  const blob = Utilities.newBlob(Utilities.base64Decode(b.data), mime, nama);
  const f = folder(jenis, tanggal).createFile(blob);
  const link = f.getUrl();
  if (jenis === 'foto') tambah(baca('Foto'), [{ id: f.getId(), tanggal: tanggal, kode_akun: u.kode_akun, terkait: teks(b.terkait, 60, false, 'Terkait'), link_drive: link }]);
  return { link: link };
}

function aksiCatatKirim(b, u) {
  const jenis = pilih(b.jenis, JENIS_KIRIM, 'Jenis dokumen');
  const tanggal = tgl(b.tanggal);
  const link = b.link ? linkValid(b.link) : '';
  const t = baca('KirimLog');
  const nomor = t.rows.filter(function (r) { return r.kode_akun === u.kode_akun && r.jenis === jenis && r.tanggal_dokumen === tanggal; }).length + 1;
  const jam = sekarang();
  tambah(t, [{ waktu: jam, kode_akun: u.kode_akun, jenis: jenis, tanggal_dokumen: tanggal, nomor_kirim: nomor, link_pdf: link }]);
  if (jenis !== 'Takbiran') {
    const id = u.kode_akun + '-' + tanggal.replace(/-/g, '');
    const nama = jenis === 'Agenda' ? 'Agenda' : 'Laporan';
    const tt = baca(nama);
    const row = tt.rows.filter(function (r) { return r[nama === 'Agenda' ? 'id_agenda' : 'id_laporan'] === id; })[0];
    if (row) ubah(tt, row, { jam_kirim_terakhir: jam, jumlah_kirim: nomor });
  }
  return { nomor: nomor, jam: jam };
}
