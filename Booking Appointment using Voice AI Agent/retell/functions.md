# Functions — Riya (Smile Care Dental Clinic)

All custom functions POST to the **same** n8n webhook. n8n verifies the request and forwards it to the Apps Script booking engine on the booking sheet, which handles every function under a script lock (one request at a time).

- **URL (production):** `https://n8n.srv1789828.hstgr.cloud/webhook/retell/dental-booking`
- **URL (testing, while the n8n editor is listening):** `https://n8n.srv1789828.hstgr.cloud/webhook-test/retell/dental-booking`
- **Method:** POST, **Payload: args only** = OFF (n8n needs `name` and `call`)
- **Header:** `X-Clinic-Secret: <same value as the n8n credential "Retell Webhook - X-Clinic-Secret">`
- **Signature:** Retell adds `X-Retell-Signature`; n8n verifies it with the Retell API key (n8n Crypto credential "Retell API - CLAUDE_TANGO_KEY").
- **Timeout:** 30000 ms (Sheets reads sometimes take 10+ s) · **Retries:** 0 in Retell; the prompt retries `book_appointment` once after a failure, which is safe because a repeat returns `already_booked`
- **Speak during execution:** on; **speak after execution:** on

The webhook always answers HTTP 200 with JSON (a bad signature gets `{ok:false, message:"Unauthorized"}`). `ok: false` means "apologize and offer a transfer" unless the message names a detail to re-ask.

| Name | Type | States | Purpose |
|---|---|---|---|
| `check_availability` | Custom (n8n webhook) | booking | Next token and time for a day, or why it's unavailable plus the next open slot |
| `book_appointment` | Custom (n8n webhook) | booking | Books a token; n8n recounts and assigns the token and time |
| `find_booking` | Custom (n8n webhook) | manage_booking | Today's active bookings made with a phone number |
| `cancel_booking` | Custom (n8n webhook) | manage_booking | Cancels one of today's bookings by token; frees the token |
| `move_booking` | Custom (n8n webhook) | manage_booking | Moves one of today's bookings to another free token (earliest by default) |
| `transfer_call` | Retell built-in Transfer Call | all | Connects to reception **+919163495068** |
| `end_call` | Retell built-in End Call | all | Hangs up |

## `check_availability`

**Description (shown to the LLM):** Check today's next free appointment token. Bookings are same-day only, so for any other day it returns why and when the caller should call back. Call this before offering any time.

```json
{
  "type": "object",
  "properties": {
    "requested_date": {
      "type": "string",
      "description": "The day the caller asked for, as yyyy-MM-dd in Asia/Kolkata time. Use an empty string for today."
    }
  },
  "required": ["requested_date"]
}
```

Responses:
```json
{ "ok": true, "available": true, "date": "2026-10-19", "date_spoken": "Monday, the 19th of October",
  "token": 3, "time_spoken": "seven thirty PM", "slots_left": 3,
  "caller_id_available": true, "caller_id_last4_spoken": "five five four zero" }

{ "ok": true, "available": false, "reason": "not_today | before_opening | past_cutoff | full | all_held | closed | past_date | invalid_date",
  "requested_date_spoken": "Tuesday, the 20th of October",
  "call_back_spoken": "tomorrow after nine AM" }
```
Only today, from 9 AM to 5 PM IST, is bookable. An offered token is **held for this call for 2 minutes** in the hidden `Holds` tab of the booking sheet; other callers are offered other tokens, and `all_held` (call back "in a couple of minutes") means every free token is held by someone else. `book_appointment` uses the call's own hold. `call_back_spoken` is "today after nine AM" (before opening), the asked-for day (`not_today`), or the next open day (`past_cutoff`, `full`, `closed`), e.g. "on Monday, the 26th of October, after nine AM"; it is `null` for `past_date` / `invalid_date`. `requested_date_spoken` is `null` for `invalid_date`. Every `check_availability` reply also carries `caller_id_available` and `caller_id_last4_spoken` (`null` on web calls or withheld numbers).

## `book_appointment`

**Description (shown to the LLM):** Book today's appointment after the caller has confirmed the name spelling, age, reason and phone number. The clinic system assigns the token and time and returns the saved name and number to read back.

```json
{
  "type": "object",
  "properties": {
    "date": { "type": "string", "description": "Today's date as yyyy-MM-dd (the date returned by check_availability)." },
    "patient_name": { "type": "string", "description": "Patient's full name in normal words with capital first letters, using the spelling the caller confirmed, e.g. Saifuddin Rampurawala. Never spelled out as letters." },
    "age": { "type": "integer", "description": "Patient's age in years, 1 to 120." },
    "reason": {
      "type": "string",
      "enum": ["Consultation", "Fillings", "Tooth extraction", "Gum treatment", "Other"],
      "description": "Reason for the visit."
    },
    "reason_detail": { "type": "string", "description": "Short description, only when reason is Other. Otherwise empty." },
    "phone": { "type": "string", "description": "The ten digits you read back to the caller, separated by spaces, e.g. 9 7 4 8 7 8 5 5 4 0. Empty only if the caller confirmed the number they are calling from." }
  },
  "required": ["date", "patient_name", "age", "reason"]
}
```

Responses:
```json
{ "ok": true, "booked": true, "token": 3, "date_spoken": "Monday, the 19th of October",
  "time_spoken": "seven thirty PM", "reason": "Fillings",
  "patient_name": "Ravi Kumar", "phone_spoken": "nine eight three - zero zero one - two three four five" }

{ "ok": true, "booked": false, "reason": "already_booked", "token": 2,
  "date_spoken": "Monday, the 19th of October", "time_spoken": "seven fifteen PM" }

{ "ok": true, "booked": false, "reason": "not_today | before_opening | past_cutoff | full | all_held | closed | past_date | invalid_date",
  "call_back_spoken": "tomorrow after nine AM" }

{ "ok": false, "message": "Invalid date | Invalid name | Name sent as letters: … | Invalid age | Invalid reason | Please describe the reason | Invalid phone number: need 10 digits, got N" }

{ "ok": false, "message": "System problem, please offer a transfer" }
```

## `find_booking`

**Description (shown to the LLM):** Find today's active bookings made with a phone number, before cancelling one. Leave phone empty to use the number the caller is calling from.

```json
{
  "type": "object",
  "properties": {
    "phone": { "type": "string", "description": "Only if the booking was made with a different number: the digits read back to the caller, separated by spaces, e.g. 9 1 6 3 4 9 5 0 6 8. Otherwise empty." }
  },
  "required": []
}
```

Responses:
```json
{ "ok": true, "bookings": [ { "token": 1, "patient_name": "Ravi Kumar", "time_spoken": "seven PM" } ] }

{ "ok": false, "message": "Invalid phone number: need 10 digits, got 0" }
```

## `cancel_booking`

**Description (shown to the LLM):** Cancel one of today's bookings by its token number, after the caller has confirmed which one. Use the same phone as for find_booking.

```json
{
  "type": "object",
  "properties": {
    "token": { "type": "integer", "description": "Token number of the booking to cancel, from find_booking." },
    "phone": { "type": "string", "description": "The same phone value used for find_booking (empty for the caller's own number)." }
  },
  "required": ["token"]
}
```

Responses:
```json
{ "ok": true, "cancelled": true, "token": 2, "patient_name": "Ravi Kumar", "time_spoken": "seven fifteen PM" }

{ "ok": true, "cancelled": false, "reason": "not_found | needs_reception" }
```
`needs_reception`: the booking has no BookingId (made on WhatsApp or before cancelling existed). Cancelled rows stay in the sheet with `Status = Cancelled`; the token is reused by the next booking.

## `move_booking`

**Description (shown to the LLM):** Move one of today's bookings to another free time today, for example to an earlier token that was just freed. Use this to change a time; never cancel and re-book.

```json
{
  "type": "object",
  "properties": {
    "token": { "type": "integer", "description": "Current token number of the booking, from find_booking." },
    "to_token": { "type": "integer", "description": "Only if the caller named a time: 1 = seven PM, 2 = seven fifteen, 3 = seven thirty, 4 = seven forty-five, 5 = eight PM. Leave empty for the earliest free time." },
    "phone": { "type": "string", "description": "The same phone value used for find_booking (empty for the caller's own number)." }
  },
  "required": ["token"]
}
```

Responses:
```json
{ "ok": true, "moved": true, "old_token": 2, "token": 1, "patient_name": "Saifuddin Rampurawala", "time_spoken": "seven PM" }

{ "ok": true, "moved": false, "reason": "no_earlier_slot | token_taken | not_found | needs_reception" }
```
Tokens booked or held by other callers are skipped. The move runs under the engine's lock, so no other booking can land on that token at the same moment.

The sheet row written: `Date, Time (HH:mm), TokenNumber, PatientName, Age, Reason, WhatsAppNumber (91 + 10 digits), BookedAt (ISO), Channel = Voice, CallId, Status = Active, BookingId`.
