# PRODUCT REQUIREMENT DOCUMENT (PRD) & MASTER CONTEXT
================================================================================
SISTEM PRESENSI & ABSENSI ONLINE (INN AL-FARABI)
Engine: ZettBOT Core v1.0.0 by Zettbos
================================================================================

## ZONA ATAS: SPESIFIKASI KEBUTUHAN PRODUK (BLUEPRINT AWAL)

### 1. NAMA PROJEK & PROBLEM STATEMENT
- **Nama Aplikasi:** Sistem Presensi Akademik & Dosen (INN Al-Farabi Pangandaran).
- **Problem Statement:** Memudahkan pencatatan presensi kehadiran civitas akademika (Pimpinan, Dosen, Staff, Admin) secara real-time dengan validasi geofencing GPS, selfie camera, dan rekapitulasi pelaporan instan (Direct PDF & CSV).

### 2. PERAN PENGGUNA (ROLES)
1. **Admin:** Pengelolaan sistem, monitoring seluruh data kehadiran, pengaturan titik koordinat GPS geofencing sekolah/kampus, dan ekspor laporan rekapitulasi.
2. **Pimpinan:** Monitoring kehadiran civitas, rekapitulasi data kehadiran, dan pengawasan kedisiplinan.
3. **Dosen:** Melakukan presensi masuk/pulang, pencatatan kegiatan belajar mengajar, serta riwayat kehadiran mandiri.
4. **Staff:** Melakukan presensi kehadiran kerja harian dan riwayat mandiri.

### 3. ARSITEKTUR & LINGKUNGAN KERJA
- **Platform:** Dual-Mode (Google Apps Script Web App & Vercel Static Web Hosting).
- **Frontend:** HTML5 Standalone & Modular, Tailwind CSS (via CDN), Google Fonts (Plus Jakarta Sans), Lucide Icons, Leaflet Maps, Dual-Mode API Bridge (`google.script.run` & `fetch` API).
- **Backend:** Google Apps Script (`code.gs`, `setup.gs`) dengan REST API JSON Handler (`doPost` & `doGet`) + Google Sheets sebagai database & Google Drive sebagai penyimpanan berkas.

### 4. ALUR KERJA APLIKASI (USER FLOW)
1. **Layar Login:**
   - Dark Theme modern bernuansa profesional.
   - Pilihan Hak Akses: Tombol **Admin** + Menu Dropdown (**Pimpinan**, **Dosen**, **Staff**).
   - Input identifier (Username berupa nama tanpa spasi / Email) dan Password.
2. **Dashboard Utama:**
   - Profil pengguna, status online, floating pill geofencing GPS (jarak dari kampus).
   - Tombol Absen Masuk & Pulang dengan kamera selfie (kamera web/native HP).
   - Tab Riwayat Presensi & Tab Rekapitulasi Laporan (Filter Tanggal & Nama).
3. **Cetak & Ekspor Laporan:**
   - Tombol **Cetak PDF**: 1 klik langsung unduh berkas `.pdf` resmi berkop INN Al-Farabi.
   - Tombol **CSV**: 1 klik unduh data spreadsheet.

---
## ZONA BAWAH: MASTER CONTEXT & LOGIKA SISTEM TERKINI (LIVING CONTEXT)

### 1. STATUS DATABASE GOOGLE SHEETS
- **Tab `Users`:** Kolom: `ID_User`, `Username`, `Nama`, `Email`, `Password`, `Role`, `Foto_Profil`, `Created_At`.
  - Roles valid: `Admin`, `Pimpinan`, `Dosen`, `Staff`.
- **Tab `Absensi`:** Kolom: `ID_Transaksi`, `ID_User`, `Nama_Guru`, `Tanggal`, `Jam_Masuk`, `Foto_Masuk`, `Jam_Pulang`, `Foto_Pulang`, `Lokasi`, `Keterangan`, `Status`.
- **Tab `Settings`:** Konfigurasi Geofencing (`LAT`, `LNG`, `RADIUS`, `GEOFENCE_ACTIVE`).
- **Tab `Config`:** Konfigurasi Aset & URL (`A2`: Keterangan 'logo', `B2`: URL Google Drive foto/logo institusi).

### 2. LOGIKA AUTENTIKASI & ROLE SELECTOR
- Sisi Frontend: Form input `#login-id` menerima Username (nama huruf kecil tanpa spasi) atau Email. Role aktif disimpan di `localStorage` (`zettbot_user`) dan field `#login-role`.
- Sisi Backend: Fungsi `loginUser(identifier, password, selectedRole)` mencocokkan kredensial dengan `Email` atau `Nama` (dikonversi ke huruf kecil tanpa spasi & toleran terhadap gelar akademik) di database sheet `Users`, tanpa lagi mewajibkan penginputan NIP. Serta memverifikasi password dan kesesuaian hak akses role.

### 3. LOGIKA EKSPOR LAPORAN DIRECT PDF & REKAPITULASI JUMLAH KEHADIRAN
- Sisi Backend: `generatePdfReportBase64(params)` mengambil histori filter, mengambil link logo Drive dari sheet `Config` (sel `B2`), mengekstrak File ID ke format direct CDN `https://lh3.googleusercontent.com/d/FILE_ID`, lalu merender dokumen HTML berformat kop resmi INN Al-Farabi dengan logo di samping kiri teks dan atribut `referrerpolicy="no-referrer"`.
- Perhitungan Otomatis Jumlah Kehadiran:
  * Jika difilter 1 nama: Pada baris meta info dan footer tabel dicantumkan total kehadiran spesifik dosen tersebut (`Total Kehadiran [Nama]: X Kali`).
  * Jika dicetak kolektif (semua nama): Di bawah tabel detail log tanggal, otomatis ditambahkan **Tabel Ringkasan Akumulasi Kehadiran Per Dosen / Civitas** yang merekap daftar nama dan jumlah hadir masing-masing orang.
- Sisi Frontend: `handleDirectDownloadPdf()` men-decode Base64 ke Blob binary, memicu trigger `link.click()` untuk unduh instan ke folder Download perangkat tanpa jeda modal/Drive.

### 4. KEBIJAKAN CLOSED SYSTEM & MANAJEMEN AKUN TERSENTRALISASI (ADMIN ONLY)
- Sisi Frontend: Fitur registrasi mandiri ditiadakan 100%. Tautan "Daftar Sekarang", form pendaftaran, dan struktur 3D Flip Card dihapus dari halaman login. Halaman login fokus menampilkan kartu autentikasi tunggal (*single card*) yang elegan, aman, dan berwibawa.
- Sisi Backend: Endpoint `registerUser(payload)` dinonaktifkan secara permanen untuk menolak akses luar. Penambahan dan pengelolaan akun civitas (Admin, Pimpinan, Dosen, Staff) dikelola secara tersentralisasi oleh Administrator melalui database sheet `Users` atau modul admin.

### 5. LOGIKA KONTROL & MONITORING DATA PENGGUNA (KHUSUS ADMIN)
- Sisi Frontend: Widget card `#admin-user-widget` di halaman Beranda eksklusif hanya muncul jika akun yang login berstatus `Admin`. Menyajikan metrik Total Pengguna, Dosen, Staff, dan Pimpinan. Dilengkapi tombol refresh instan dan tombol buka modal daftar akun (`#modal-admin-user-list`) lengkap dengan fitur pencarian real-time (nama, NIP, email, role).
- Sisi Backend: Fungsi `getAdminUserControlData()` membaca lembar kerja `Users` secara aman dengan perlindungan pemetaan indeks kolom, mengagregasi kuota per peran, dan mengembalikan data list pengguna aktif.

### 6. LOG PEMBARUAN RESMI
- **[2026-10-14]:**
  - Pemasangan URL resmi Google Apps Script API (`https://script.google.com/macros/s/AKfycbx38_5x5SaC1AglvGqQrXoCq5ICWfCda8fZh1CjNXGtG7pU7LhZaeTIoV58_-rxs2jh/exec`) ke dalam variabel `GAS_API_URL` pada seluruh berkas frontend (`js.html`, `index.html`, dan `dist/index.html`) sehingga aplikasi berjalan langsung dan instan tanpa memunculkan prompt/dialog URL ke pengguna akhir.
  - Implementasi arsitektur **Headless Web App** untuk dukungan online penuh di **Vercel** tanpa merusak integritas database Google Sheets & Google Drive.
  - Penambahan handler REST API `doPost(e)` dan `doGet(e)` di `code.gs` yang memproses seluruh aksi (Login, Geofencing, Presensi Masuk/Pulang, Riwayat, Rekapitulasi Laporan, Direct PDF, dan Kontrol Admin) dengan respons standar JSON (`ContentService`).
  - Implementasi **Dual-Mode API Bridge** pada `js.html`: mendeteksi otomatis lingkungan kerja (menggunakan native `google.script.run` jika dibuka di Google Apps Script, atau HTTP POST `fetch` dengan proteksi CORS bypass `Content-Type: text/plain` jika dibuka di Vercel/eksternal).
  - Penyiapan berkas `index.html` (standalone production bundle) dan folder `dist/` beserta konfigurasi `vercel.json` dan skrip build otomatis `build.ps1`, dengan tetap mempertahankan file modular `index_gas.html`, `css.html`, `modals.html`, dan `js.html`.
  - Penjagaan 100% konsistensi fitur, tema gelap berwibawa, komponen visual, dan logika validasi tanpa mengubah satupun estetika desain yang telah ada.
- **[2026-10-13]:**
  - Optimalisasi GPS Geofencing iOS Safari (iPhone) & Multi-Platform: Implementasi *Two-Tier Geolocation* (Quick Fix coarse via Wi-Fi/Cell tower + background high-accuracy satellite refinement via `watchPosition`) untuk mengatasi timeout WebKit cold-start pada iOS Safari.
  - Perbaikan koordinat default fallback ke koordinat resmi INN Al-Farabi Pangandaran (`-7.6795781, 108.4892786`) pada frontend (`js.html`) dan backend (`code.gs`, `setup.gs`), mencegah anomali jarak 234 km.
  - Fitur Tap-to-Refresh sinyal GPS pada floating pill dashboard (`#current-gps-loc`) melalui user gesture event.
  - Perapian teks subtitle profil pengguna pada header dashboard agar tidak menampilkan `- undefined`.
  - Implementasi akumulasi jumlah kehadiran otomatis pada dokumen cetak PDF: menampilkan total kehadiran pada baris footer dan meta info (jika 1 nama), serta menyertakan tabel ringkasan akumulasi kehadiran per dosen (jika cetak kolektif).
  - Implementasi logo dinamis pada kop dokumen PDF rekapitulasi kehadiran: mengambil link Google Drive dari sheet `Config` sel B2, otomatis konversi ke format LH3 CDN Google, diposisikan di sisi kiri teks kop dengan atribut `referrerpolicy="no-referrer"`.
  - Pembaruan mekanisme login: Mengganti NIP dengan **Username (nama huruf kecil tanpa spasi)** atau **Email** dari database Spreadsheet. NIP tidak lagi diwajibkan untuk autentikasi masuk sistem.
  - Penghapusan total fitur pendaftaran mandiri (*Self-Registration/Sign Up*) dan kartu formulir registrasi pada halaman login.
  - Penonaktifan endpoint `registerUser` di backend (`code.gs`) untuk menegakkan kebijakan *Closed Enterprise System* (akun hanya dapat dibuat secara resmi oleh Administrator).
- **[2026-10-26]:**
  - **Absen Luar Radius Menjadi Status Izin:** Jika civitas melakukan presensi di luar radius geofencing aktif, sistem tidak lagi memblokir presensi, melainkan otomatis mencatat dengan Status `Izin` dan mewajibkan pengisian catatan keterangan/alasan izin pada form kamera modal dan backend (`code.gs`).
  - **Pagination Menu Laporan Admin (Solusi Scroll Terlalu Panjang):** Tampilan daftar riwayat laporan admin kini dibatasi per halaman (default 10 data/halaman) dilengkapi tombol navigasi `Sebelumnya` / `Berikutnya`, nomor halaman, dan indikator total data aktif.
  - **Pratinjau (Preview) PDF Sebelum Diunduh:** Tombol cetak PDF kini membuka modal pratinjau dokumen interaktif terlebih dahulu sebelum file diunduh atau dicetak.
  - **Restrukturisasi Tata Letak PDF Laporan:** Pada dokumen PDF, Tabel Rekapitulasi Akumulasi Kehadiran Per Dosen beserta Tanda Tangan Pengesahan Rektor dipindahkan ke bagian atas (tepat di bawah kop surat), sedangkan Tabel Rincian Log Harian Periode dipindahkan ke bagian bawah sebagai Lampiran.
- **[2026-10-14]:**
  - Implementasi arsitektur dual-mode REST API `doPost(e)` dan `doGet(e)` dengan JSON ContentService untuk mendukung hosting frontend di Vercel.
  - Adaptor bridge klien `google.script.run` di `js.html` untuk memanggil Google Apps Script via HTTP fetch jika dijalankan di luar GAS.
  - Redesain Login Dark Mode bernuansa INN Al-Farabi lengkap dengan badge bundar, checklist banner, input gelap berikon, dan tombol gradien `Masuk →`.
  - Implementasi selector hak akses: Tombol **Admin** + Dropdown (**Pimpinan**, **Dosen**, **Staff**).
  - Implementasi Direct Download PDF 1-klik untuk menu Rekapitulasi Laporan.
  - Implementasi Form Registrasi Pengguna Baru dengan Animasi 3D Flip Card yang langsung tersinkron ke Sheet `Users`.
  - Pemasangan Logo Asli Resmi Institusi dari Google Drive CDN pada sisi Login dan Register.
  - Penguncian Viewport Layar HP Anti-Geser Horizontal (`overflow-x: hidden`, `touch-action: pan-y`).
  - Implementasi **Widget Kontrol & Monitoring User Terdaftar (Khusus Admin)** pada tab Beranda beserta popup modal daftar pengguna terdaftar lengkap dengan live search dan sinkronisasi real-time.
