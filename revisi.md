# LOG REVISI SISTEM
================================================================================
STATUS: SUDAH SELESAI DITERAPKAN (MERGED TO MASTER CONTEXT prd.md)
TERAKHIR DIUPDATE: 2026-10-26
================================================================================

## RINGKASAN REVISI YANG TELAH BERHASIL DITERAPKAN:

### 1. Absen Selfie di Luar Radius Menjadi Status "Izin" + Wajib Catatan Alasan:
- **Di Sisi Frontend (`modals.html`, `js.html`, `index.html`):**
  - Kamera modal otomatis mendeteksi posisi GPS pengguna. Jika berada di luar radius yang ditetapkan admin (dan geofencing aktif), muncul wadah peringatan berwarna amber dengan status: `Di luar radius (...m / maks ...m). Status: IZIN`.
  - Disediakan area teks input: `Catatan Keterangan / Alasan Izin` yang wajib diisi.
  - Validasi ketat diterapkan saat proses submit: jika civitas berada di luar radius dan tidak mengisi alasan izin, sistem menampilkan notifikasi peringatan dan memfokuskan kursor ke kolom alasan.
- **Di Sisi Backend (`code.gs`):**
  - Fungsi `submitAbsen()` tidak lagi menggagalkan atau me-reject presensi saat jarak melebihi batas radius.
  - Presensi dicatat dengan Status: `Izin`, dan keterangan diisi dengan alasan yang diberikan pengguna. Jika alasan kosong saat di luar radius, backend menolak penyimpanan untuk menjaga integritas data.

### 2. Tampilan Menu Laporan Admin dengan Sistem Pagination:
- **Solusi Scroll Terlalu Panjang (`index_gas.html`, `index.html`, `js.html`):**
  - Menerapkan pagination bersih dan responsif (10 data per halaman secara default).
  - Menampilkan badge total data yang terfilter (`X Data`).
  - Menyediakan tombol navigasi `Sebelumnya` dan `Berikutnya`, nomor halaman aktif (`1 / N`), serta rincian teks keterbacaan data (`Menampilkan 1-10 dari X data`).
  - Setiap baris riwayat kini menampilkan badge status (`Hadir` dengan hijau lembut, `Izin` dengan amber berkelas) serta keterangan alasan jika ada.

### 3. Fitur Print Laporan: Pratinjau (Preview) & Penukaran Tata Letak Dokumen:
- **Pratinjau Sebelum Unduh (`modals.html`, `js.html`, `index.html`):**
  - Klik tombol `Cetak PDF` kini membuka modal interaktif `Pratinjau Laporan Kehadiran` terlebih dahulu (tidak langsung mendownload secara otomatis).
  - Admin dapat memeriksa dokumen di layar, dan memiliki tombol aksi: `Cetak Langsung` (membuka dialog print browser) serta `Unduh PDF`.
- **Penukaran Tata Letak Dokumen PDF (`code.gs`):**
  - **Bagian Atas (di bawah Kop Surat):** Menampilkan **Tabel Rekapitulasi Akumulasi Kehadiran Per Dosen / Civitas** (No, Nama Dosen/Civitas, Jumlah Hadir, Total Akumulasi) dan langsung diikuti **Tanda Tangan Pengesahan Rektor** (Dr. Dasep Supriatna U, M.Pd.I.,M.Ag.,Ph.D).
  - **Bagian Bawah (Lampiran):** Menampilkan judul **LAMPIRAN: RINCIAN LOG KEHADIRAN PERIODE** dan **Tabel Log Harian** lengkap dengan kolom No, Nama, Tanggal, Jam Masuk, Jam Pulang, dan Status.

### 4. Sinkronisasi Bundle Build (`build.ps1`):
- Berkas `index.html` dan `dist/index.html` telah dibuild ulang dan tersinkronisasi 100% untuk deployment Web App Google Apps Script maupun Vercel.
