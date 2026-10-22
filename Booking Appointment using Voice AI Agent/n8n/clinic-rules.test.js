// Run: node --test "Booking Appointment using Voice AI Agent/n8n/clinic-rules.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  checkAvailability,
  validateBookingArgs,
  decideBooking,
  resolveToken,
  findBookings,
  planCancel,
  planMove,
  moveClashes,
  newHold,
  resolveHold,
  normalizeRequest,
  callerIdInfo,
} = require('./clinic-rules');

// Clinic times are IST (UTC+5:30). 19 Oct 2026 is a Monday.
const ist = (date, hhmm) => new Date(`${date}T${hhmm}:00+05:30`);
const MON_10AM = ist('2026-10-19', '10:00');

const row = (Date, TokenNumber, WhatsAppNumber = '919800000000', PatientName = 'Some Patient') => ({ Date, TokenNumber, WhatsAppNumber, PatientName });
const check = (requested_date, { bookings = [], holidays = [], now = MON_10AM } = {}) =>
  checkAvailability({ bookings, holidays, args: { requested_date }, now });

// ---------------------------------------------------------------- checkAvailability: same day only, 9 AM – 5 PM

test('today after 9 AM offers the next token, counting only today', () => {
  const bookings = [row('2026-10-19', 1), row('2026-10-19', 2), row('2026-10-20', 1)];
  assert.deepEqual(check('2026-10-19', { bookings }), {
    ok: true,
    available: true,
    date: '2026-10-19',
    date_spoken: 'Monday, the 19th of October',
    token: 3,
    time_spoken: 'seven thirty PM',
    slots_left: 3,
  });
});

test('empty requested_date means today', () => {
  const res = check('');
  assert.equal(res.available, true);
  assert.equal(res.date, '2026-10-19');
});

test('tomorrow is not bookable: call tomorrow after 9 AM', () => {
  assert.deepEqual(check('2026-10-20'), {
    ok: true,
    available: false,
    reason: 'not_today',
    requested_date_spoken: 'Tuesday, the 20th of October',
    call_back_spoken: 'tomorrow after nine AM',
  });
});

test('a later day: call on that day after 9 AM', () => {
  const res = check('2026-10-22');
  assert.equal(res.reason, 'not_today');
  assert.equal(res.call_back_spoken, 'on Thursday, the 22nd of October, after nine AM');
});

test('before 9 AM: call today after 9 AM', () => {
  const res = check('2026-10-19', { now: ist('2026-10-19', '08:59') });
  assert.equal(res.reason, 'before_opening');
  assert.equal(res.call_back_spoken, 'today after nine AM');
});

test('at 5 PM or later: past cutoff, call tomorrow after 9 AM', () => {
  const res = check('2026-10-19', { now: ist('2026-10-19', '17:00') });
  assert.equal(res.reason, 'past_cutoff');
  assert.equal(res.call_back_spoken, 'tomorrow after nine AM');
  assert.equal(check('2026-10-19', { now: ist('2026-10-19', '16:59') }).available, true);
});

test('today full: call the next open day after 9 AM, skipping Sunday', () => {
  const bookings = [1, 2, 3, 4, 5].map((t) => row('2026-10-24', t));
  const res = check('2026-10-24', { bookings, now: ist('2026-10-24', '10:00') }); // Saturday
  assert.equal(res.reason, 'full');
  assert.equal(res.call_back_spoken, 'on Monday, the 26th of October, after nine AM');
});

test('Sunday and holidays are closed: call the next open day after 9 AM', () => {
  const sunday = check('2026-10-25', { now: ist('2026-10-25', '10:00') });
  assert.equal(sunday.reason, 'closed');
  assert.equal(sunday.call_back_spoken, 'tomorrow after nine AM');

  const holidays = [{ Date: '2026-10-19', Note: 'Clinic holiday' }, { Date: '2026-10-20', Note: 'Clinic holiday' }];
  const holiday = check('2026-10-19', { holidays });
  assert.equal(holiday.reason, 'closed');
  assert.equal(holiday.call_back_spoken, 'on Wednesday, the 21st of October, after nine AM');
});

test('past and unparseable dates are refused without a call-back day', () => {
  assert.deepEqual(check('2026-10-18'), {
    ok: true,
    available: false,
    reason: 'past_date',
    requested_date_spoken: 'Sunday, the 18th of October',
    call_back_spoken: null,
  });
  for (const requested_date of ['next tuesday', '2026-02-30', '2026-13-01']) {
    const res = check(requested_date);
    assert.equal(res.reason, 'invalid_date', requested_date);
    assert.equal(res.requested_date_spoken, null, requested_date);
  }
});

// ---------------------------------------------------------------- validateBookingArgs

test('valid booking args are normalized, phone defaults to caller ID', () => {
  const res = validateBookingArgs(
    { date: '2026-10-20', patient_name: '  Ravi Kumar ', age: '34', reason: 'fillings' },
    '+91 98300 12345',
  );
  assert.deepEqual(res, {
    ok: true,
    value: { date: '2026-10-20', patientName: 'Ravi Kumar', age: 34, reason: 'Fillings', phone: '9830012345' },
  });
});

test('Other reason keeps the short description', () => {
  const res = validateBookingArgs(
    { date: '2026-10-20', patient_name: 'Asha', age: 60, reason: 'Other', reason_detail: 'loose denture', phone: '098300 99999' },
    '+919830012345',
  );
  assert.equal(res.value.reason, 'Other: loose denture');
  assert.equal(res.value.phone, '9830099999');
});

test('invalid booking args are rejected with a speakable message', () => {
  const good = { date: '2026-10-20', patient_name: 'Ravi', age: 34, reason: 'Consultation' };
  const cases = [
    [{ ...good, date: '20/10/2026' }, 'Invalid date'],
    [{ ...good, patient_name: ' R ' }, 'Invalid name'],
    [{ ...good, age: 0 }, 'Invalid age'],
    [{ ...good, age: 121 }, 'Invalid age'],
    [{ ...good, age: 'thirty' }, 'Invalid age'],
    [{ ...good, reason: 'Braces' }, 'Invalid reason'],
    [{ ...good, reason: 'Other', reason_detail: '' }, 'Please describe the reason'],
  ];
  for (const [args, message] of cases) {
    assert.deepEqual(validateBookingArgs(args, '+919830012345'), { ok: false, message }, JSON.stringify(args));
  }
  assert.deepEqual(validateBookingArgs(good, ''), { ok: false, message: 'Invalid phone number: need 10 digits, got 0' });
  assert.deepEqual(validateBookingArgs({ ...good, phone: '9 1 6 3 4 9 5 0 6' }, ''), { ok: false, message: 'Invalid phone number: need 10 digits, got 9' });
  assert.equal(validateBookingArgs({ ...good, phone: '9 1 6 3 4 9 5 0 6 8' }, '').value.phone, '9163495068');
  // An extra digit must not be silently dropped (it would save someone else's number).
  assert.deepEqual(validateBookingArgs({ ...good, phone: '9 1 6 3 4 9 5 0 6 8 8' }, ''), { ok: false, message: 'Invalid phone number: need 10 digits, got 11' });
});

// ---------------------------------------------------------------- decideBooking

const RAVI = { date: '2026-10-19', patientName: 'Ravi Kumar', age: 34, reason: 'Fillings', phone: '9830012345' };
const decide = (bookings, extra = {}) =>
  decideBooking({ bookings, holidays: [], booking: RAVI, callId: 'call_abc', bookingId: 'VB-1', now: MON_10AM, ...extra });

test('booking takes the lowest free token and echoes the saved name and number for read-back', () => {
  const bookings = [row('2026-10-19', 1), row('2026-10-19', 2), row('2026-10-18', 1, '919830012345', 'Ravi Kumar')];
  assert.deepEqual(decide(bookings), {
    canBook: true,
    row: {
      Date: '2026-10-19',
      Time: '19:30',
      TokenNumber: 3,
      PatientName: 'Ravi Kumar',
      Age: 34,
      Reason: 'Fillings',
      WhatsAppNumber: '919830012345',
      BookedAt: '2026-10-19T04:30:00.000Z',
      Channel: 'Voice',
      CallId: 'call_abc',
      Status: 'Active',
      BookingId: 'VB-1',
    },
    response: {
      ok: true,
      booked: true,
      token: 3,
      date_spoken: 'Monday, the 19th of October',
      time_spoken: 'seven thirty PM',
      reason: 'Fillings',
      patient_name: 'Ravi Kumar',
      phone_spoken: 'nine eight three - zero zero one - two three four five',
    },
  });
});

test('same patient name and same phone today returns the existing booking', () => {
  const bookings = [row('2026-10-19', 1), row('2026-10-19', 2, '+91 98300-12345', '  ravi   KUMAR ')];
  assert.deepEqual(decide(bookings), {
    canBook: false,
    response: {
      ok: true,
      booked: false,
      reason: 'already_booked',
      token: 2,
      patient_name: '  ravi   KUMAR ',
      date_spoken: 'Monday, the 19th of October',
      time_spoken: 'seven fifteen PM',
    },
  });
});

test('one phone can book different family members; a different phone can book the same name', () => {
  const sibling = [row('2026-10-19', 1, '919830012345', 'Asha Kumar')];
  assert.equal(decide(sibling).canBook, true);
  const otherFamily = [row('2026-10-19', 1, '919811111111', 'Ravi Kumar')];
  assert.equal(decide(otherFamily).canBook, true);
});

test('cancelled bookings free their token and do not count towards full', () => {
  const bookings = [row('2026-10-19', 1), { ...row('2026-10-19', 2), Status: 'Cancelled' }, row('2026-10-19', 3)];
  const res = decide(bookings);
  assert.equal(res.row.TokenNumber, 2);
  assert.equal(res.row.Time, '19:15');

  const fiveWithOneCancelled = [1, 2, 3, 4, 5].map((t) => ({ ...row('2026-10-19', t), Status: t === 4 ? 'cancelled' : '' }));
  assert.equal(decide(fiveWithOneCancelled).row.TokenNumber, 4);
  // A cancelled booking of the same patient does not block re-booking.
  assert.equal(decide([{ ...row('2026-10-19', 1, '919830012345', 'Ravi Kumar'), Status: 'Cancelled' }]).canBook, true);
});

test('anything but an open slot today is refused with a call-back day', () => {
  const full = [1, 2, 3, 4, 5].map((t) => row('2026-10-19', t));
  const cases = [
    [{ bookings: full }, 'full', 'tomorrow after nine AM'],
    [{ bookings: [], booking: { ...RAVI, date: '2026-10-20' } }, 'not_today', 'tomorrow after nine AM'],
    [{ bookings: [], now: ist('2026-10-19', '18:00') }, 'past_cutoff', 'tomorrow after nine AM'],
    [{ bookings: [], now: ist('2026-10-19', '08:00') }, 'before_opening', 'today after nine AM'],
  ];
  for (const [input, reason, callBack] of cases) {
    const res = decide(input.bookings, input);
    assert.equal(res.canBook, false, reason);
    assert.equal(res.row, undefined, reason);
    assert.deepEqual(res.response, { ok: true, booked: false, reason, call_back_spoken: callBack });
  }
});

// ---------------------------------------------------------------- resolveToken (two callers booking at the same moment)

// A fresh read after our append: row_number is the sheet order, so it tells who saved first.
const saved = (row_number, TokenNumber, BookingId, extra = {}) => ({
  row_number,
  ...row('2026-10-19', TokenNumber, '919830012345', `Patient ${BookingId}`),
  Time: '',
  BookingId,
  Status: 'Active',
  ...extra,
});
const resolve = (bookings, bookingId) => resolveToken({ bookings, holidays: [], bookingId, now: MON_10AM });

test('no clash: the booking keeps its token and nothing needs updating', () => {
  const res = resolve([saved(2, 1, 'A'), saved(3, 2, 'B')], 'B');
  assert.equal(res.changed, false);
  assert.equal(res.response.booked, true);
  assert.equal(res.response.token, 2);
  assert.equal(res.response.patient_name, 'Patient B');
});

test('clash: whoever saved first keeps the token, the later one moves to the next free token', () => {
  const rows = [saved(2, 1, 'A'), saved(3, 2, 'B'), saved(4, 2, 'C')];
  assert.equal(resolve(rows, 'B').changed, false);
  const later = resolve(rows, 'C');
  assert.equal(later.changed, true);
  assert.equal(later.row.TokenNumber, 3);
  assert.equal(later.row.Time, '19:30');
  assert.equal(later.row.row_number, undefined);
  assert.equal(later.response.token, 3);
  assert.equal(later.response.time_spoken, 'seven thirty PM');
});

test('clash with no free token left: the later booking is cancelled and told today is full', () => {
  const rows = [1, 2, 3, 4, 5].map((t, i) => saved(i + 2, t, `P${t}`)).concat(saved(7, 5, 'LATE'));
  const res = resolve(rows, 'LATE');
  assert.equal(res.changed, true);
  assert.equal(res.row.Status, 'Cancelled');
  assert.deepEqual(res.response, { ok: true, booked: false, reason: 'full', call_back_spoken: 'tomorrow after nine AM' });
});

test('cancelled rows are ignored when resolving', () => {
  const rows = [saved(2, 1, 'A', { Status: 'Cancelled' }), saved(3, 1, 'B')];
  assert.equal(resolve(rows, 'B').changed, false);
});

// ---------------------------------------------------------------- findBookings / planCancel

test("find returns today's active bookings on the caller's phone", () => {
  const bookings = [
    row('2026-10-19', 1, '919830012345', 'Ravi Kumar'),
    row('2026-10-19', 2, '919830012345', 'Asha Kumar'),
    { ...row('2026-10-19', 3, '919830012345', 'Old Booking'), Status: 'Cancelled' },
    row('2026-10-19', 4, '919811111111', 'Someone Else'),
    row('2026-10-18', 1, '919830012345', 'Yesterday'),
  ];
  assert.deepEqual(findBookings({ bookings, phone: '+91 98300 12345', now: MON_10AM }), {
    ok: true,
    bookings: [
      { token: 1, patient_name: 'Ravi Kumar', time_spoken: 'seven PM' },
      { token: 2, patient_name: 'Asha Kumar', time_spoken: 'seven fifteen PM' },
    ],
  });
  assert.deepEqual(findBookings({ bookings, phone: '12345', now: MON_10AM }), { ok: false, message: 'Invalid phone number: need 10 digits, got 5' });
});

test('cancel marks the matching booking cancelled; only the same phone can cancel it', () => {
  const ravi = { row_number: 5, ...row('2026-10-19', 2, '919830012345', 'Ravi Kumar'), Time: '19:15', BookingId: 'VB-9', Status: 'Active' };
  const bookings = [row('2026-10-19', 1), ravi];
  const res = planCancel({ bookings, token: 2, phone: '9830012345', now: MON_10AM });
  assert.equal(res.canCancel, true);
  assert.deepEqual(res.row, { ...ravi, row_number: undefined, Status: 'Cancelled' });
  assert.deepEqual(res.response, { ok: true, cancelled: true, token: 2, patient_name: 'Ravi Kumar', time_spoken: 'seven fifteen PM' });

  const wrongPhone = planCancel({ bookings, token: 2, phone: '9811111111', now: MON_10AM });
  assert.deepEqual(wrongPhone, { canCancel: false, response: { ok: true, cancelled: false, reason: 'not_found' } });
});

test('a booking without a BookingId (e.g. made on WhatsApp) is handed to reception', () => {
  const bookings = [row('2026-10-19', 1, '919830012345', 'Ravi Kumar')];
  assert.deepEqual(planCancel({ bookings, token: 1, phone: '9830012345', now: MON_10AM }), {
    canCancel: false,
    response: { ok: true, cancelled: false, reason: 'needs_reception' },
  });
});

// ---------------------------------------------------------------- normalizeRequest

test('Retell function-call body is normalized for routing', () => {
  const body = {
    name: 'check_availability',
    args: { requested_date: '2026-10-20' },
    call: { call_id: 'call_abc', call_type: 'phone_call', from_number: '+919830012345', to_number: '+14155550100' },
  };
  assert.deepEqual(normalizeRequest(body), {
    fnName: 'check_availability',
    args: { requested_date: '2026-10-20' },
    callId: 'call_abc',
    callerNumber: '+919830012345',
  });
});

test('web calls and malformed bodies normalize to safe empty values', () => {
  assert.deepEqual(normalizeRequest({ name: 'book_appointment', args: '{"age":30}', call: { call_id: 'web_1', call_type: 'web_call' } }), {
    fnName: 'book_appointment',
    args: { age: 30 },
    callId: 'web_1',
    callerNumber: '',
  });
  assert.deepEqual(normalizeRequest(undefined), { fnName: '', args: {}, callId: '', callerNumber: '' });
  assert.deepEqual(normalizeRequest({ name: 'x', args: 'not json' }).args, {});
});

// ---------------------------------------------------------------- caller ID and spelled names

test('caller ID info tells the agent whether a number is on file, with its last four digits spoken', () => {
  assert.deepEqual(callerIdInfo('+919830012345'), { caller_id_available: true, caller_id_last4_spoken: 'two three four five' });
  for (const missing of ['', undefined, 'anonymous', '+1234']) {
    assert.deepEqual(callerIdInfo(missing), { caller_id_available: false, caller_id_last4_spoken: null }, String(missing));
  }
});

test('a name sent as spelled letters is joined into words', () => {
  const args = { date: '2026-10-19', age: 6, reason: 'Gum treatment', phone: '9748785540' };
  const spelled = validateBookingArgs({ ...args, patient_name: 'S-A-I-F-U-D-D-I-N R-A-M-P-U-R-A-W-A-L-A' }, '');
  assert.equal(spelled.value.patientName, 'Saifuddin Rampurawala');
  const spaced = validateBookingArgs({ ...args, patient_name: 's - a - i  r - a - m' }, '');
  assert.equal(spaced.value.patientName, 'Sai Ram');
  // Ordinary names and initials are left alone.
  assert.equal(validateBookingArgs({ ...args, patient_name: 'A. K. Sharma' }, '').value.patientName, 'A. K. Sharma');
  assert.equal(validateBookingArgs({ ...args, patient_name: 'Mary-Jane Fernandes' }, '').value.patientName, 'Mary-Jane Fernandes');
});

test('a name sent as spaced single letters is rejected so the agent resends it as words', () => {
  const args = { date: '2026-10-19', age: 6, reason: 'Gum treatment', phone: '9748785540' };
  const res = validateBookingArgs({ ...args, patient_name: 'S A I F U D D I N R A M P U R A W A L A' }, '');
  assert.deepEqual(res, { ok: false, message: 'Name sent as letters: call book_appointment again with patient_name written as words, e.g. "Saifuddin Rampurawala". Do not ask the caller again.' });
  // Up to two initials are a normal name.
  assert.equal(validateBookingArgs({ ...args, patient_name: 'A K Sharma' }, '').value.patientName, 'A K Sharma');
});

test('a booking overwritten by a simultaneous save asks the agent to book again', () => {
  // Two simultaneous Sheets appends can land on the same row; the overwritten booking is then missing.
  const res = resolve([saved(2, 1, 'A'), saved(3, 2, 'B')], 'LOST');
  assert.deepEqual(res, {
    changed: false,
    lost: true,
    response: { ok: false, message: 'Booking did not save because another caller booked at the same moment: call book_appointment again.' },
  });
});

// ---------------------------------------------------------------- slot holds (2 minutes while the caller gives details)

const hold = (id, token, callId, minutesLeft = 1) => ({
  id,
  date: '2026-10-19',
  token,
  holdId: `H${id}`,
  callId,
  expiresAt: new Date(MON_10AM.getTime() + minutesLeft * 60000).toISOString(),
});

test('another caller\'s active hold is skipped; own and expired holds are not', () => {
  const holds = [hold(1, 1, 'other'), hold(2, 2, 'me'), hold(3, 3, 'old', -1)];
  const res = checkAvailability({ bookings: [], holidays: [], holds, callId: 'me', args: { requested_date: '' }, now: MON_10AM });
  assert.equal(res.token, 2);
  assert.equal(res.slots_left, 4);
});

test('when every free token is held by other callers, ask to call back in a couple of minutes', () => {
  const bookings = [1, 2, 3].map((t) => row('2026-10-19', t));
  const holds = [hold(1, 4, 'x'), hold(2, 5, 'y')];
  const res = checkAvailability({ bookings, holidays: [], holds, callId: 'me', args: { requested_date: '' }, now: MON_10AM });
  assert.deepEqual(res, {
    ok: true,
    available: false,
    reason: 'all_held',
    requested_date_spoken: 'Monday, the 19th of October',
    call_back_spoken: 'in a couple of minutes',
  });
});

test('a new hold lasts two minutes', () => {
  assert.deepEqual(newHold({ date: '2026-10-19', token: 3, holdId: 'H9', callId: 'me', now: MON_10AM }), {
    date: '2026-10-19',
    token: 3,
    holdId: 'H9',
    callId: 'me',
    expiresAt: '2026-10-19T04:32:00.000Z',
  });
});

test('two callers holding the same token at once: the earlier hold keeps it, the later moves', () => {
  const holds = [hold(7, 3, 'first'), hold(8, 3, 'second')];
  const keep = resolveHold({ bookings: [], holidays: [], holds, holdId: 'H7', now: MON_10AM });
  assert.equal(keep.changed, false);
  assert.equal(keep.response.token, 3);
  const moved = resolveHold({ bookings: [], holidays: [], holds, holdId: 'H8', now: MON_10AM });
  assert.equal(moved.changed, true);
  assert.equal(moved.token, 1); // lowest free token not held by an earlier hold
  assert.deepEqual(moved.response, {
    ok: true,
    available: true,
    date: '2026-10-19',
    date_spoken: 'Monday, the 19th of October',
    token: 1,
    time_spoken: 'seven PM',
    slots_left: 4,
  });
});

test('a hold squeezed out by earlier holds and bookings is released and reported as all held', () => {
  const bookings = [1, 2, 3, 4].map((t) => row('2026-10-19', t));
  const holds = [hold(1, 5, 'first'), hold(2, 5, 'second')];
  const res = resolveHold({ bookings, holidays: [], holds, holdId: 'H2', now: MON_10AM });
  assert.equal(res.token, null);
  assert.equal(res.changed, true);
  assert.equal(res.response.reason, 'all_held');
});

test('booking uses this call\'s own hold, or the lowest token not held by someone else', () => {
  const book = (holds) =>
    decideBooking({ bookings: [], holidays: [], holds, booking: RAVI, callId: 'me', bookingId: 'VB-1', now: MON_10AM });
  assert.equal(book([hold(1, 3, 'me')]).row.TokenNumber, 3);
  assert.equal(book([hold(1, 1, 'other'), hold(2, 3, 'me', -1)]).row.TokenNumber, 2); // own hold expired
  const allHeld = book([1, 2, 3, 4, 5].map((t) => hold(t, t, `other${t}`)));
  assert.equal(allHeld.canBook, false);
  assert.equal(allHeld.response.reason, 'all_held');
});

test('holds whose token is already booked are finished and do not take another token', () => {
  // A and B booked tokens 1 and 2 from their holds; those holds have not expired yet.
  const bookings = [row('2026-10-19', 1), row('2026-10-19', 2)];
  const holds = [hold(1, 1, 'A'), hold(2, 2, 'B'), hold(3, 3, 'C'), hold(4, 4, 'E')];
  const res = resolveHold({ bookings, holidays: [], holds, holdId: 'H4', now: MON_10AM });
  assert.equal(res.changed, false);
  assert.equal(res.response.token, 4);
  assert.equal(res.response.slots_left, 2); // 5 minus bookings 1, 2 and C's hold on 3
});

// ---------------------------------------------------------------- moving a booking to another free token today

const booking = (row_number, TokenNumber, PatientName, phone = '919748785540', extra = {}) => ({
  row_number,
  ...row('2026-10-19', TokenNumber, phone, PatientName),
  Time: '',
  BookingId: `VB-${row_number}`,
  Status: 'Active',
  ...extra,
});

test('move goes to the earliest free token by default (e.g. the one just freed by a cancel)', () => {
  const bookings = [booking(2, 1, 'Taher', undefined, { Status: 'Cancelled' }), booking(3, 2, 'Saifuddin'), booking(4, 3, 'Other', '919811111111')];
  const res = planMove({ bookings, holds: [], callId: 'me', token: 2, phone: '9 7 4 8 7 8 5 5 4 0', now: MON_10AM });
  assert.equal(res.canMove, true);
  assert.equal(res.row.TokenNumber, 1);
  assert.equal(res.row.Time, '19:00');
  assert.equal(res.row.row_number, undefined);
  assert.deepEqual(res.response, {
    ok: true,
    moved: true,
    old_token: 2,
    token: 1,
    patient_name: 'Saifuddin',
    time_spoken: 'seven PM',
  });
});

test('move to a named token, which must be free and not held by another caller', () => {
  const bookings = [booking(2, 1, 'Saifuddin'), booking(3, 3, 'Other', '919811111111')];
  assert.equal(planMove({ bookings, holds: [], callId: 'me', token: 1, to_token: 4, phone: '9748785540', now: MON_10AM }).row.TokenNumber, 4);
  assert.deepEqual(planMove({ bookings, holds: [], callId: 'me', token: 1, to_token: 3, phone: '9748785540', now: MON_10AM }).response, {
    ok: true,
    moved: false,
    reason: 'token_taken',
  });
  const held = [hold(1, 4, 'someone-else')];
  assert.equal(planMove({ bookings, holds: held, callId: 'me', token: 1, to_token: 4, phone: '9748785540', now: MON_10AM }).response.reason, 'token_taken');
});

test('move refuses when no earlier token is free, or the booking is not on this phone', () => {
  const bookings = [booking(2, 1, 'A', '919811111111'), booking(3, 2, 'Saifuddin')];
  assert.equal(planMove({ bookings, holds: [], callId: 'me', token: 2, phone: '9748785540', now: MON_10AM }).response.reason, 'no_earlier_slot');
  assert.equal(planMove({ bookings, holds: [], callId: 'me', token: 2, phone: '9811111111', now: MON_10AM }).response.reason, 'not_found');
});

test('after moving, a clash with a simultaneous booking puts the booking back', () => {
  const moved = booking(3, 1, 'Saifuddin'); // our row, now on token 1
  const clash = [booking(2, 1, 'Newcomer', '919822222222', { BookingId: 'VB-NEW' }), moved];
  assert.equal(moveClashes({ bookings: clash, bookingId: 'VB-3' }), true);
  assert.equal(moveClashes({ bookings: [moved], bookingId: 'VB-3' }), false);
});
