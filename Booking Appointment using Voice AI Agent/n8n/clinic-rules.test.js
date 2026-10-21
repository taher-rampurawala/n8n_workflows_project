// Run: node --test "Booking Appointment using Voice AI Agent/n8n/clinic-rules.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { checkAvailability, validateBookingArgs, decideBooking, normalizeRequest } = require('./clinic-rules');

// Clinic times are IST (UTC+5:30). 19 Oct 2026 is a Monday.
const ist = (date, hhmm) => new Date(`${date}T${hhmm}:00+05:30`);
const MON_10AM = ist('2026-10-19', '10:00');

const row = (Date, TokenNumber, WhatsAppNumber = '919800000000') => ({ Date, TokenNumber, WhatsAppNumber });
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
  assert.deepEqual(validateBookingArgs(good, ''), { ok: false, message: 'Invalid phone number' });
});

// ---------------------------------------------------------------- decideBooking

const RAVI = { date: '2026-10-19', patientName: 'Ravi Kumar', age: 34, reason: 'Fillings', phone: '9830012345' };

test('booking recounts today and echoes the saved name and number for read-back', () => {
  const bookings = [row('2026-10-19', 1), row('2026-10-19', 2), row('2026-10-18', 1, '919830012345')];
  const res = decideBooking({ bookings, holidays: [], booking: RAVI, callId: 'call_abc', now: MON_10AM });
  assert.deepEqual(res, {
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

test('same phone on the same date returns the existing booking instead', () => {
  const bookings = [row('2026-10-19', 1), row('2026-10-19', 2, '+91 98300-12345')];
  const res = decideBooking({ bookings, holidays: [], booking: RAVI, callId: 'call_abc', now: MON_10AM });
  assert.deepEqual(res, {
    canBook: false,
    response: {
      ok: true,
      booked: false,
      reason: 'already_booked',
      token: 2,
      date_spoken: 'Monday, the 19th of October',
      time_spoken: 'seven fifteen PM',
    },
  });
});

test('anything but an open slot today is refused with a call-back day', () => {
  const full = [1, 2, 3, 4, 5].map((t) => row('2026-10-19', t));
  const cases = [
    [{ bookings: full, booking: RAVI, now: MON_10AM }, 'full', 'tomorrow after nine AM'],
    [{ bookings: [], booking: { ...RAVI, date: '2026-10-20' }, now: MON_10AM }, 'not_today', 'tomorrow after nine AM'],
    [{ bookings: [], booking: RAVI, now: ist('2026-10-19', '18:00') }, 'past_cutoff', 'tomorrow after nine AM'],
    [{ bookings: [], booking: RAVI, now: ist('2026-10-19', '08:00') }, 'before_opening', 'today after nine AM'],
  ];
  for (const [input, reason, callBack] of cases) {
    const res = decideBooking({ holidays: [], callId: 'call_abc', ...input });
    assert.equal(res.canBook, false, reason);
    assert.equal(res.row, undefined, reason);
    assert.deepEqual(res.response, { ok: true, booked: false, reason, call_back_spoken: callBack });
  }
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
