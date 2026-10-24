// Written to the Bookings tab's Channel column, so the shared sheet shows which agent booked.
const CHANNEL = 'Telnyx Voice';

const DEFAULT_CONFIG = {
  slots: 5,
  startTime: '19:00',
  slotMinutes: 15,
  openHour: 9, // bookings are same-day only, taken from 9 AM …
  cutoffHour: 17, // … until 5 PM
  closedWeekdays: [7], // ISO weekday: 1 = Monday … 7 = Sunday
  tzOffsetMinutes: 330, // Asia/Kolkata, no DST
  holdMinutes: 2, // a token offered to a caller is held this long while they give their details
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

// A blank Status (WhatsApp rows, older voice rows) counts as active.
const isActive = (b) => String(b.Status ?? '').trim().toLowerCase() !== 'cancelled';
const activeOn = (bookings, dateStr) => bookings.filter((b) => String(b.Date ?? '').trim() === dateStr && isActive(b));
const countOn = (bookings, dateStr) => activeOn(bookings, dateStr).length;

// Lowest token 1..slots not held by an active booking (a cancelled token is reused), or null when full.
function lowestFreeToken(takenTokens, slots) {
  for (let t = 1; t <= slots; t++) if (!takenTokens.has(t)) return t;
  return null;
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
  if (lowestFreeToken(takenTokens(ctx, date), ctx.config.slots) === null) return 'all_held';
  if (ctx.hour >= ctx.config.cutoffHour) return 'past_cutoff';
  return null;
}

function slotOn(ctx, date, token = lowestFreeToken(takenTokens(ctx, date), ctx.config.slots)) {
  return { date, date_spoken: speakDate(date), token, time_spoken: speakTime(slotMinutesOfDay(token, ctx.config)) };
}

const slotsLeft = (ctx, date) => ctx.config.slots - takenTokens(ctx, date).size;

// When to tell the caller to ring back, already in spoken form (the agent never works out dates itself).
function callBackSpoken(ctx, reason, date) {
  const opening = speakTime(ctx.config.openHour * 60);
  const onDay = (d) => (d === addDays(ctx.today, 1) ? `tomorrow after ${opening}` : `on ${speakDate(d)}, after ${opening}`);
  if (reason === 'invalid_date' || reason === 'past_date') return null;
  if (reason === 'before_opening') return `today after ${opening}`;
  if (reason === 'all_held') return 'in a couple of minutes';
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

// Unexpired holds from the "Voice Slot Holds" data table, optionally leaving out one call's own holds.
const activeHolds = (holds, now, exceptCallId) =>
  holds.filter((h) => new Date(h.expiresAt) > now && (exceptCallId === undefined || h.callId !== exceptCallId));

function makeContext({ bookings, holidays, holds = [], callId, now, config }) {
  const local = clinicNow(now, config);
  return {
    bookings,
    // Tokens other callers are holding right now, by date; this call's own holds don't block it.
    heldByOthers: activeHolds(holds, now, callId ?? '').map((h) => ({ date: String(h.date), token: Number(h.token) })),
    holidays: new Set(holidays.map((h) => String(h.Date ?? '').trim())),
    today: local.date,
    hour: local.hour,
    config,
  };
}

// Tokens on a date that are booked (active) or held by another caller.
function takenTokens(ctx, date) {
  const taken = new Set(activeOn(ctx.bookings, date).map((b) => Number(b.TokenNumber)));
  for (const h of ctx.heldByOthers) if (h.date === date) taken.add(h.token);
  return taken;
}

function checkAvailability({ bookings, holidays, holds = [], callId = '', args, now, config = DEFAULT_CONFIG }) {
  const ctx = makeContext({ bookings, holidays, holds, callId, now, config });
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
  return { ok: true, available: true, ...slot, slots_left: slotsLeft(ctx, date) };
}

const REASONS = ['Consultation', 'Fillings', 'Tooth extraction', 'Gum treatment', 'Other'];

// Digits of an Indian number without the +91 / 0 prefix. Anything else is kept whole (not trimmed to 10),
// so a mis-heard extra or missing digit fails validation instead of saving someone else's number.
function normalizePhone(s) {
  const digits = String(s ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

// The agent sometimes sends the read-back spelling ("S-A-I-F R-A-M") instead of the name; join such words.
const SPELLED_WORD = /^[a-z](\s*-\s*[a-z])+$/i;
const joinSpelledName = (name) =>
  name
    .split(/(?<!-)\s+(?!-)/)
    .map((w) => {
      if (!SPELLED_WORD.test(w)) return w;
      const letters = w.replace(/[\s-]/g, '');
      return letters[0].toUpperCase() + letters.slice(1).toLowerCase();
    })
    .join(' ');

function validateBookingArgs(args, callerNumber) {
  const reason = REASONS.find((r) => r.toLowerCase() === String(args.reason ?? '').trim().toLowerCase());
  const detail = String(args.reason_detail ?? '').trim();
  const date = String(args.date ?? '').trim();
  const patientName = joinSpelledName(String(args.patient_name ?? '').trim());
  const age = Number(args.age);
  const phone = normalizePhone(args.phone || callerNumber);
  const fail = (message) => ({ ok: false, message });

  if (!isValidDate(date)) return fail('Invalid date');
  if (patientName.length < 2) return fail('Invalid name');
  // Three or more single letters in a row is a spelling, not a name; word breaks are lost, so ask the agent to resend.
  if (/(^|\s)([a-z]\s+){2,}[a-z](\s|$)/i.test(patientName)) {
    return fail('Name sent as letters: call book_appointment again with patient_name written as words, e.g. "Saifuddin Rampurawala". Do not ask the caller again.');
  }
  if (!Number.isInteger(age) || age < 1 || age > 120) return fail('Invalid age');
  if (!reason) return fail('Invalid reason');
  if (reason === 'Other' && !detail) return fail('Please describe the reason');
  if (phone.length !== 10) return fail(`Invalid phone number: need 10 digits, got ${phone.length}`);

  return {
    ok: true,
    value: { date, patientName, age, reason: reason === 'Other' ? `Other: ${detail}` : reason, phone },
  };
}

const DIGIT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
// 10-digit number read in 3 - 3 - 4 groups: "nine eight three - zero zero one - two three four five".
const speakPhone = (digits) =>
  [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)].map((g) => [...g].map((d) => DIGIT_WORDS[d]).join(' ')).join(' - ');

// Whether the call carries a usable caller ID (web calls and withheld numbers don't), so the agent
// branches on a function result instead of an empty {{user_number}}.
function callerIdInfo(callerNumber) {
  const digits = normalizePhone(callerNumber);
  if (digits.length !== 10) return { caller_id_available: false, caller_id_last4_spoken: null };
  return { caller_id_available: true, caller_id_last4_spoken: [...digits.slice(-4)].map((d) => DIGIT_WORDS[d]).join(' ') };
}

const hhmm = (minutesOfDay) =>
  `${String(Math.floor(minutesOfDay / 60)).padStart(2, '0')}:${String(minutesOfDay % 60).padStart(2, '0')}`;

const sameName = (a, b) => String(a ?? '').trim().replace(/\s+/g, ' ').toLowerCase() === String(b ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const sheetRow = ({ row_number, ...row }) => row; // row_number comes from reads and is not a sheet column

// What the agent reads back after a booking, built from the saved row.
function bookedResponse(row, config) {
  const token = Number(row.TokenNumber);
  return {
    ok: true,
    booked: true,
    token,
    date_spoken: speakDate(row.Date),
    time_spoken: speakTime(slotMinutesOfDay(token, config)),
    reason: row.Reason,
    // Echoed so the agent reads back what was actually saved: LLMs mis-copy names and digits into tool args.
    patient_name: row.PatientName,
    phone_spoken: speakPhone(normalizePhone(row.WhatsAppNumber)),
  };
}

// Decides a validated booking against a fresh read of the sheet. The agent never picks the token.
// A duplicate is the same patient name on the same phone on the same day; family members on one phone are fine.
function decideBooking({ bookings, holidays, holds = [], booking, callId, bookingId, now, config = DEFAULT_CONFIG }) {
  const ctx = makeContext({ bookings, holidays, holds, callId, now, config });

  const existing = activeOn(bookings, booking.date).find(
    (b) => normalizePhone(b.WhatsAppNumber) === booking.phone && sameName(b.PatientName, booking.patientName),
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
        patient_name: existing.PatientName,
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

  // This call's newest unexpired hold for the day, unless that token has been booked meanwhile.
  const booked = new Set(activeOn(bookings, booking.date).map((b) => Number(b.TokenNumber)));
  const ownHold = activeHolds(holds, now)
    .filter((h) => h.callId === callId && String(h.date) === booking.date && !booked.has(Number(h.token)))
    .sort((a, b) => Number(b.id) - Number(a.id))[0];
  const slot = slotOn(ctx, booking.date, ownHold ? Number(ownHold.token) : undefined);
  const row = {
    Date: booking.date,
    Time: hhmm(slotMinutesOfDay(slot.token, config)),
    TokenNumber: slot.token,
    PatientName: booking.patientName,
    Age: booking.age,
    Reason: booking.reason,
    WhatsAppNumber: `91${booking.phone}`,
    BookedAt: now.toISOString(),
    Channel: CHANNEL,
    CallId: callId,
    Status: 'Active',
    BookingId: bookingId,
  };
  return { canBook: true, row, response: bookedResponse(row, config) };
}

// Two callers booking at the same moment can both be given the same token. After our append we re-read the
// sheet and replay the day's active bookings in sheet order (row_number = who saved first): each keeps its
// token unless an earlier row already holds it, in which case it takes the lowest free token. Every
// execution replays the same way, so each fixes only its own row and they agree on the outcome.
function resolveToken({ bookings, holidays, bookingId, now, config = DEFAULT_CONFIG }) {
  const mine = bookings.find((b) => b.BookingId === bookingId);
  // Simultaneous Sheets appends can land on the same row, so our row may have been overwritten.
  if (!mine) {
    return {
      changed: false,
      lost: true,
      response: { ok: false, message: 'Booking did not save because another caller booked at the same moment: call book_appointment again.' },
    };
  }
  const day = activeOn(bookings, String(mine.Date).trim()).sort((a, b) => Number(a.row_number) - Number(b.row_number));

  const taken = new Set();
  let myToken = null;
  for (const b of day) {
    const wanted = Number(b.TokenNumber);
    const token = wanted >= 1 && wanted <= config.slots && !taken.has(wanted) ? wanted : lowestFreeToken(taken, config.slots);
    if (token !== null) taken.add(token);
    if (b.BookingId === bookingId) myToken = token;
  }

  if (myToken === null) {
    const ctx = makeContext({ bookings, holidays, now, config });
    return {
      changed: true,
      row: { ...sheetRow(mine), Status: 'Cancelled' },
      response: { ok: true, booked: false, reason: 'full', call_back_spoken: callBackSpoken(ctx, 'full', mine.Date) },
    };
  }
  const row = { ...sheetRow(mine), TokenNumber: myToken, Time: hhmm(slotMinutesOfDay(myToken, config)) };
  return { changed: myToken !== Number(mine.TokenNumber), row, response: bookedResponse(row, config) };
}

// Moves today's booking (same phone only) to another free token: the earliest free one by default, which is
// what "push it to the earlier time" means, or a named to_token. Tokens booked or held by others are skipped.
function planMove({ bookings, holds = [], callId = '', token, to_token, phone, now, config = DEFAULT_CONFIG }) {
  const digits = normalizePhone(phone);
  const invalid = phoneError(digits);
  if (invalid) return { canMove: false, response: invalid };
  const ctx = makeContext({ bookings, holidays: [], holds, callId, now, config });
  const current = Number(token);
  const match = activeOn(bookings, ctx.today).find((b) => Number(b.TokenNumber) === current && normalizePhone(b.WhatsAppNumber) === digits);
  const refuse = (reason) => ({ canMove: false, response: { ok: true, moved: false, reason } });
  if (!match) return refuse('not_found');
  if (!String(match.BookingId ?? '').trim()) return refuse('needs_reception');

  const taken = takenTokens(ctx, ctx.today);
  taken.delete(current);
  let target;
  if (to_token !== undefined && to_token !== null && to_token !== '') {
    target = Number(to_token);
    if (!(target >= 1 && target <= config.slots) || taken.has(target)) return refuse('token_taken');
  } else {
    target = lowestFreeToken(taken, config.slots);
    if (target === null || target >= current) return refuse('no_earlier_slot');
  }
  return {
    canMove: true,
    row: { ...match, row_number: undefined, TokenNumber: target, Time: hhmm(slotMinutesOfDay(target, config)) },
    response: {
      ok: true,
      moved: true,
      old_token: current,
      token: target,
      patient_name: match.PatientName,
      time_spoken: speakTime(slotMinutesOfDay(target, config)),
    },
  };
}

// After saving a move, re-read: if another active booking landed on the same token meanwhile, the move is undone.
function moveClashes({ bookings, bookingId }) {
  const mine = bookings.find((b) => b.BookingId === bookingId);
  if (!mine) return false;
  return activeOn(bookings, String(mine.Date).trim()).some(
    (b) => b.BookingId !== bookingId && Number(b.TokenNumber) === Number(mine.TokenNumber),
  );
}

function newHold({ date, token, holdId, callId, now, config = DEFAULT_CONFIG }) {
  return { date, token, holdId, callId, expiresAt: new Date(now.getTime() + config.holdMinutes * 60000).toISOString() };
}

// Two callers checking at the same moment can both hold the same token. After inserting our hold we re-read
// the day's holds and replay them in data-table id order (ids never collide, unlike Sheets rows): bookings
// come first, then each hold keeps its token unless an earlier one has it, else takes the lowest free token.
function resolveHold({ bookings, holidays, holds, holdId, now, config = DEFAULT_CONFIG }) {
  const mine = holds.find((h) => h.holdId === holdId);
  if (!mine) throw new Error(`Hold ${holdId} not found after saving it`);
  const date = String(mine.date);
  const booked = new Set(activeOn(bookings, date).map((b) => Number(b.TokenNumber)));
  const taken = new Set(booked);
  let myToken = null;
  for (const h of activeHolds(holds, now)
    .filter((x) => String(x.date) === date)
    .sort((a, b) => Number(a.id) - Number(b.id))) {
    const wanted = Number(h.token);
    // Another caller's hold on a token that is now booked is finished (usually it became that booking).
    if (h.holdId !== holdId && booked.has(wanted)) continue;
    const token = wanted >= 1 && wanted <= config.slots && !taken.has(wanted) ? wanted : lowestFreeToken(taken, config.slots);
    if (token !== null) taken.add(token);
    if (h.holdId === holdId) myToken = token;
  }

  const ctx = makeContext({ bookings, holidays, holds, callId: mine.callId, now, config });
  if (myToken === null) {
    return {
      token: null,
      changed: true,
      response: { ok: true, available: false, reason: 'all_held', requested_date_spoken: speakDate(date), call_back_spoken: callBackSpoken(ctx, 'all_held', date) },
    };
  }
  return {
    token: myToken,
    changed: myToken !== Number(mine.token),
    response: { ok: true, available: true, ...slotOn(ctx, date, myToken), slots_left: slotsLeft(ctx, date) },
  };
}

function phoneError(phone) {
  return phone.length === 10 ? null : { ok: false, message: `Invalid phone number: need 10 digits, got ${phone.length}` };
}

// Today's active bookings made with this phone number, for the agent to read out before cancelling.
function findBookings({ bookings, phone, now, config = DEFAULT_CONFIG }) {
  const digits = normalizePhone(phone);
  const invalid = phoneError(digits);
  if (invalid) return invalid;
  const { date: today } = clinicNow(now, config);
  return {
    ok: true,
    bookings: activeOn(bookings, today)
      .filter((b) => normalizePhone(b.WhatsAppNumber) === digits)
      .sort((a, b) => Number(a.TokenNumber) - Number(b.TokenNumber))
      .map((b) => ({
        token: Number(b.TokenNumber),
        patient_name: b.PatientName,
        time_spoken: speakTime(slotMinutesOfDay(Number(b.TokenNumber), config)),
      })),
  };
}

// Cancels today's active booking with this token, only for the phone it was booked with. The row stays in the
// sheet as Cancelled, which frees the token for the next caller.
function planCancel({ bookings, token, phone, now, config = DEFAULT_CONFIG }) {
  const digits = normalizePhone(phone);
  const invalid = phoneError(digits);
  if (invalid) return { canCancel: false, response: invalid };
  const { date: today } = clinicNow(now, config);
  const match = activeOn(bookings, today).find(
    (b) => Number(b.TokenNumber) === Number(token) && normalizePhone(b.WhatsAppNumber) === digits,
  );
  if (!match) return { canCancel: false, response: { ok: true, cancelled: false, reason: 'not_found' } };
  if (!String(match.BookingId ?? '').trim()) {
    return { canCancel: false, response: { ok: true, cancelled: false, reason: 'needs_reception' } };
  }
  return {
    canCancel: true,
    row: { ...match, row_number: undefined, Status: 'Cancelled' },
    response: {
      ok: true,
      cancelled: true,
      token: Number(match.TokenNumber),
      patient_name: match.PatientName,
      time_spoken: speakTime(slotMinutesOfDay(Number(match.TokenNumber), config)),
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

module.exports = {
  DEFAULT_CONFIG,
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
  hhmm,
  slotMinutesOfDay,
};
