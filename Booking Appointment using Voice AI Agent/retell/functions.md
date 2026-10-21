# Functions — Riya (Smile Care Dental Clinic)

Both custom functions POST to the **same** n8n webhook, which routes by the function `name`.

- **URL (production):** `https://n8n.srv1789828.hstgr.cloud/webhook/retell/dental-booking`
- **URL (testing, while the n8n editor is listening):** `https://n8n.srv1789828.hstgr.cloud/webhook-test/retell/dental-booking`
- **Method:** POST, **Payload: args only** = OFF (n8n needs `name` and `call`)
- **Header:** `X-Clinic-Secret: <same value as the n8n credential "Retell Webhook - X-Clinic-Secret">`
- **Signature:** Retell adds `X-Retell-Signature`; n8n verifies it with the Retell API key (n8n Crypto credential "Retell API - CLAUDE_TANGO_KEY").
- **Timeout:** 10000 ms · **Retries:** 0 (`book_appointment` is not idempotent)
- **Speak during execution:** on; **speak after execution:** on

The webhook always answers HTTP 200 with JSON (a bad signature gets `{ok:false, message:"Unauthorized"}`). `ok: false` means "apologize and offer a transfer" unless the message names a detail to re-ask.

| Name | Type | States | Purpose |
|---|---|---|---|
| `check_availability` | Custom (n8n webhook) | booking | Next token and time for a day, or why it's unavailable plus the next open slot |
| `book_appointment` | Custom (n8n webhook) | booking | Books a token; n8n recounts and assigns the token and time |
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
  "token": 3, "time_spoken": "seven thirty PM", "slots_left": 3 }

{ "ok": true, "available": false, "reason": "not_today | before_opening | past_cutoff | full | closed | past_date | invalid_date",
  "requested_date_spoken": "Tuesday, the 20th of October",
  "call_back_spoken": "tomorrow after nine AM" }
```
Only today, from 9 AM to 5 PM IST, is bookable. `call_back_spoken` is "today after nine AM" (before opening), the asked-for day (`not_today`), or the next open day (`past_cutoff`, `full`, `closed`), e.g. "on Monday, the 26th of October, after nine AM"; it is `null` for `past_date` / `invalid_date`. `requested_date_spoken` is `null` for `invalid_date`.

## `book_appointment`

**Description (shown to the LLM):** Book today's appointment after the caller has confirmed the name spelling, age, reason and phone number. The clinic system assigns the token and time and returns the saved name and number to read back.

```json
{
  "type": "object",
  "properties": {
    "date": { "type": "string", "description": "Today's date as yyyy-MM-dd (the date returned by check_availability)." },
    "patient_name": { "type": "string", "description": "Patient's full name, exactly as the caller confirmed the spelling letter by letter." },
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

{ "ok": true, "booked": false, "reason": "not_today | before_opening | past_cutoff | full | closed | past_date | invalid_date",
  "call_back_spoken": "tomorrow after nine AM" }

{ "ok": false, "message": "Invalid date | Invalid name | Invalid age | Invalid reason | Please describe the reason | Invalid phone number" }

{ "ok": false, "message": "System problem, please offer a transfer" }
```

The sheet row written: `Date, Time (HH:mm), TokenNumber, PatientName, Age, Reason, WhatsAppNumber (91 + 10 digits), BookedAt (ISO), Channel = Voice, CallId`.
