// Run: node --test "Booking Appointment using Voice AI Agent/n8n/clinic-rules.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { checkAvailability, validateBookingArgs, decideBooking, normalizeRequest } = require('./clinic-rules');

// Monday 19 Oct 2026, 10:00 IST
const MON_10AM = new Date('2026-10-19T04:30:00Z');

const row = (Date, TokenNumber, WhatsAppNumber = '919800000000') => ({ Date, TokenNumber, WhatsAppNumber });

test('open weekday offers the next token, counting only that date', () => {
  const bookings = [row('2026-10-20', 1), row('2026-10-20', 2), row('2026-10-22', 1)];
  const res = checkAvailability({ bookings, holidays: [], args: { requested_date: '2026-10-20' }, now: MON_10AM });
  assert.deepEqual(res, {
    ok: true,
    available: true,
    date: '2026-10-20',
    date_spoken: 'Tuesday, the 20th of October',
    token: 3,
    time_spoken: 'seven thirty PM',
    slots_left: 3,
  });
});

test('full date is refused with the next open date', () => {
  const bookings = [1, 2, 3, 4, 5].map((t) => row('2026-10-20', t)).concat(row('2026-10-21', 1));
  const res = checkAvailability({ bookings, holidays: [], args: { requested_date: '2026-10-20' }, now: MON_10AM });
  assert.deepEqual(res, {
    ok: true,
    available: false,
    reason: 'full',
    requested_date_spoken: 'Tuesday, the 20th of October',
    next_available: { date: '2026-10-21', date_spoken: 'Wednesday, the 21st of October', time_spoken: 'seven fifteen PM' },
  });
});

test('holiday is closed and the next open day is offered', () => {
  const holidays = [{ Date: '2026-10-21', Note: 'Clinic holiday' }];
  const res = checkAvailability({ bookings: [], holidays, args: { requested_date: '2026-10-21' }, now: MON_10AM });
  assert.equal(res.available, false);
  assert.equal(res.reason, 'closed');
  assert.deepEqual(res.next_available, { date: '2026-10-22', date_spoken: 'Thursday, the 22nd of October', time_spoken: 'seven PM' });
});

test('Sunday is closed; next open day beyond the 7-day window is not offered', () => {
  // Window from Monday 19th is 19th–25th; the 25th is a Sunday, the 26th is out of range.
  const res = checkAvailability({ bookings: [], holidays: [], args: { requested_date: '2026-10-25' }, now: MON_10AM });
  assert.equal(res.reason, 'closed');
  assert.equal(res.requested_date_spoken, 'Sunday, the 25th of October');
  assert.equal(res.next_available, null);
});

test('today after 5 PM IST is past cutoff and tomorrow is offered', () => {
  const MON_5PM = new Date('2026-10-19T11:30:00Z'); // 17:00 IST
  const res = checkAvailability({ bookings: [], holidays: [], args: { requested_date: '2026-10-19' }, now: MON_5PM });
  assert.equal(res.reason, 'past_cutoff');
  assert.equal(res.next_available.date, '2026-10-20');
});

test('today before 5 PM IST is bookable', () => {
  const MON_459PM = new Date('2026-10-19T11:29:00Z'); // 16:59 IST
  const res = checkAvailability({ bookings: [], holidays: [], args: { requested_date: '2026-10-19' }, now: MON_459PM });
  assert.equal(res.available, true);
  assert.equal(res.date, '2026-10-19');
});

test('empty requested_date returns the earliest bookable slot', () => {
  const MON_6PM = new Date('2026-10-19T12:30:00Z'); // past cutoff today
  const bookings = [row('2026-10-20', 1)];
  const res = checkAvailability({ bookings, holidays: [], args: { requested_date: '' }, now: MON_6PM });
  assert.equal(res.available, true);
  assert.equal(res.date, '2026-10-20');
  assert.equal(res.token, 2);
});

test('dates in the past or beyond the 7-day window are out_of_range', () => {
  for (const requested_date of ['2026-10-18', '2026-10-26']) {
    const res = checkAvailability({ bookings: [], holidays: [], args: { requested_date }, now: MON_10AM });
    assert.equal(res.reason, 'out_of_range', requested_date);
    assert.equal(res.next_available.date, '2026-10-19', requested_date);
  }
});

test('unparseable date is invalid_date and the earliest slot is offered', () => {
  for (const requested_date of ['next tuesday', '2026-02-30', '2026-13-01']) {
    const res = checkAvailability({ bookings: [], holidays: [], args: { requested_date }, now: MON_10AM });
    assert.equal(res.reason, 'invalid_date', requested_date);
    assert.equal(res.requested_date_spoken, null, requested_date);
    assert.equal(res.next_available.date, '2026-10-19', requested_date);
  }
});

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

const RAVI = { date: '2026-10-20', patientName: 'Ravi Kumar', age: 34, reason: 'Fillings', phone: '9830012345' };

test('booking recounts the date and assigns the next token and time', () => {
  const bookings = [row('2026-10-20', 1), row('2026-10-20', 2), row('2026-10-19', 1, '919830012345')];
  const res = decideBooking({ bookings, holidays: [], booking: RAVI, callId: 'call_abc', now: MON_10AM });
  assert.deepEqual(res, {
    canBook: true,
    row: {
      Date: '2026-10-20',
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
      date_spoken: 'Tuesday, the 20th of October',
      time_spoken: 'seven thirty PM',
      reason: 'Fillings',
    },
  });
});

test('same phone on the same date returns the existing booking instead', () => {
  const bookings = [row('2026-10-20', 1), row('2026-10-20', 2, '+91 98300-12345')];
  const res = decideBooking({ bookings, holidays: [], booking: RAVI, callId: 'call_abc', now: MON_10AM });
  assert.deepEqual(res, {
    canBook: false,
    response: {
      ok: true,
      booked: false,
      reason: 'already_booked',
      token: 2,
      date_spoken: 'Tuesday, the 20th of October',
      time_spoken: 'seven fifteen PM',
    },
  });
});

test('full, closed or past-cutoff dates are refused with the next open date', () => {
  const full = [1, 2, 3, 4, 5].map((t) => row('2026-10-20', t));
  const MON_6PM = new Date('2026-10-19T12:30:00Z');
  const cases = [
    [{ bookings: full, holidays: [], booking: RAVI, now: MON_10AM }, 'full', '2026-10-21'],
    [{ bookings: [], holidays: [], booking: { ...RAVI, date: '2026-10-25' }, now: MON_10AM }, 'closed', null],
    [{ bookings: [], holidays: [], booking: { ...RAVI, date: '2026-10-19' }, now: MON_6PM }, 'past_cutoff', '2026-10-20'],
    [{ bookings: [], holidays: [], booking: { ...RAVI, date: '2026-11-02' }, now: MON_10AM }, 'out_of_range', '2026-10-19'],
  ];
  for (const [input, reason, nextDate] of cases) {
    const res = decideBooking({ ...input, callId: 'call_abc' });
    assert.equal(res.canBook, false, reason);
    assert.equal(res.row, undefined, reason);
    assert.equal(res.response.booked, false, reason);
    assert.equal(res.response.reason, reason);
    assert.equal(res.response.next_available?.date ?? null, nextDate, reason);
  }
});

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
