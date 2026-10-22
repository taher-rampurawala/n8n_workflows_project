// Run: node --test "Booking Appointment using Voice AI Agent/apps-script/booking-engine.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { handleRequest } = require('./booking-engine');

// Monday 19 Oct 2026, 10:00 IST
const NOW = new Date('2026-10-19T04:30:00Z');
const later = (ms) => new Date(NOW.getTime() + ms);

// In-memory stand-in for the Bookings / Holidays / Holds tabs, with the same interface as the sheet store.
function memoryStore() {
  const s = { bookingRows: [], holidayRows: [], holdRows: [] };
  return {
    s,
    bookings: () => s.bookingRows.map((r, i) => ({ ...r, row_number: i + 2 })),
    holidays: () => s.holidayRows,
    holds: () => s.holdRows.map((r, i) => ({ ...r, id: i + 1 })),
    addBooking: (row) => s.bookingRows.push({ ...row }),
    addHold: (h) => s.holdRows.push({ ...h }),
    endHolds: (callId, now) => s.holdRows.filter((h) => h.callId === callId).forEach((h) => { h.expiresAt = now.toISOString(); }),
    updateBooking: (row) => {
      const i = s.bookingRows.findIndex((r) => r.BookingId === row.BookingId);
      if (i < 0) throw new Error(`no booking ${row.BookingId}`);
      const { row_number, ...fields } = row;
      s.bookingRows[i] = { ...s.bookingRows[i], ...fields };
    },
  };
}
let seq = 0;
const newId = (prefix) => `${prefix}-${++seq}`;
const req = (fnName, args, callId, callerNumber = '+919830012345') => ({ fnName, args, callId, callerNumber });

test('check holds the offered token; a second caller is offered the next one', () => {
  const store = memoryStore();
  const a = handleRequest(req('check_availability', { requested_date: '' }, 'call-A'), store, NOW, newId);
  const b = handleRequest(req('check_availability', { requested_date: '' }, 'call-B', '+919811111111'), store, NOW, newId);
  assert.equal(a.available, true);
  assert.equal(a.token, 1);
  assert.equal(a.caller_id_available, true);
  assert.equal(b.token, 2);
  assert.equal(store.s.holdRows.length, 2);
  assert.equal(store.s.holdRows[0].callId, 'call-A');
});

test('booking uses the call\'s own hold and writes an Active row with a BookingId', () => {
  const store = memoryStore();
  handleRequest(req('check_availability', { requested_date: '' }, 'call-A'), store, NOW, newId);
  handleRequest(req('check_availability', { requested_date: '' }, 'call-B', '+919811111111'), store, NOW, newId);
  const res = handleRequest(
    req('book_appointment', { date: '2026-10-19', patient_name: 'Ravi Kumar', age: 34, reason: 'Fillings' }, 'call-B', '+919811111111'),
    store,
    later(30000),
    newId,
  );
  assert.equal(res.booked, true);
  assert.equal(res.token, 2);
  const row = store.s.bookingRows[0];
  assert.equal(row.TokenNumber, 2);
  assert.equal(row.Status, 'Active');
  assert.match(row.BookingId, /^VB-/);
  assert.equal(row.CallId, 'call-B');
});

test('cancel frees a token and move takes it', () => {
  const store = memoryStore();
  const book = (name, callId) =>
    handleRequest(req('book_appointment', { date: '2026-10-19', patient_name: name, age: 30, reason: 'Consultation' }, callId), store, NOW, newId);
  book('Taher Rampurawala', 'c1');
  book('Saifuddin Rampurawala', 'c2');
  assert.deepEqual(handleRequest(req('find_booking', {}, 'c3'), store, NOW, newId).bookings.map((b) => b.token), [1, 2]);
  assert.equal(handleRequest(req('cancel_booking', { token: 1 }, 'c3'), store, NOW, newId).cancelled, true);
  const moved = handleRequest(req('move_booking', { token: 2 }, 'c3'), store, NOW, newId);
  assert.deepEqual(moved, { ok: true, moved: true, old_token: 2, token: 1, patient_name: 'Saifuddin Rampurawala', time_spoken: 'seven PM' });
  assert.equal(store.s.bookingRows[1].Time, '19:00');
});

test('validation errors and unknown functions come back as ok:false', () => {
  const store = memoryStore();
  assert.deepEqual(handleRequest(req('book_appointment', { date: '2026-10-19', patient_name: 'R', age: 30, reason: 'Consultation' }, 'c'), store, NOW, newId), {
    ok: false,
    message: 'Invalid name',
  });
  assert.deepEqual(handleRequest(req('reschedule_everything', {}, 'c'), store, NOW, newId), { ok: false, message: 'Unknown function' });
  assert.equal(store.s.bookingRows.length, 0);
});

test('a hold ends when its call books, so a later cancel really frees the token', () => {
  const store = memoryStore();
  handleRequest(req('check_availability', { requested_date: '' }, 'call-A'), store, NOW, newId); // holds token 1
  handleRequest(req('book_appointment', { date: '2026-10-19', patient_name: 'Asha', age: 30, reason: 'Consultation' }, 'call-A'), store, NOW, newId);
  handleRequest(req('cancel_booking', { token: 1 }, 'call-A'), store, NOW, newId);
  const other = handleRequest(req('check_availability', { requested_date: '' }, 'call-B', '+919811111111'), store, later(10000), newId);
  assert.equal(other.token, 1); // not blocked by call-A's used hold
});

test('the Channel column records which agent booked; unknown labels fall back to Voice', () => {
  const store = memoryStore();
  const book = (channel, name) =>
    handleRequest({ ...req('book_appointment', { date: '2026-10-19', patient_name: name, age: 30, reason: 'Consultation' }, `c-${name}`), channel }, store, NOW, newId);
  book('Telnyx Voice', 'Asha');
  book(undefined, 'Ravi');
  book('=HACKED', 'Meera');
  assert.deepEqual(store.s.bookingRows.map((r) => r.Channel), ['Telnyx Voice', 'Voice', 'Voice']);
});
