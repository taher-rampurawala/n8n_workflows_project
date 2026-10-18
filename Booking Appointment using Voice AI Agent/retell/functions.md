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

**Description (shown to the LLM):** Check the next free appointment token for a day. Call this after the caller chooses a day, before offering any time.

```json
{
  "type": "object",
  "properties": {
    "requested_date": {
      "type": "string",
      "description": "The day the caller wants, as yyyy-MM-dd in Asia/Kolkata time. Use an empty string if the caller wants the earliest available day."
    }
  },
  "required": ["requested_date"]
}
```

Responses:
```json
{ "ok": true, "available": true, "date": "2026-10-20", "date_spoken": "Tuesday, the 20th of October",
  "token": 3, "time_spoken": "seven thirty PM", "slots_left": 3 }

{ "ok": true, "available": false, "reason": "full | closed | past_cutoff | out_of_range | invalid_date",
  "requested_date_spoken": "Sunday, the 25th of October",
  "next_available": { "date": "2026-10-26", "date_spoken": "Monday, the 26th of October", "time_spoken": "seven PM" } }
```
`next_available` is `null` when nothing is free within 7 days. `requested_date_spoken` is `null` for `invalid_date`.

## `book_appointment`

**Description (shown to the LLM):** Book the appointment after the caller has confirmed the day, name, age, reason and phone number. The clinic system assigns the token and time.

```json
{
  "type": "object",
  "properties": {
    "date": { "type": "string", "description": "Appointment day as yyyy-MM-dd (the date returned by check_availability)." },
    "patient_name": { "type": "string", "description": "Patient's full name." },
    "age": { "type": "integer", "description": "Patient's age in years, 1 to 120." },
    "reason": {
      "type": "string",
      "enum": ["Consultation", "Fillings", "Tooth extraction", "Gum treatment", "Other"],
      "description": "Reason for the visit."
    },
    "reason_detail": { "type": "string", "description": "Short description, only when reason is Other. Otherwise empty." },
    "phone": { "type": "string", "description": "Only if the caller gave a different number from the one they are calling from. Otherwise empty." }
  },
  "required": ["date", "patient_name", "age", "reason"]
}
```

Responses:
```json
{ "ok": true, "booked": true, "token": 3, "date_spoken": "Tuesday, the 20th of October",
  "time_spoken": "seven thirty PM", "reason": "Fillings" }

{ "ok": true, "booked": false, "reason": "already_booked", "token": 2,
  "date_spoken": "Tuesday, the 20th of October", "time_spoken": "seven fifteen PM" }

{ "ok": true, "booked": false, "reason": "full | closed | past_cutoff | out_of_range",
  "next_available": { "date": "...", "date_spoken": "...", "time_spoken": "..." } }

{ "ok": false, "message": "Invalid date | Invalid name | Invalid age | Invalid reason | Please describe the reason | Invalid phone number" }

{ "ok": false, "message": "System problem, please offer a transfer" }
```

The sheet row written: `Date, Time (HH:mm), TokenNumber, PatientName, Age, Reason, WhatsAppNumber (91 + 10 digits), BookedAt (ISO), Channel = Voice, CallId`.
