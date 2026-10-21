const DEFAULT_CONFIG = {
  slots: 5,
  startTime: '19:00',
  slotMinutes: 15,
  openHour: 9, // bookings are same-day only, taken from 9 AM …
  cutoffHour: 17, // … until 5 PM
  closedWeekdays: [7], // ISO weekday: 1 = Monday … 7 = Sunday
  tzOffsetMinutes: 330, // Asia/Kolkata, no DST
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const NUMBER_WORDS = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
const MINUTE_WORDS = { 0: '', 15: 'fifteen', 30: 'thirty', 45: 'forty-five' };

// A yyyy-MM-dd date is handled as a UTC-midnight Date so weekday/arithmetic ignore the host timezone.
const parseDate = (s) => new Date(`${s}T00:00:00Z`);
const formatDate = (d) => d.toISOString().slice(0, 10);
// Real calendar date in yyyy-MM-dd form (rejects 2026-02-30, which Date would roll over).
const isValidDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseDate(s)) && formatDate(parseDate(s)) === s;

function ordinal(n) {
  const rem = n % 100;
  if (rem >= 11 && rem <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
}

function speakDate(dateStr) {
  const d = parseDate(dateStr);
  return `${WEEKDAYS[d.getUTCDay()]}, the ${ordinal(d.getUTCDate())} of ${MONTHS[d.getUTCMonth()]}`;
}

function slotMinutesOfDay(token, config) {
  const [h, m] = config.startTime.split(':').map(Number);
  return h * 60 + m + (token - 1) * config.slotMinutes;
}

function speakTime(minutesOfDay) {
  const h = Math.floor(minutesOfDay / 60);
  const m = minutesOfDay % 60;
  const words = MINUTE_WORDS[m] ?? String(m);
  return [NUMBER_WORDS[h % 12], words, h >= 12 ? 'PM' : 'AM'].filter(Boolean).join(' ');
}

function countOn(bookings, dateStr) {
  return bookings.filter((b) => String(b.Date ?? '').trim() === dateStr).length;
}

const addDays = (dateStr, n) => formatDate(new Date(parseDate(dateStr).getTime() + n * 86400000));

const isClosed = (ctx, date) => ctx.config.closedWeekdays.includes(parseDate(date).getUTCDay() || 7) || ctx.holidays.has(date);

// Why a date can't be booked, or null if it can. Only today, between openHour and cutoffHour, is bookable.
function blockReason(ctx, date) {
  if (!isValidDate(date)) return 'invalid_date';
  if (date < ctx.today) return 'past_date';
  if (isClosed(ctx, date)) return 'closed';
  if (date > ctx.today) return 'not_today';
  if (ctx.hour < ctx.config.openHour) return 'before_opening';
  if (countOn(ctx.bookings, date) >= ctx.config.slots) return 'full';
  if (ctx.hour >= ctx.config.cutoffHour) return 'past_cutoff';
  return null;
}

function slotOn(ctx, date) {
  const token = countOn(ctx.bookings, date) + 1;
  return { date, date_spoken: speakDate(date), token, time_spoken: speakTime(slotMinutesOfDay(token, ctx.config)) };
}

// When to tell the caller to ring back, already in spoken form (the agent never works out dates itself).
function callBackSpoken(ctx, reason, date) {
  const opening = speakTime(ctx.config.openHour * 60);
  const onDay = (d) => (d === addDays(ctx.today, 1) ? `tomorrow after ${opening}` : `on ${speakDate(d)}, after ${opening}`);
  if (reason === 'invalid_date' || reason === 'past_date') return null;
  if (reason === 'before_opening') return `today after ${opening}`;
  if (reason === 'not_today') return onDay(date);
  // closed / full / past_cutoff: the next day the clinic is open.
  for (let d = addDays(ctx.today, 1), i = 0; i < 31; d = addDays(d, 1), i++) if (!isClosed(ctx, d)) return onDay(d);
  return null;
}

// "Now" as the clinic's local wall-clock: { date: 'yyyy-MM-dd', hour }.
function clinicNow(now, config) {
  const local = new Date(now.getTime() + config.tzOffsetMinutes * 60000);
  return { date: formatDate(local), hour: local.getUTCHours() };
}

function makeContext({ bookings, holidays, now, config }) {
  const local = clinicNow(now, config);
  return {
    bookings,
    holidays: new Set(holidays.map((h) => String(h.Date ?? '').trim())),
    today: local.date,
    hour: local.hour,
    config,
  };
}

function checkAvailability({ bookings, holidays, args, now, config = DEFAULT_CONFIG }) {
  const ctx = makeContext({ bookings, holidays, now, config });
  const date = String(args.requested_date ?? '').trim() || ctx.today;
  const reason = blockReason(ctx, date);
  if (reason) {
    return {
      ok: true,
      available: false,
      reason,
      requested_date_spoken: reason === 'invalid_date' ? null : speakDate(date),
      call_back_spoken: callBackSpoken(ctx, reason, date),
    };
  }
  const slot = slotOn(ctx, date);
  return { ok: true, available: true, ...slot, slots_left: config.slots - slot.token + 1 };
}

const REASONS = ['Consultation', 'Fillings', 'Tooth extraction', 'Gum treatment', 'Other'];

// Indian numbers are matched on their last 10 digits (drops +91 / leading 0 / spaces).
const normalizePhone = (s) => String(s ?? '').replace(/\D/g, '').slice(-10);

function validateBookingArgs(args, callerNumber) {
  const reason = REASONS.find((r) => r.toLowerCase() === String(args.reason ?? '').trim().toLowerCase());
  const detail = String(args.reason_detail ?? '').trim();
  const date = String(args.date ?? '').trim();
  const patientName = String(args.patient_name ?? '').trim();
  const age = Number(args.age);
  const phone = normalizePhone(args.phone || callerNumber);
  const fail = (message) => ({ ok: false, message });

  if (!isValidDate(date)) return fail('Invalid date');
  if (patientName.length < 2) return fail('Invalid name');
  if (!Number.isInteger(age) || age < 1 || age > 120) return fail('Invalid age');
  if (!reason) return fail('Invalid reason');
  if (reason === 'Other' && !detail) return fail('Please describe the reason');
  if (phone.length !== 10) return fail('Invalid phone number');

  return {
    ok: true,
    value: { date, patientName, age, reason: reason === 'Other' ? `Other: ${detail}` : reason, phone },
  };
}

const DIGIT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
// 10-digit number read in 3 - 3 - 4 groups: "nine eight three - zero zero one - two three four five".
const speakPhone = (digits) =>
  [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)].map((g) => [...g].map((d) => DIGIT_WORDS[d]).join(' ')).join(' - ');

const hhmm = (minutesOfDay) =>
  `${String(Math.floor(minutesOfDay / 60)).padStart(2, '0')}:${String(minutesOfDay % 60).padStart(2, '0')}`;

// Decides a validated booking against a fresh read of the sheet. The agent never picks the token.
function decideBooking({ bookings, holidays, booking, callId, now, config = DEFAULT_CONFIG }) {
  const ctx = makeContext({ bookings, holidays, now, config });

  const existing = bookings.find(
    (b) => String(b.Date ?? '').trim() === booking.date && normalizePhone(b.WhatsAppNumber) === booking.phone,
  );
  if (existing) {
    const token = Number(existing.TokenNumber);
    return {
      canBook: false,
      response: {
        ok: true,
        booked: false,
        reason: 'already_booked',
        token,
        date_spoken: speakDate(booking.date),
        time_spoken: speakTime(slotMinutesOfDay(token, config)),
      },
    };
  }

  const reason = blockReason(ctx, booking.date);
  if (reason) {
    return {
      canBook: false,
      response: { ok: true, booked: false, reason, call_back_spoken: callBackSpoken(ctx, reason, booking.date) },
    };
  }

  const slot = slotOn(ctx, booking.date);
  return {
    canBook: true,
    row: {
      Date: booking.date,
      Time: hhmm(slotMinutesOfDay(slot.token, config)),
      TokenNumber: slot.token,
      PatientName: booking.patientName,
      Age: booking.age,
      Reason: booking.reason,
      WhatsAppNumber: `91${booking.phone}`,
      BookedAt: now.toISOString(),
      Channel: 'Voice',
      CallId: callId,
    },
    response: {
      ok: true,
      booked: true,
      token: slot.token,
      date_spoken: slot.date_spoken,
      time_spoken: slot.time_spoken,
      reason: booking.reason,
      // Echoed so the agent reads back what was actually saved: LLMs mis-copy names and digits into tool args.
      patient_name: booking.patientName,
      phone_spoken: speakPhone(booking.phone),
    },
  };
}

function parseArgs(args) {
  if (args && typeof args === 'object') return args;
  try {
    const parsed = JSON.parse(args);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// Retell custom-function body: { name, args, call: { call_id, from_number, ... } }.
function normalizeRequest(body) {
  const b = body && typeof body === 'object' ? body : {};
  const call = b.call && typeof b.call === 'object' ? b.call : {};
  return {
    fnName: String(b.name ?? ''),
    args: parseArgs(b.args),
    callId: String(call.call_id ?? ''),
    callerNumber: String(call.from_number ?? ''),
  };
}

module.exports = { DEFAULT_CONFIG, checkAvailability, validateBookingArgs, decideBooking, normalizeRequest };
