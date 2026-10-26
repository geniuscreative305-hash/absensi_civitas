/**
 * ZettBOT Apps Script - setup.gs
 * Database Initialization & Safe Migration Protocol
 */

const DB_SHEETS = {
  USERS: 'Users',
  ABSENSI: 'Absensi',
  SETTINGS: 'Settings',
  CONFIG: 'Config'
};

const HEADERS_USERS = [
  'ID_User', 'Username', 'Nama', 'Email', 'Password', 'Role', 'Foto_Profil', 'Created_At'
];

const HEADERS_ABSENSI = [
  'ID_Transaksi', 'ID_User', 'Nama_Guru', 'Tanggal', 'Jam_Masuk', 'Foto_Masuk', 
  'Jam_Pulang', 'Foto_Pulang', 'Lokasi', 'Keterangan', 'Status'
];

const HEADERS_SETTINGS = [
  'Key', 'Value', 'Description'
];

function setupDatabase() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Safe Migrate Sheet Users
    let sheetUsers = ss.getSheetByName(DB_SHEETS.USERS);
    if (!sheetUsers) {
      sheetUsers = ss.insertSheet(DB_SHEETS.USERS);
    }
    ensureHeaders(sheetUsers, HEADERS_USERS);

    if (sheetUsers.getLastRow() <= 1) {
      const nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm:ss');
      const dummyUsers = [
        ['USR-0001', '198501012010011001', 'Admin Utama', 'admin@alfarabi.ac.id', 'admin123', 'Admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250', nowStr],
        ['USR-0002', '198008152005011003', 'Dr. H. Ahmad Fauzi, M.Ag', 'pimpinan@alfarabi.ac.id', 'pimpinan123', 'Pimpinan', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=250', nowStr],
        ['USR-0003', '199002022015022002', 'Budi Santoso, M.Pd', 'dosen@alfarabi.ac.id', 'dosen123', 'Dosen', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250', nowStr],
        ['USR-0004', '199506102020122005', 'Dewi Lestari, S.Kom', 'staff@alfarabi.ac.id', 'staff123', 'Staff', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250', nowStr]
      ];
      sheetUsers.getRange(2, 1, dummyUsers.length, HEADERS_USERS.length).setValues(dummyUsers);
    }

    // 2. Safe Migrate Sheet Absensi
    let sheetAbsensi = ss.getSheetByName(DB_SHEETS.ABSENSI);
    if (!sheetAbsensi) {
      sheetAbsensi = ss.insertSheet(DB_SHEETS.ABSENSI);
    }
    ensureHeaders(sheetAbsensi, HEADERS_ABSENSI);

    // 3. Safe Migrate Sheet Settings
    let sheetSettings = ss.getSheetByName(DB_SHEETS.SETTINGS);
    if (!sheetSettings) {
      sheetSettings = ss.insertSheet(DB_SHEETS.SETTINGS);
    }
    ensureHeaders(sheetSettings, HEADERS_SETTINGS);

    // Force Format Kolom B menjadi Teks Murni (@) agar desimal & minus tidak terpotong
    sheetSettings.getRange('B2:B20').setNumberFormat('@');

    if (sheetSettings.getLastRow() <= 1) {
      const defaultSettings = [
        ['LAT', '-7.6795781', 'Latitude Sekolah'],
        ['LNG', '108.4892786', 'Longitude Sekolah'],
        ['RADIUS', '200', 'Radius Maksimal (Meter)'],
        ['GEOFENCE_ACTIVE', 'TRUE', 'Status Geofencing (TRUE/FALSE)']
      ];
      sheetSettings.getRange(2, 1, defaultSettings.length, HEADERS_SETTINGS.length).setValues(defaultSettings);
    }

    // 4. Safe Migrate Sheet Config
    let sheetConfig = ss.getSheetByName(DB_SHEETS.CONFIG);
    if (!sheetConfig) {
      sheetConfig = ss.insertSheet(DB_SHEETS.CONFIG);
    }
    if (sheetConfig.getLastRow() === 0) {
      sheetConfig.appendRow(['Keterangan', 'URL_Photo']);
      sheetConfig.appendRow(['logo', 'https://drive.google.com/file/d/1DICVH_qIiRxBiAS1wRkTBLbSJM6o5bTo/view']);
    }

    SpreadsheetApp.flush();
    return { status: 'success', message: 'Database ZettBOT berhasil diinisialisasi secara aman.' };
  } catch (error) {
    Logger.log('Error setupDatabase: ' + error.toString());
    return { status: 'error', message: error.toString() };
  }
}

function ensureHeaders(sheet, expectedHeaders) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(expectedHeaders);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    for (let i = 0; i < expectedHeaders.length; i++) {
      if (currentHeaders[i] !== expectedHeaders[i]) {
        sheet.getRange(1, i + 1).setValue(expectedHeaders[i]);
      }
    }
  }
}

function generateTransactionId() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DB_SHEETS.ABSENSI);
  const todayStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd');
  const prefix = 'ABS-' + todayStr + '-';
  
  if (!sheet || sheet.getLastRow() <= 1) {
    return prefix + '0001';
  }

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues();
  let maxNum = 0;

  for (let i = 0; i < values.length; i++) {
    const id = values[i][0];
    if (id && id.indexOf(prefix) === 0) {
      const seqStr = id.replace(prefix, '');
      const seqNum = parseInt(seqStr, 10);
      if (!isNaN(seqNum) && seqNum > maxNum) {
        maxNum = seqNum;
      }
    }
  }

  const nextSeq = (maxNum + 1).toString().padStart(4, '0');
  return prefix + nextSeq;
}