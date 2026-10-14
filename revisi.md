# LOG REVISI SISTEM
================================================================================
STATUS: SUDAH SELESAI DITERAPKAN (MERGED TO MASTER CONTEXT prd.md)
TERAKHIR DIUPDATE: 2026-10-14
================================================================================

## RINGKASAN REVISI YANG TELAH BERHASIL DITERAPKAN:
1. **Dukungan REST API Backend Dual-Mode (`code.gs`):**
   - Menambahkan fungsi handler `doPost(e)` dan `doGet(e)` dengan output JSON (`ContentService`) untuk merespons permintaan dari Vercel via HTTP request.
   - Mengintegrasikan router tindakan: `loginUser`, `getSystemSettings`, `saveSystemSettings`, `getTodayAbsensi`, `submitAbsen`, `getAbsensiHistory`, `updateUserProfile`, `generatePdfReportBase64`, `generateAndSendPdfReport`, `getAdminUserControlData`, dan `registerUser`.
   - Menjaga 100% kompatibilitas backward agar Google Apps Script tetap bisa dibuka sebagai Web App internal.

2. **Dual-Mode API Bridge Klien Frontend (`js.html`):**
   - Mengimplementasikan polyfill adaptor otomatis untuk `google.script.run` ketika dijalankan di luar ekosistem Apps Script (seperti di Vercel).
   - Menghubungkan seluruh panggilan fungsi frontend ke Google Apps Script Web App melalui HTTP POST `fetch` dengan proteksi bypass CORS (`Content-Type: text/plain`).
   - Mendukung konfigurasi URL API fleksibel melalui variabel `GAS_API_URL`, parameter URL `?api=...`, maupun `localStorage`.

3. **Penyediaan Berkas Standalone & Konfigurasi Deployment Vercel:**
   - Menyediakan berkas `index.html` (standalone production bundle) dan `dist/index.html` yang bersih dari scriptlet Google Apps Script (`<?!= include(...) ?>`) sehingga dapat langsung diproses oleh browser dan platform Vercel.
   - Menjaga berkas modular `index_gas.html`, `css.html`, `modals.html`, dan `js.html` tetap utuh bagi kebutuhan pengeditan modular di Apps Script.
   - Menambahkan berkas konfigurasi `vercel.json` dan skrip otomasi sinkronisasi `build.ps1`.

4. **Integritas Desain & Fitur Terjaga 100%:**
   - Tidak ada satupun fitur, warna, komponen visual, logika autentikasi, aturan GPS geofencing, atau alur pengguna yang diubah di luar kebutuhan teknis online di Vercel.

---
*File revisi.md ini telah dibersihkan dan siap digunakan kembali untuk menampung draf revisi berikutnya.*
