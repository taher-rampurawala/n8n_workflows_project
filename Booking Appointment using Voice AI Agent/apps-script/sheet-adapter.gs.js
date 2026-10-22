// ---- Apps Script adapter: web app entry point, lock and sheet storage ----
// Deploy as a web app (Execute as: Me, Who has access: Anyone). Requests must carry ?key=<SECRET>,
// where SECRET is a Script Property. Only one request runs at a time (LockService), so two callers can
// never be given the same token.

// Web apps have no "active" spreadsheet (getActive() returns null), so open it by id.
const SPREADSHEET_ID = '1bhlO4EFmgqcoXCNK4GrD6BSF-7izvMM1nsk1cgjAg9E'; // "Appointment Booking"
const BOOKINGS_SHEET_ID = 1583914306; // "Bookings" tab
const HOLIDAYS_TAB = 'Holidays';
const HOLDS_TAB = 'Holds'; // created and hidden automatically
const HOLD_HEADERS = ['date', 'token', 'holdId', 'callId', 'expiresAt'];

function doPost(e) {
  try {
    const secret = PropertiesService.getScriptProperties().getProperty('SECRET');
    if (!secret || !e || !e.parameter || e.parameter.key !== secret) return json_({ ok: false, message: 'Unauthorized' });
    const req = JSON.parse((e.postData && e.postData.contents) || '{}');

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) return json_({ ok: false, message: 'System busy, please try again', system_error: 'lock timeout' });
    try {
      const now = new Date();
      const result = handleRequest(req, sheetStore_(SpreadsheetApp.openById(SPREADSHEET_ID), now), now, newId_);
      SpreadsheetApp.flush(); // make the write visible before the next caller gets the lock
      return json_(result);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, message: 'System problem, please offer a transfer', system_error: String((err && err.message) || err) });
  }
}

// Health check for the browser: confirms the deployment works without revealing anything.
function doGet() {
  return json_({ ok: true, service: 'Smile Care booking engine', version: ENGINE_VERSION });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function newId_(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Strings are written as plain text (leading apostrophe) so Sheets never turns "2026-10-22" or "19:00" into a
// date/time, and a name starting with "=" can never become a formula.
const cell_ = (v) => (v === undefined || v === null ? '' : typeof v === 'string' && v !== '' ? `'${v}` : v);

function readTable_(sheet) {
  const values = sheet.getDataRange().getDisplayValues();
  const header = (values[0] || []).map((h) => String(h).trim());
  const rows = values.slice(1).map((r, i) => {
    const obj = { row_number: i + 2 };
    header.forEach((h, j) => {
      if (h) obj[h] = r[j];
    });
    return obj;
  });
  return { header, rows };
}

function holdsSheet_(ss) {
  let sheet = ss.getSheetByName(HOLDS_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(HOLDS_TAB);
    sheet.getRange(1, 1, 1, HOLD_HEADERS.length).setValues([HOLD_HEADERS]);
    sheet.hideSheet();
  }
  return sheet;
}

function sheetStore_(ss, now) {
  const bookingsSheet = ss.getSheets().find((s) => s.getSheetId() === BOOKINGS_SHEET_ID);
  if (!bookingsSheet) throw new Error('Bookings tab not found');
  const holidaysSheet = ss.getSheetByName(HOLIDAYS_TAB);
  const holds = holdsSheet_(ss);

  // Holds from earlier days are useless; delete them (bottom-up so row numbers stay valid).
  const today = new Date(now.getTime() + DEFAULT_CONFIG.tzOffsetMinutes * 60000).toISOString().slice(0, 10);
  const holdTable = readTable_(holds);
  holdTable.rows
    .filter((r) => r.date && r.date < today)
    .map((r) => r.row_number)
    .sort((a, b) => b - a)
    .forEach((n) => holds.deleteRow(n));

  const bookingTable = readTable_(bookingsSheet);
  const header = bookingTable.header;
  const bookingRows = bookingTable.rows.filter((r) => String(r.Date || '').trim());

  return {
    bookings: () => bookingRows,
    holidays: () => (holidaysSheet ? readTable_(holidaysSheet).rows.filter((r) => String(r.Date || '').trim()) : []),
    holds: () => readTable_(holds).rows.filter((r) => r.holdId).map((r) => ({ ...r, id: r.row_number })),
    addHold: (h) => holds.appendRow(HOLD_HEADERS.map((k) => cell_(h[k]))),
    endHolds: (callId, now) => {
      const col = HOLD_HEADERS.indexOf('expiresAt') + 1;
      readTable_(holds)
        .rows.filter((r) => r.callId === callId && new Date(r.expiresAt) > now)
        .forEach((r) => holds.getRange(r.row_number, col).setValue(cell_(now.toISOString())));
    },
    addBooking: (row) => {
      const missing = Object.keys(row).filter((k) => !header.includes(k));
      if (missing.length) throw new Error(`Bookings tab is missing columns: ${missing.join(', ')}`);
      bookingsSheet.appendRow(header.map((h) => cell_(row[h])));
    },
    updateBooking: (row) => {
      const current = bookingRows.find((r) => r.BookingId === row.BookingId);
      if (!current) throw new Error(`Booking ${row.BookingId} not found`);
      Object.keys(row).forEach((k) => {
        const col = header.indexOf(k) + 1;
        if (k === 'row_number' || col < 1 || row[k] === undefined) return;
        if (String(row[k]) !== String(current[k])) bookingsSheet.getRange(current.row_number, col).setValue(cell_(row[k]));
      });
    },
  };
}
