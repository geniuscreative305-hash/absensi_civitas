/**
 * ZettBOT Apps Script - code.gs
 * Backend Business Logic, Anti-Lag Engine, Dynamic Geofencing, & PDF Generator
 * Mendukung Dual-Mode: Google Apps Script Web App & REST API untuk Vercel
 */

function doGet(e) {
  // 1. Dukungan REST API via GET (jika ada parameter action)
  if (e && e.parameter && e.parameter.action) {
    return handleApiRequest(e.parameter.action, e.parameter);
  }

  // 2. Default: Render Web App bawaan Google Apps Script
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Absensi Dosen INN Al farabi')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * REST API Endpoint via HTTP POST untuk Frontend Vercel / Eksternal
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = {};
      }
    }
    const action = payload.action || (e && e.parameter && e.parameter.action) || '';
    return handleApiRequest(action, payload);
  } catch (err) {
    return createJsonResponse({
      success: false,
      message: 'Server Error pada doPost: ' + err.toString()
    });
  }
}

/**
 * Central API Router untuk menangani seluruh permintaan dari Vercel
 */
function handleApiRequest(action, data) {
  data = data || {};
  let result = { success: false, message: 'Aksi tidak dikenali: ' + action };

  try {
    switch (action) {
      case 'ping':
      case 'health':
        result = { success: true, message: 'API Presensi INN Al-Farabi Aktif!', timestamp: new Date().toISOString() };
        break;

      case 'loginUser':
        result = loginUser(
          data.identifier || data.id,
          data.password || data.pass,
          data.selectedRole || data.role
        );
        break;

      case 'getSystemSettings':
        result = getSystemSettings();
        break;

      case 'saveSystemSettings':
        result = saveSystemSettings(data.payload || data);
        break;

      case 'getTodayAbsensi':
        result = getTodayAbsensi(data.userId);
        break;

      case 'submitAbsen':
        result = submitAbsen(data.payload || data);
        break;

      case 'getAbsensiHistory':
        result = getAbsensiHistory(data.params || data);
        break;

      case 'updateUserProfile':
        result = updateUserProfile(data.payload || data);
        break;

      case 'generatePdfReportBase64':
        result = generatePdfReportBase64(data.params || data);
        break;

      case 'generateAndSendPdfReport':
        result = generateAndSendPdfReport(data.params || data);
        break;

      case 'getAdminUserControlData':
        result = getAdminUserControlData();
        break;

      case 'registerUser':
        result = registerUser(data.payload || data);
        break;

      case 'setupDatabase':
        result = setupDatabase();
        break;

      default:
        result = { success: false, message: 'Aksi tidak valid atau belum terdaftar: ' + action };
        break;
    }
  } catch (err) {
    result = { success: false, message: 'Gagal memproses aksi ' + action + ': ' + err.toString() };
  }

  return createJsonResponse(result);
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function parseCoordinate(val, defaultVal) {
  if (val === null || val === undefined || val === '') return defaultVal;
  // Membersihkan spasi dan mengubah koma lokal menjadi titik desimal
  let cleanStr = String(val).trim().replace(',', '.');
  let num = parseFloat(cleanStr);
  return isNaN(num) ? defaultVal : num;
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius bumi dalam meter
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getSystemSettings() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Settings');
    if (!sheet) {
      setupDatabase();
      sheet = ss.getSheetByName('Settings');
    }

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues();
    let settings = {
      lat: -7.6795781,
      lng: 108.4892786,
      radius: 200,
      isActive: true
    };

    for (let i = 0; i < data.length; i++) {
      const key = String(data[i][0]).trim().toUpperCase();
      const val = String(data[i][1]).trim();

      if (key === 'LAT') settings.lat = parseCoordinate(val, -7.6795781);
      if (key === 'LNG') settings.lng = parseCoordinate(val, 108.4892786);
      if (key === 'RADIUS') settings.radius = parseInt(val, 10) || 200;
      if (key === 'GEOFENCE_ACTIVE') settings.isActive = (val.toUpperCase() === 'TRUE');
    }

    return { success: true, settings: settings };
  } catch (err) {
    return {
      success: false,
      settings: { lat: -7.6795781, lng: 108.4892786, radius: 200, isActive: true },
      message: err.toString()
    };
  }
}

function saveSystemSettings(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Settings');
    if (!sheet) {
      setupDatabase();
      sheet = ss.getSheetByName('Settings');
    }

    // Paksa format kolom B menjadi Text Murni (@) agar desimal tidak rusak
    sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).setNumberFormat('@');

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues();
    const latVal = String(payload.lat !== undefined ? payload.lat : '-6.4024844').trim();
    const lngVal = String(payload.lng !== undefined ? payload.lng : '106.7942405').trim();
    const radiusVal = String(payload.radius || '100').trim();
    const activeVal = payload.isActive ? 'TRUE' : 'FALSE';

    const updateMap = {
      'LAT': latVal,
      'LNG': lngVal,
      'RADIUS': radiusVal,
      'GEOFENCE_ACTIVE': activeVal
    };

    for (let i = 0; i < data.length; i++) {
      const key = String(data[i][0]).trim().toUpperCase();
      if (updateMap.hasOwnProperty(key)) {
        sheet.getRange(i + 2, 2).setValue(updateMap[key]);
      }
    }

    SpreadsheetApp.flush();
    return { success: true, message: 'Pengaturan lokasi & geofencing berhasil disimpan!' };
  } catch (err) {
    return { success: false, message: 'Gagal menyimpan pengaturan: ' + err.toString() };
  }
}

function loginUser(identifier, password, selectedRole) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
    if (!sheet) return { success: false, message: 'Sheet Users belum siap. Jalankan setupDatabase().' };

    const data = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getDisplayValues();
    if (data.length <= 1) return { success: false, message: 'Pengguna tidak ditemukan.' };

    const headers = data[0];
    const idxNip = headers.indexOf('NIP') !== -1 ? headers.indexOf('NIP') : headers.indexOf('Username');
    const idxUsername = headers.indexOf('Username') !== -1 ? headers.indexOf('Username') : headers.indexOf('NIP');
    const idxEmail = headers.indexOf('Email');
    const idxPass = headers.indexOf('Password');
    const idxId = headers.indexOf('ID_User');
    const idxNama = headers.indexOf('Nama');
    const idxRole = headers.indexOf('Role');
    const idxFoto = headers.indexOf('Foto_Profil');

    const cleanInput = String(identifier || '').trim().toLowerCase();
    const inputNoSpace = cleanInput.replace(/\s+/g, '');
    const inputAlnum = cleanInput.replace(/[^a-z0-9]/g, '');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const nip = (idxNip !== -1 && row[idxNip] !== undefined && row[idxNip] !== '') ? String(row[idxNip]).trim() : '';
      const username = (idxUsername !== -1 && row[idxUsername] !== undefined && row[idxUsername] !== '') ? String(row[idxUsername]).trim() : '';
      const email = String(row[idxEmail]).trim();
      const pass = String(row[idxPass]).trim();

      const rowEmail = email.toLowerCase();
      const rowNamaRaw = String(row[idxNama] || '').trim().toLowerCase();
      const rowNamaNoSpace = rowNamaRaw.replace(/\s+/g, '');
      const rowNamaAlnum = rowNamaRaw.replace(/[^a-z0-9]/g, '');

      // Nama utama sebelum koma (contoh: "Budi Santoso, M.Pd" -> "budi santoso")
      const rowBaseNameRaw = rowNamaRaw.split(',')[0].trim();
      const rowBaseNameNoSpace = rowBaseNameRaw.replace(/\s+/g, '');
      // Nama utama dibersihkan dari gelar depan (dr, drs, dra, h, hj, ir, prof)
      const rowBaseClean = rowBaseNameRaw.replace(/\b(dr|drs|dra|h|hj|ir|prof)\b/g, '').replace(/[^a-z0-9]/g, '');

      const isUsernameMatch = (cleanInput !== '' && username.toLowerCase() === cleanInput);
      const isEmailMatch = (cleanInput !== '' && rowEmail === cleanInput);
      const isNamaDirectMatch = (inputNoSpace !== '' && (rowNamaNoSpace === inputNoSpace || rowNamaAlnum === inputAlnum));
      const isBaseNameMatch = (inputNoSpace !== '' && (rowBaseNameNoSpace === inputNoSpace || (rowBaseClean !== '' && rowBaseClean === inputAlnum)));

      const isUserMatch = isUsernameMatch || isEmailMatch || isNamaDirectMatch || isBaseNameMatch;

      if (isUserMatch && pass === String(password).trim()) {
        const userRole = String(row[idxRole]).trim();

        // Validasi kesesuaian hak akses jika dipilih
        if (selectedRole) {
          const reqRole = String(selectedRole).trim().toLowerCase();
          const curRole = userRole.toLowerCase();
          const roleMatch = (reqRole === curRole) || 
                            (reqRole === 'dosen' && curRole === 'guru') || 
                            (reqRole === 'guru' && curRole === 'dosen');
          if (!roleMatch) {
            return {
              success: false,
              message: 'Hak akses tidak cocok! Akun Anda terdaftar sebagai "' + userRole + '", bukan "' + selectedRole + '".'
            };
          }
        }

        return {
          success: true,
          user: {
            idUser: String(row[idxId]),
            nip: nip,
            username: username || nip,
            nama: String(row[idxNama]),
            email: email,
            role: userRole,
            fotoProfil: String(row[idxFoto])
          }
        };
      }
    }

    return { success: false, message: 'Username/Email atau Password salah.' };
  } catch (err) {
    return { success: false, message: 'Terjadi kesalahan server: ' + err.toString() };
  }
}

function getTodayAbsensi(userId) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Absensi');
    if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: null };

    const todayStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getDisplayValues();

    for (let i = data.length - 1; i >= 0; i--) {
      const row = data[i];
      if (String(row[1]) === String(userId) && String(row[3]) === todayStr) {
        return {
          success: true,
          data: {
            idTransaksi: String(row[0]),
            idUser: String(row[1]),
            namaGuru: String(row[2]),
            tanggal: String(row[3]),
            jamMasuk: String(row[4]),
            fotoMasuk: String(row[5]),
            jamPulang: String(row[6]),
            fotoPulang: String(row[7]),
            lokasi: String(row[8]),
            keterangan: String(row[9]),
            status: String(row[10])
          }
        };
      }
    }
    return { success: true, data: null };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function submitAbsen(payload) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Absensi');
    if (!sheet) return { success: false, message: 'Sheet Absensi tidak ditemukan.' };

    const settingsRes = getSystemSettings();
    const settings = settingsRes.settings || { lat: -7.6795781, lng: 108.4892786, radius: 200, isActive: true };

    const now = new Date();
    const todayStr = Utilities.formatDate(now, 'Asia/Jakarta', 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(now, 'Asia/Jakarta', 'HH:mm:ss');

    const cleanUserId = String(payload.userId || '').trim();
    const cleanNama = String(payload.namaGuru || '').trim();
    const cleanType = String(payload.type || '').trim().toUpperCase();
    const cleanFoto = String(payload.fotoBase64 || '').trim();
    const cleanLokasi = String(payload.lokasi || '').trim();
    const cleanKet = String(payload.keterangan || 'Hadir').trim();

    // Validasi Geofencing GPS di Backend (Hanya jika Geofencing AKTIF)
    if (settings.isActive) {
      if (cleanLokasi && cleanLokasi.includes(',')) {
        const parts = cleanLokasi.split(',');
        const userLat = parseCoordinate(parts[0], null);
        const userLng = parseCoordinate(parts[1], null);

        if (userLat !== null && userLng !== null) {
          const distance = calculateDistanceMeters(userLat, userLng, settings.lat, settings.lng);
          if (distance > settings.radius) {
            return {
              success: false,
              message: 'Gagal Absen! Anda berada ' + Math.round(distance) + 'm dari lokasi sekolah. Geofencing Aktif maks ' + settings.radius + 'm.'
            };
          }
        }
      } else {
        return { success: false, message: 'Gagal Absen! Koordinat GPS tidak terdeteksi.' };
      }
    }

    let rowIndex = -1;
    let existingRowData = null;

    if (sheet.getLastRow() > 1) {
      const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getDisplayValues();
      for (let i = 0; i < data.length; i++) {
        if (String(data[i][1]) === cleanUserId && String(data[i][3]) === todayStr) {
          rowIndex = i + 2;
          existingRowData = data[i];
          break;
        }
      }
    }

    let txId = '';
    if (cleanType === 'MASUK') {
      if (rowIndex !== -1 && existingRowData && existingRowData[4] !== '-' && existingRowData[4] !== '') {
        return { success: false, message: 'Anda sudah melakukan Absen Masuk hari ini.' };
      }

      txId = generateTransactionId();
      const newRow = [
        txId, cleanUserId, cleanNama, todayStr, timeStr, cleanFoto, '-', '-', cleanLokasi, cleanKet, 'Hadir'
      ];
      sheet.appendRow(newRow);
    } else if (cleanType === 'PULANG') {
      if (rowIndex === -1) {
        return { success: false, message: 'Anda belum melakukan Absen Masuk hari ini.' };
      }
      if (existingRowData && existingRowData[6] !== '-' && existingRowData[6] !== '') {
        return { success: false, message: 'Anda sudah melakukan Absen Pulang hari ini.' };
      }

      txId = String(existingRowData[0]);
      sheet.getRange(rowIndex, 7).setValue(timeStr);
      sheet.getRange(rowIndex, 8).setValue(cleanFoto);
      if (cleanLokasi) sheet.getRange(rowIndex, 9).setValue(cleanLokasi);
    }

    SpreadsheetApp.flush();

    return {
      success: true,
      message: 'Absen ' + cleanType + ' berhasil dicatat!',
      data: {
        idTransaksi: txId,
        jam: timeStr,
        tanggal: todayStr
      }
    };
  } catch (err) {
    return { success: false, message: 'Gagal mencatat absensi: ' + err.toString() };
  }
}

function getAbsensiHistory(params) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Absensi');
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: true, list: [], total: 0, totalPages: 0 };
    }

    const rawData = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getDisplayValues();
    let filtered = [];

    const page = parseInt(params.page || 1, 10);
    const limit = parseInt(params.limit || 10, 10);
    const userId = String(params.userId || '').trim();
    const searchName = String(params.searchName || '').toLowerCase().trim();
    const startDate = String(params.startDate || '').trim();
    const endDate = String(params.endDate || '').trim();

    for (let i = rawData.length - 1; i >= 0; i--) {
      const row = rawData[i];
      const rIdUser = String(row[1]);
      const rNamaGuru = String(row[2]).toLowerCase();
      const rTanggal = String(row[3]);

      if (userId && rIdUser !== userId) continue;
      if (searchName && rNamaGuru.indexOf(searchName) === -1) continue;
      if (startDate && rTanggal < startDate) continue;
      if (endDate && rTanggal > endDate) continue;

      filtered.push({
        idTransaksi: String(row[0]),
        idUser: rIdUser,
        namaGuru: String(row[2]),
        tanggal: String(row[3]),
        jamMasuk: String(row[4]),
        fotoMasuk: String(row[5]),
        jamPulang: String(row[6]),
        fotoPulang: String(row[7]),
        lokasi: String(row[8]),
        keterangan: String(row[9]),
        status: String(row[10])
      });
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      success: true,
      list: paginated,
      total: total,
      page: page,
      totalPages: totalPages
    };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function updateUserProfile(payload) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
    if (!sheet) return { success: false, message: 'Sheet Users tidak ditemukan.' };

    const data = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getDisplayValues();
    const userId = String(payload.userId).trim();
    
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === userId) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) return { success: false, message: 'User tidak ditemukan.' };

    if (payload.nama) sheet.getRange(rowIndex, 3).setValue(String(payload.nama));
    if (payload.email) sheet.getRange(rowIndex, 4).setValue(String(payload.email));
    if (payload.password) sheet.getRange(rowIndex, 5).setValue(String(payload.password));
    if (payload.fotoProfil) sheet.getRange(rowIndex, 7).setValue(String(payload.fotoProfil));

    SpreadsheetApp.flush();
    return { success: true, message: 'Profil berhasil diperbarui!' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function generateAndSendPdfReport(params) {
  try {
    const historyRes = getAbsensiHistory({
      page: 1,
      limit: 1000,
      searchName: params.searchName || '',
      startDate: params.startDate || '',
      endDate: params.endDate || ''
    });

    const list = historyRes.list || [];
    const reportDateStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd MMMM yyyy HH:mm');

    let rowsHtml = '';
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      rowsHtml += '<tr>' +
        '<td style="border:1px solid #e2e8f0; padding:8px; text-align:center;">' + (i + 1) + '</td>' +
        '<td style="border:1px solid #e2e8f0; padding:8px;">' + item.namaGuru + '</td>' +
        '<td style="border:1px solid #e2e8f0; padding:8px; text-align:center;">' + item.tanggal + '</td>' +
        '<td style="border:1px solid #e2e8f0; padding:8px; text-align:center; color:#059669; font-weight:bold;">' + item.jamMasuk + '</td>' +
        '<td style="border:1px solid #e2e8f0; padding:8px; text-align:center; color:#e11d48; font-weight:bold;">' + item.jamPulang + '</td>' +
        '<td style="border:1px solid #e2e8f0; padding:8px; text-align:center;">' + item.status + '</td>' +
        '</tr>';
    }

    if (list.length === 0) {
      rowsHtml = '<tr><td colspan="6" style="text-align:center; padding:15px; color:#94a3b8;">Tidak ada data absensi untuk periode ini.</td></tr>';
    }

    const htmlContent = '<html><head><style>' +
      'body { font-family: sans-serif; color: #1e293b; padding: 20px; }' +
      '.header { text-align: center; border-bottom: 2px solid #1a64f6; padding-bottom: 10px; margin-bottom: 20px; }' +
      '.header h1 { color: #1a64f6; margin: 0; font-size: 20px; }' +
      '.header p { margin: 4px 0 0; font-size: 12px; color: #64748b; }' +
      'table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }' +
      'th { background-color: #1a64f6; color: white; padding: 8px; border: 1px solid #1a64f6; }' +
      '.footer { margin-top: 30px; text-align: right; font-size: 11px; color: #64748b; }' +
      '</style></head><body>' +
      '<div class="header">' +
      '<h1>REKAPITULASI LAPORAN ABSENSI GURU</h1>' +
      '<p>Dicetak Pada: ' + reportDateStr + ' WIB | ZettBOT E-Absensi System</p>' +
      '</div>' +
      '<p><strong>Periode Laporan:</strong> ' + (params.startDate || 'Semua') + ' s/d ' + (params.endDate || 'Semua') + '</p>' +
      '<table><thead><tr><th>No</th><th>Nama Guru</th><th>Tanggal</th><th>Jam Masuk</th><th>Jam Pulang</th><th>Status</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody></table>' +
      '<div class="footer"><p>Mengetahui,<br><strong>Kepala Sekolah</strong></p><br><br><br><p>(____________________)</p></div>' +
      '</body></html>';

    const pdfBlob = Utilities.newBlob(htmlContent, 'text/html', 'Laporan_Absensi_Guru.html').getAs('application/pdf');
    pdfBlob.setName('Laporan_Absensi_Guru_' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd_HHmmss') + '.pdf');

    const pdfFile = DriveApp.createFile(pdfBlob);

    const recipientEmail = (params.recipientEmail || '').trim();
    if (recipientEmail) {
      MailApp.sendEmail({
        to: recipientEmail,
        subject: '📄 Laporan Rekapitulasi Absensi Guru - ZettBOT',
        body: 'Halo,\n\nTerlampir file Laporan Rekapitulasi Absensi Guru berbasis PDF hasil generate otomatis dari sistem ZettBOT E-Absensi.\n\nFile Link: ' + pdfFile.getUrl() + '\n\nSalam,\nZettBOT System',
        attachments: [pdfBlob]
      });
    }

    return {
      success: true,
      message: 'PDF berhasil dibuat' + (recipientEmail ? ' dan dikirim ke ' + recipientEmail : '!') + '.',
      pdfUrl: pdfFile.getUrl()
    };
  } catch (err) {
    return { success: false, message: 'Gagal membuat PDF: ' + err.toString() };
  }
}

/**
 * Ekstraksi ID berkas Google Drive dari berbagai format link URL
 */
function extractDriveFileId(url) {
  if (!url) return '';
  url = String(url).trim();
  var match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) return url;
  return '';
}

/**
 * Mengambil link logo institusi dari Sheet Config (Sel B2)
 * dan mengubahnya menjadi format https://lh3.googleusercontent.com/d/FILE_ID
 */
function getInstitutionLogoUrl() {
  const fallbackLogo = 'https://lh3.googleusercontent.com/d/1DICVH_qIiRxBiAS1wRkTBLbSJM6o5bTo';
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetConfig = ss.getSheetByName('Config');
    if (!sheetConfig) {
      return fallbackLogo;
    }
    const valB2 = sheetConfig.getRange('B2').getDisplayValue() || sheetConfig.getRange('B2').getValue();
    if (!valB2) {
      return fallbackLogo;
    }
    const fileId = extractDriveFileId(valB2);
    if (fileId) {
      return 'https://lh3.googleusercontent.com/d/' + fileId;
    }
    const trimmed = String(valB2).trim();
    return trimmed.startsWith('http') ? trimmed : fallbackLogo;
  } catch (err) {
    Logger.log('getInstitutionLogoUrl error: ' + err.toString());
    return fallbackLogo;
  }
}

function generatePdfReportBase64(params) {
  try {
    params = params || {};
    const historyRes = getAbsensiHistory({
      page: 1,
      limit: 1000,
      searchName: params.searchName || '',
      startDate: params.startDate || '',
      endDate: params.endDate || ''
    });

    const list = historyRes.list || [];
    const reportDateStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd MMMM yyyy HH:mm');
    const logoUrl = getInstitutionLogoUrl();

    let rowsHtml = '';
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      rowsHtml += '<tr>' +
        '<td style="border:1px solid #cbd5e1; padding:7px 6px; text-align:center;">' + (i + 1) + '</td>' +
        '<td style="border:1px solid #cbd5e1; padding:7px 8px; font-weight:600;">' + item.namaGuru + '</td>' +
        '<td style="border:1px solid #cbd5e1; padding:7px 6px; text-align:center;">' + item.tanggal + '</td>' +
        '<td style="border:1px solid #cbd5e1; padding:7px 6px; text-align:center; color:#059669; font-weight:bold;">' + item.jamMasuk + '</td>' +
        '<td style="border:1px solid #cbd5e1; padding:7px 6px; text-align:center; color:#e11d48; font-weight:bold;">' + item.jamPulang + '</td>' +
        '<td style="border:1px solid #cbd5e1; padding:7px 6px; text-align:center;">' + item.status + '</td>' +
        '</tr>';
    }

    if (list.length === 0) {
      rowsHtml = '<tr><td colspan="6" style="text-align:center; padding:18px; color:#94a3b8;">Tidak ada data kehadiran untuk filter yang dipilih.</td></tr>';
    }

    const totalRows = list.length;
    const countByName = {};
    for (let i = 0; i < list.length; i++) {
      const name = list[i].namaGuru || 'Tanpa Nama';
      countByName[name] = (countByName[name] || 0) + 1;
    }
    const distinctNames = Object.keys(countByName);
    const isSinglePerson = distinctNames.length === 1;

    let tableFooterHtml = '';
    let summaryTableHtml = '';

    if (totalRows > 0) {
      if (isSinglePerson) {
        tableFooterHtml = '<tr style="background-color: #f1f5f9; font-weight: bold;">' +
          '<td colspan="5" style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; color: #1e293b;">Total Kehadiran (' + distinctNames[0] + '):</td>' +
          '<td style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; color: #1a64f6; font-size: 11.5px;">' + totalRows + ' Kali</td>' +
          '</tr>';
      } else {
        tableFooterHtml = '<tr style="background-color: #f1f5f9; font-weight: bold;">' +
          '<td colspan="5" style="border: 1px solid #cbd5e1; padding: 8px 10px; text-align: right; color: #1e293b;">Total Keseluruhan Kehadiran:</td>' +
          '<td style="border: 1px solid #cbd5e1; padding: 8px 6px; text-align: center; color: #1a64f6; font-size: 11.5px;">' + totalRows + ' Kali</td>' +
          '</tr>';

        // Buat tabel ringkasan akumulasi kehadiran per nama dosen/civitas
        let summaryRows = '';
        for (let k = 0; k < distinctNames.length; k++) {
          const dName = distinctNames[k];
          const dCount = countByName[dName];
          summaryRows += '<tr>' +
            '<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">' + (k + 1) + '</td>' +
            '<td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-weight: 600;">' + dName + '</td>' +
            '<td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; color: #1a64f6; font-weight: bold;">' + dCount + ' Kali</td>' +
            '</tr>';
        }

        summaryTableHtml = '<div style="margin-top: 24px; page-break-inside: avoid;">' +
          '<h3 style="font-size: 12px; font-weight: bold; color: #0f172a; margin: 0 0 8px 0;">Rekapitulasi Akumulasi Kehadiran Per Dosen / Civitas:</h3>' +
          '<table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 10.5px;">' +
          '<thead><tr>' +
          '<th style="width: 35px; background-color: #0f172a; color: white; padding: 7px 6px; border: 1px solid #0f172a; text-align: center;">No</th>' +
          '<th style="background-color: #0f172a; color: white; padding: 7px 10px; border: 1px solid #0f172a; text-align: left;">Nama Dosen / Civitas</th>' +
          '<th style="width: 120px; background-color: #0f172a; color: white; padding: 7px 6px; border: 1px solid #0f172a; text-align: center;">Jumlah Hadir</th>' +
          '</tr></thead>' +
          '<tbody>' + summaryRows + '</tbody>' +
          '<tfoot><tr style="background-color: #f1f5f9; font-weight: bold;">' +
          '<td colspan="2" style="border: 1px solid #cbd5e1; padding: 7px 10px; text-align: right;">Total Akumulasi:</td>' +
          '<td style="border: 1px solid #cbd5e1; padding: 7px 6px; text-align: center; color: #1a64f6;">' + totalRows + ' Kali</td>' +
          '</tr></tfoot>' +
          '</table></div>';
      }
    }

    const htmlContent = '<html><head><meta charset="utf-8"><style>' +
      'body { font-family: Helvetica, Arial, sans-serif; color: #1e293b; padding: 25px; font-size: 11px; }' +
      '.header-table { width: 100%; border: none; border-collapse: collapse; margin-bottom: 18px; border-bottom: 2.5px solid #1a64f6; }' +
      '.header-table td { border: none; }' +
      '.header-logo { width: 75px; vertical-align: middle; text-align: left; padding: 0 10px 12px 0; }' +
      '.header-logo img { width: 68px; height: 68px; object-fit: contain; }' +
      '.header-text { vertical-align: middle; text-align: center; padding: 0 0 12px 0; }' +
      '.header-text h1 { color: #1a64f6; margin: 0; font-size: 16px; font-weight: bold; letter-spacing: 0.5px; }' +
      '.header-text h2 { color: #0f172a; margin: 4px 0 0; font-size: 13px; font-weight: 600; }' +
      '.header-text p { margin: 4px 0 0; font-size: 10px; color: #64748b; }' +
      '.header-spacer { width: 75px; padding: 0 0 12px 0; }' +
      '.meta-info { margin-bottom: 14px; font-size: 11px; }' +
      'table.data-table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 8px; }' +
      'table.data-table th { background-color: #1a64f6; color: white; padding: 8px 6px; border: 1px solid #1a64f6; text-align: center; font-size: 11px; font-weight: bold; }' +
      'table.data-table td { border: 1px solid #cbd5e1; }' +
      '.footer-sign { margin-top: 35px; float: right; width: 220px; text-align: center; font-size: 11px; }' +
      '</style></head><body>' +
      '<table class="header-table"><tr>' +
      '<td class="header-logo"><img src="' + logoUrl + '" referrerpolicy="no-referrer" alt="Logo INN Al-Farabi"></td>' +
      '<td class="header-text">' +
      '<h1>INSTITUT NASIONAL NUSANTARA AL FARABI</h1>' +
      '<h2>REKAPITULASI LAPORAN KEHADIRAN</h2>' +
      '<p>Dicetak Pada: ' + reportDateStr + ' WIB</p>' +
      '</td>' +
      '<td class="header-spacer"></td>' +
      '</tr></table>' +
      '<div class="meta-info">' +
      '<p><strong>Periode:</strong> ' + (params.startDate || 'Semua Tanggal') + ' s/d ' + (params.endDate || 'Semua Tanggal') + 
      (params.searchName ? ' | <strong>Nama:</strong> ' + params.searchName : '') + 
      ' | <strong>Total Hadir:</strong> ' + totalRows + ' Kali</p>' +
      '</div>' +
      '<table class="data-table"><thead><tr><th style="width:30px;">No</th><th>Nama</th><th style="width:85px;">Tanggal</th><th style="width:75px;">Masuk</th><th style="width:75px;">Pulang</th><th style="width:75px;">Status</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody>' +
      (tableFooterHtml ? '<tfoot>' + tableFooterHtml + '</tfoot>' : '') +
      '</table>' +
      summaryTableHtml +
      '<div class="footer-sign"><p>Pangandaran, ' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd MMMM yyyy') + '<br>Mengetahui,<br><strong>Rektor</strong></p><br><br><br><p>( Dr. Dasep Supriatna U, M.Pd.I.,M.Ag.,Ph.D )</p></div>' +
      '</body></html>';

    const pdfBlob = Utilities.newBlob(htmlContent, 'text/html', 'Laporan_Kehadiran.html').getAs('application/pdf');
    const filename = 'Laporan_Kehadiran_INN_AlFarabi_' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd_HHmmss') + '.pdf';
    pdfBlob.setName(filename);

    const base64Data = Utilities.base64Encode(pdfBlob.getBytes());

    return {
      success: true,
      filename: filename,
      base64: base64Data
    };
  } catch (err) {
    return { success: false, message: 'Gagal membuat file PDF: ' + err.toString() };
  }
}

function registerUser(payload) {
  return {
    success: false,
    message: 'Pendaftaran mandiri dinonaktifkan. Akun hanya dapat dibuat secara resmi oleh Administrator.'
  };
}

/**
 * Mengambil ringkasan statistik jumlah pengguna dan daftar akun terdaftar untuk kontrol Admin
 */
function getAdminUserControlData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Users');
    if (!sheet) {
      setupDatabase();
      sheet = ss.getSheetByName('Users');
    }

    const data = sheet.getDataRange().getDisplayValues();
    if (data.length <= 1) {
      return {
        success: true,
        stats: { total: 0, dosen: 0, staff: 0, pimpinan: 0, admin: 0 },
        users: []
      };
    }

    const headers = data[0];
    const idxId = headers.indexOf('ID_User') !== -1 ? headers.indexOf('ID_User') : 0;
    const idxNip = headers.indexOf('NIP') !== -1 ? headers.indexOf('NIP') : 1;
    const idxNama = headers.indexOf('Nama') !== -1 ? headers.indexOf('Nama') : 2;
    const idxEmail = headers.indexOf('Email') !== -1 ? headers.indexOf('Email') : 3;
    const idxRole = headers.indexOf('Role') !== -1 ? headers.indexOf('Role') : 5;
    const idxFoto = headers.indexOf('Foto_Profil') !== -1 ? headers.indexOf('Foto_Profil') : 6;
    const idxCreatedAt = headers.indexOf('Created_At') !== -1 ? headers.indexOf('Created_At') : 7;

    let total = 0;
    let dosen = 0;
    let staff = 0;
    let pimpinan = 0;
    let admin = 0;
    const users = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const role = String(row[idxRole] || '').trim();
      const roleLower = role.toLowerCase();

      total++;
      if (roleLower === 'dosen' || roleLower === 'guru') {
        dosen++;
      } else if (roleLower === 'staff' || roleLower === 'staf') {
        staff++;
      } else if (roleLower === 'pimpinan') {
        pimpinan++;
      } else if (roleLower === 'admin') {
        admin++;
      }

      users.push({
        idUser: String(row[idxId] || ''),
        nip: String(row[idxNip] || ''),
        nama: String(row[idxNama] || ''),
        email: String(row[idxEmail] || ''),
        role: role,
        fotoProfil: String(row[idxFoto] || ''),
        createdAt: String(row[idxCreatedAt] || '')
      });
    }

    return {
      success: true,
      stats: {
        total: total,
        dosen: dosen,
        staff: staff,
        pimpinan: pimpinan,
        admin: admin
      },
      users: users
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal memuat data pengguna: ' + err.toString()
    };
  }
}