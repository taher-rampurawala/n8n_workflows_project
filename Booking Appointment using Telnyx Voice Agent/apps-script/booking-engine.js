// Booking engine run inside this script's Apps Script lock: one Telnyx request at a time. The Retell agent has its
// own script and lock on the same sheet, so after saving a booking or a move we re-read the sheet and settle any
// clash with a Retell write made at the same moment.
// The same file runs in Node for tests; build-apps-script.js strips the node-only blocks.
// @node-only-start
const {
  DEFAULT_CONFIG,
  checkAvailability,
  validateBookingArgs,
  decideBooking,
  findBookings,
  planCancel,
  planMove,
  resolveToken,
  moveClashes,
  newHold,
  callerIdInfo,
  hhmm,
  slotMinutesOfDay,
} = require('../engine/clinic-rules');
// @node-only-end

// store: { bookings(), freshBookings(), holidays(), holds(), addBooking(row), addHold(hold), endHolds(callId, now), updateBooking(row) }
// req:   { fnName, args, callId, callerNumber } as produced by n8n's Normalize Request.
function handleRequest(req, store, now, newId, config = DEFAULT_CONFIG) {
  const args = req.args || {};
  const callId = String(req.callId || '');
  const callerNumber = String(req.callerNumber || '');
  const phone = args.phone || callerNumber;
  const base = { bookings: store.bookings(), holidays: store.holidays(), now, config };

  switch (req.fnName) {
    case 'check_availability': {
      const res = checkAvailability({ ...base, holds: store.holds(), callId, args });
      if (res.available) store.addHold(newHold({ date: res.date, token: res.token, holdId: newId('H'), callId, now, config }));
      return { ...res, ...callerIdInfo(callerNumber) };
    }
    case 'book_appointment': {
      const valid = validateBookingArgs(args, callerNumber);
      if (!valid.ok) return valid;
      const decision = decideBooking({ ...base, holds: store.holds(), booking: valid.value, callId, bookingId: newId('VB') });
      if (!decision.canBook) return decision.response;
      store.addBooking(decision.row);
      // The hold became this booking; ending it means a later cancel frees the token at once.
      store.endHolds(callId, now);
      // A Retell booking saved a moment earlier may hold the same token: the earlier row keeps it, ours moves on.
      const settled = resolveToken({ bookings: store.freshBookings(), holidays: base.holidays, bookingId: decision.row.BookingId, now, config });
      if (settled.changed) store.updateBooking(settled.row);
      return settled.response;
    }
    case 'find_booking':
      return findBookings({ bookings: base.bookings, phone, now, config });
    case 'cancel_booking': {
      const plan = planCancel({ bookings: base.bookings, token: args.token, phone, now, config });
      if (plan.canCancel) store.updateBooking(plan.row);
      return plan.response;
    }
    case 'move_booking': {
      const plan = planMove({ bookings: base.bookings, holds: store.holds(), callId, token: args.token, to_token: args.to_token, phone, now, config });
      if (!plan.canMove) return plan.response;
      store.updateBooking(plan.row);
      // A Retell booking may have landed on the same token while we moved: put this booking back.
      if (moveClashes({ bookings: store.freshBookings(), bookingId: plan.row.BookingId })) {
        const oldToken = plan.response.old_token;
        store.updateBooking({ ...plan.row, TokenNumber: oldToken, Time: hhmm(slotMinutesOfDay(oldToken, config)) });
        return { ok: true, moved: false, reason: 'token_taken' };
      }
      return plan.response;
    }
    default:
      return { ok: false, message: 'Unknown function' };
  }
}

// @node-only-start
module.exports = { handleRequest };
// @node-only-end
