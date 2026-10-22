// Booking engine run inside the Apps Script lock: one request at a time, so no clash handling is needed.
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
  newHold,
  callerIdInfo,
} = require('../n8n/clinic-rules');
// @node-only-end

// store: { bookings(), holidays(), holds(), addBooking(row), addHold(hold), updateBooking(row) }
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
      if (decision.canBook) store.addBooking(decision.row);
      return decision.response;
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
      if (plan.canMove) store.updateBooking(plan.row);
      return plan.response;
    }
    default:
      return { ok: false, message: 'Unknown function' };
  }
}

// @node-only-start
module.exports = { handleRequest };
// @node-only-end
