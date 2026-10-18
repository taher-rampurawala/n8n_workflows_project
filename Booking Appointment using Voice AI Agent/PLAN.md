# Plan — Dental Clinic Appointment Booking with a Voice AI Agent

**Status (2026-10-18):** Phase 1 workflows built and deployed **inactive** (`Dental Voice Booking - Retell Webhook` `lHxWgkEL8UcweIDG`, `Dental Voice Booking - Error Alerts` `VvptA2WfaqA3OvDW`); clinic rules unit-tested in `n8n/clinic-rules.js`; Retell prompt files written in `retell/`. WhatsApp "Get Today's Bookings" date filter is live. Waiting on: sheet columns + Holidays tab, the two n8n credential values, WhatsApp `Channel` mapping, Retell agent creation (needs `RETELL_API_KEY`). Approved decisions from the grilling session on 2026-10-18.
**Signature check deviation from §4.5:** n8n blocks `$env` and the `crypto` module in Code nodes, so the HMAC is computed by the built-in **Crypto** node using a Crypto credential (HMAC secret = Retell API key) rather than in a Code node. Other small deviations: a bad signature answers 200 `{ok:false, message:"Unauthorized"}` (no alert email); the duplicate-token flag fails the execution after responding (so the Error Alerts email fires) instead of adding a `warning` field; the timezone is a fixed `tzOffsetMinutes: 330` (India has no DST); signatures older than 5 minutes are rejected.
**Inputs still pending:** extra services list, Bengali decision (see §9). Clinic facts, numbers and Retell API key received 2026-10-18.
**Based on:** `WhatsApp Doctor Appointment Booking/whatsapp-doctor-appointment-booking.json` (same clinic, same booking rules).

---

## 1. Goal

Patients phone the clinic, talk to **Riya** (a Retell AI voice agent), and book an evening appointment token. Riya asks an n8n webhook for availability and to make the booking; n8n is the single source of truth for slots and writes every booking to the **same Google Sheet tab the WhatsApp bot uses**, so both channels share the same 5 tokens per evening.

```
Caller ──► Retell (Riya: speech, Claude, voice)
              │  custom functions: check_availability, book_appointment
              ▼
           n8n webhook  POST /webhook/retell/dental-booking
              │  routes by function name, applies clinic rules
              ▼
           Google Sheet "Appointment Booking"
              ├─ Bookings  (shared with WhatsApp bot)
              ├─ Holidays  (new — extra closed dates)
              └─ Calls     (new, Phase 3 — call log)
```

---

## 2. Decisions (settled)

| # | Decision |
|---|---|
| Clinic & rules | Same clinic and rules as WhatsApp, kept as config: **5 tokens/evening, 7:00 PM start, 15 min apart (7:00–8:00 PM), no same-day booking after 5:00 PM**, timezone **Asia/Kolkata** |
| Scope v1 | Book, answer clinic questions (FAQ), transfer to staff. **Cancel/reschedule = v2** |
| Bookable dates | Any open day in the **next 7 days**; offer today/tomorrow first |
| Closed days | **Sunday** closed by default + optional **Holidays** tab |
| Direction | **Inbound only** (reminder calls = later) |
| Phone number | Test with Retell web calls + a Retell number; production Indian number via **SIP trunk** (Plivo / Exotel / Twilio) as a separate step |
| Language | English + Hindi/Hinglish — reply in the caller's language |
| Patient data | Name, age, reason; phone from caller ID `{{user_number}}` (confirmed, not asked). Reasons: Consultation, Fillings, Tooth extraction, Gum treatment, **Other** (short description) |
| Integration | 2 custom functions (`check_availability`, `book_appointment`) → **one** n8n webhook, routed by function name. `transfer_call`, `end_call` = Retell built-ins |
| Double-booking | Agent never chooses the token. n8n **recounts at booking time** and assigns token/time. Residual same-second race accepted for v1 + duplicate-token flag |
| Duplicate patient | One booking per phone number per day — return the existing booking instead |
| Security | Secret header check now; Retell signature check once API key arrives |
| Errors | Webhook always returns `200` with `{ok:false, message}` on failure; Error Trigger workflow emails the owner |
| Post-call | No WhatsApp confirmation in v1 (needs approved template → v2). Agent reads back token/date/time |
| Call log | Phase 3 (optional): Retell post-call webhook → **Calls** tab |
| Agent | **Multi-prompt**, persona **Riya**, female Indian-English voice (Hindi-capable), fast Claude (Haiku-class) model in Retell; fallback fastest GPT-mini if Claude not listed |
| Opening | AI + recording disclosure in the first line |
| Shared sheet | Reuse **Bookings** tab; add columns **Channel**, **CallId** |
| Build | After plan approval: create workflow via n8n MCP, keep **inactive** until tested, export JSON to this folder |

---

## 3. Phase 0 — Prepare the shared Google Sheet and fix the WhatsApp bug

Spreadsheet: **Appointment Booking** (`1bhlO4EFmgqcoXCNK4GrD6BSF-7izvMM1nsk1cgjAg9E`).

1. **Bookings tab** — append two columns after `BookedAt`:
   `Channel` (`WhatsApp` | `Voice`), `CallId` (Retell call id; blank for WhatsApp).
   Final columns: `Date | Time | TokenNumber | PatientName | Age | Reason | WhatsAppNumber | BookedAt | Channel | CallId`
   (`WhatsAppNumber` keeps its name so the WhatsApp workflow does not break; for voice it holds the caller's number.)
2. **Holidays tab** (new) — columns `Date` (yyyy-MM-dd) | `Note`. Any date listed is closed.
3. **Fix WhatsApp bug** — node **Get Today's Bookings** has *no date filter* (Get Tomorrow's does), so it counts all bookings ever; once 5 rows exist, today is always "full". Add `filtersUI`: `Date` = `{{ $now.setZone("Asia/Kolkata").toFormat("yyyy-MM-dd") }}`.
4. **WhatsApp Append Booking** — map `Channel = "WhatsApp"`.
5. Back up the workflow JSON before editing; test one WhatsApp booking end to end.

*Follow-up (not v1):* teach the WhatsApp flow about Sunday/Holidays so both channels agree on closed days.

---

## 4. Part 2 — n8n workflow: `Dental Voice Booking - Retell Webhook`

### 4.1 Retell request format (verify against Retell docs at build time)

Retell POSTs each custom-function call to the function URL with JSON roughly like:

```json
{
  "name": "check_availability",
  "args": { "requested_date": "2026-10-21" },
  "call": { "call_id": "abc123", "from_number": "+9198XXXXXXXX", "to_number": "...", "...": "..." }
}
```

The webhook's JSON response is handed back to the LLM as the function result, so responses are short, flat and speakable.

### 4.2 Node flow

```
Webhook (POST retell/dental-booking, Header Auth, respond via node)
  → Clinic Config (Set)            slots=5, startTime=19:00, slotMinutes=15, cutoffHour=17,
                                    closedWeekdays=[7], horizonDays=7, tz=Asia/Kolkata
  → Normalize Request (Code)       fnName, args, callId, callerNumber, nowIST
  → Route by Function (Switch on fnName)
      ├─ check_availability
      │    → Read Bookings (Sheets, all rows)  ┐ (onError → Error Response)
      │    → Read Holidays (Sheets)            ┘
      │    → Compute Availability (Code)
      │    → Respond: availability JSON
      ├─ book_appointment
      │    → Validate Booking Args (Code) ──invalid──► Respond {ok:false, message}
      │    → Read Bookings + Read Holidays (fresh read = recount)
      │    → Decide Booking (Code)        duplicate? closed? past cutoff? full? else next token/time
      │    → IF can book
      │         ├─ yes → Append Booking (Sheets, Channel=Voice, CallId) → Respond {ok:true, ...}
      │         └─ no  → Respond {ok:false, reason, next available}
      └─ fallback (unknown function) → Respond {ok:false, message:"Unknown function"}
Error Response (Respond 200 {ok:false, message:"System problem, please offer a transfer"})
```

Separate workflow **`Dental Voice Booking - Error Alerts`**: Error Trigger → email the owner at **taher.advisor@gmail.com** (workflow name, node, error, execution link). Set it as the main workflow's error workflow.

### 4.3 Clinic rules (implemented once, in Code nodes, driven by Clinic Config)

- **Slot times:** token *n* → `19:00 + (n-1) × 15 min` → 7:00, 7:15, 7:30, 7:45, 8:00 PM.
- **Day is bookable** when: within today … today+6, not a closed weekday, not in Holidays, bookings that date < 5, and (if today) current IST hour < 17.
- **Count bookings by Date** (filter rows where `Date == requested date`) — never count the whole sheet.
- **Next available:** scan forward from the requested date to the horizon; return the first bookable date.
- **Duplicate patient:** a row with same `WhatsAppNumber` (normalized, last 10 digits) and same `Date` → return that booking.
- **Duplicate-token flag:** after append, if two rows share Date+TokenNumber, include `warning` in the execution log and email (Error Alerts workflow) for manual fix.

### 4.4 Function contracts

**`check_availability`**

Args: `requested_date` (string, `yyyy-MM-dd`, optional — empty means "earliest available").

Responses:
```json
{ "ok": true, "available": true,  "date": "2026-10-21", "date_spoken": "Tuesday, the 21st of October",
  "token": 3, "time_spoken": "seven thirty PM", "slots_left": 3 }

{ "ok": true, "available": false, "reason": "full | closed | past_cutoff | out_of_range | invalid_date",
  "requested_date_spoken": "Sunday, the 19th of October",
  "next_available": { "date": "2026-10-20", "date_spoken": "Monday, the 20th of October", "time_spoken": "seven PM" } }
```
(`next_available` is `null` if nothing is free within 7 days.)

**`book_appointment`**

Args: `date` (yyyy-MM-dd, required), `patient_name` (≥2 chars), `age` (1–120), `reason` (one of the 5 labels), `reason_detail` (only for Other), `phone` (optional; defaults to caller ID).

Responses:
```json
{ "ok": true, "booked": true, "token": 3, "date_spoken": "Tuesday, the 21st of October",
  "time_spoken": "seven thirty PM", "reason": "Fillings" }

{ "ok": true, "booked": false, "reason": "already_booked", "token": 2, "date_spoken": "...", "time_spoken": "seven fifteen PM" }

{ "ok": true, "booked": false, "reason": "full | closed | past_cutoff",
  "next_available": { "date": "...", "date_spoken": "...", "time_spoken": "..." } }

{ "ok": false, "message": "Invalid age" }
```

Sheet row written (Bookings): `Date, Time (HH:mm), TokenNumber, PatientName, Age, Reason (incl. detail for Other), WhatsAppNumber (caller number), BookedAt (ISO), Channel=Voice, CallId`.

### 4.5 Security
- **Layer 1:** n8n Header Auth credential on the Webhook (e.g. `X-Clinic-Secret: <random>`); the same header is set on both Retell custom functions.
- **Layer 2 (API key now available — build in v1):** verify Retell's `x-retell-signature` (Code node, HMAC with the API key from the n8n credential, per current Retell docs) right after the Webhook, before routing; reject with `{ok:false}` if invalid. Signature uses the same key that created the agent (CLAUDE_TANGO_KEY), so regenerating the key means updating the n8n credential too.

### 4.6 Phase 1 tests (no Retell needed)
Send Retell-shaped POSTs to the **test** webhook URL:

| # | Case | Expect |
|---|---|---|
| 1 | Availability, open weekday | `available:true`, token = count+1 |
| 2 | Date already has 5 bookings | `full` + next_available |
| 3 | Sunday / Holidays date | `closed` + next_available |
| 4 | Today after 5 PM IST | `past_cutoff` + tomorrow (or next open) |
| 5 | Book same phone twice same day | second call → `already_booked` |
| 6 | Sheets failure (bad sheet id in a copy) | `{ok:false}` + error email |
| 7 | Missing/invalid secret header | rejected |
| 8 | Bad args (age 0, empty name) | `{ok:false, message}` |

Then verify a WhatsApp booking and a voice booking on the same date share the token count.

---

## 5. Part 1 — Retell AI voice agent "Riya"

Prompts are written with the **retell-voice-prompt** skill (identity → style → task breakdown → functions; multi-prompt rules; read-out rules).

### 5.1 Files (this folder)
```
retell/
├── universal.md          identity, style, speaking rules, language, silence, AI honesty
├── states/
│   ├── 01_intro.md       greeting + routing
│   ├── 02_booking.md     check_availability → collect details → book_appointment
│   ├── 03_faq.md         clinic facts (placeholders) only
│   ├── 04_transfer.md    transfer_call + fallback
│   └── 05_closing.md     anything else → end_call
├── functions.md          schemas, URLs, which state uses each
└── agent-settings.md     voice, model, timeouts, begin message, webhook
```

### 5.2 Universal prompt (how Riya speaks)
- **Identity:** Riya, virtual receptionist for **Smile Care Dental Clinic** in **Kolkata**; books evening appointments, answers clinic questions, connects to staff; no diagnosis or treatment advice.
- **Style:** 1–2 short sentences, one question at a time, warm, no formatting, never invent slots/prices.
- **Speaking rules:** `{{current_time_Asia/Kolkata}}`; 12-hour times with AM/PM ("seven fifteen PM"); dates spoken naturally; phone numbers in digit groups; prices in rupees.
- **Language:** reply in English, Hindi or Hinglish to match the caller.
- **Silence:** check in once, then close politely and end the call.
- **Safety:** dental emergency (heavy bleeding, facial swelling with fever, trauma) → advise calling 112 / nearest emergency department and offer transfer.
- **Honesty:** if asked, Riya says she is the clinic's virtual assistant.
- **Placeholders:** any `[BRACKET]` fact = unknown → offer transfer.

### 5.3 States
**01_intro** — Begin message:
> "Thank you for calling Smile Care Dental Clinic. This is Riya, the clinic's virtual assistant. This call may be recorded. How can I help you today?"

Transitions: booking intent → `booking`; questions about timings/location/fees/services → `faq`; human/emergency/complaint → `transfer`.

**02_booking** — task breakdown:
1. Ask preferred day ("Which day suits you? We see patients every evening from seven PM, Monday to Saturday."). Wait for user response.
2. Convert the day to `yyyy-MM-dd` using current IST time; call `check_availability` ("One moment while I check.").
   - available → offer the returned time and token; wait for user response.
   - not available → say why in plain words and offer `next_available`; wait for user response.
   - `ok:false` → apologize, offer transfer.
3. Ask full name (spell if unclear). Wait for user response.
4. Ask age. Wait for user response.
5. Ask reason: consultation, filling, tooth extraction, gum treatment, or something else (short description). Wait for user response.
6. Confirm phone: "I'll save the number you're calling from, ending in [last 4 digits of {{user_number}}] — is that right?" If no, take the number and read it back in groups.
7. Read back day, date and time; ask "Shall I book it?" Wait for user response.
8. Call `book_appointment`.
   - booked → "You're booked. Your token number is three, on Tuesday, the 21st of October, at seven thirty PM. Please arrive ten minutes early."
   - already_booked → tell them their existing token and time.
   - full/closed/past_cutoff → offer `next_available`, return to step 7.
   - `ok:false` / failure → never claim a booking; apologize and offer transfer.
   Rule: **never say an appointment is booked unless `book_appointment` returned `booked:true`.**

**03_faq** — facts block:

| Fact | Value | How Riya says it |
|---|---|---|
| Clinic | Smile Care Dental Clinic, Kolkata | "our clinic" after the first mention |
| Hours | Evenings, Monday to Saturday; appointment tokens 7:00–8:00 PM; closed Sunday | "We see patients every evening from seven PM, Monday to Saturday." |
| Address | Ground Floor, 111, Muzaffar Ahmed Street, Esplanade, off Park Street area, Kolkata, West Bengal 700016 | Area first ("Muzaffar Ahmed Street, near Park Street, Esplanade"); full address only if asked; PIN read digit by digit "seven zero zero - zero one six" |
| Landmark | Beside the Police Petrol Pump | "We're right beside the Police Petrol Pump." |
| Parking | Paid parking outside the clinic for two-wheelers and cars | "There's paid parking right outside for both bikes and cars." |
| Fees | ₹500 consultation; other treatment charges decided by the doctor after consultation | "The consultation is five hundred rupees. Charges for any treatment are decided by the doctor after the consultation." Never quote other prices. |
| Payment | Cash, UPI, cards | "We accept cash, UPI and cards." |
| Services | Consultation, fillings, tooth extraction, gum treatment `[+ ANY OTHER SERVICES?]` | — |

Unknown → offer transfer. Transition to `booking` if they want an appointment.

**04_transfer** — "Let me connect you to our reception." → `transfer_call` to **+91 91634 95068** (reception). If not answered / outside hours: "Sorry, no one is available right now. You can message us on WhatsApp at nine one six three - four nine five - zero seven zero, or I can book an appointment for you now." (Clinic WhatsApp: **+91 91634 95070**.)

**05_closing** — anything else? → goodbye → `end_call`.

`end_call` and `transfer_call` are attached to **every** state so silence and "talk to a human" rules work anywhere.

### 5.4 Functions in Retell
| Name | Type | Used in | Notes |
|---|---|---|---|
| `check_availability` | Custom (webhook) | booking | URL = n8n production webhook; header `X-Clinic-Secret`; speak during execution ("One moment…"); timeout ~10 s |
| `book_appointment` | Custom (webhook) | booking | same URL + header; speak during execution |
| `transfer_call` | Built-in Transfer Call | all states | destination **+919163495068** (reception) |
| `end_call` | Built-in End Call | all states | — |

Parameter JSON schemas mirror §4.4.

### 5.5 Agent settings
- Voice: female Indian-English, Hindi-capable (shortlist 2–3 in Retell dashboard).
- Model: fast Claude (Haiku-class) in Retell LLM; fallback fastest GPT-mini. Low temperature.
- Language: multilingual / English-India; interruption sensitivity medium; end call after ~20 s silence; max call 10 min.
- Post-call analysis fields (for Phase 3): `booked` (bool), `token`, `appointment_date`, `intent`, `transferred` (bool).
- Webhook URL (Phase 3): n8n call-log webhook.

### 5.6 Phase 2 tests (API key available)
Web-call scenarios: happy path; day full → next day; Sunday request; after 5 PM same-day; duplicate caller; Hindi caller; interrupts mid-sentence; asks a fee question; asks for a human; stays silent; n8n down (`ok:false`). Check the sheet row and Retell transcript for each.

---

## 6. Phase 3 (optional) — Call log
Workflow **`Dental Voice Booking - Call Log`**: Webhook (Retell agent webhook, `call_analyzed` event) → Set → Append to **Calls** tab: `CallId, StartedAt, From, DurationSec, Booked, Token, AppointmentDate, Transferred, Summary`. Verify signature once the API key exists.

## 7. Phase 4 — Production phone number
1. Choose carrier with Indian DIDs and SIP trunking (Plivo / Exotel / Twilio) and confirm AI/automated calls are permitted.
2. Configure the SIP trunk in Retell; import the number; bind it to Riya (published version).
3. Test calls from Jio/Airtel/Vi mobiles and a landline.

---

## 8. Build order & checklist
1. Phase 0 — sheet columns, Holidays tab, WhatsApp bug fix (+ Channel mapping).
2. Phase 1 — n8n workflow (inactive) + Error Alerts workflow; run the 8 tests; export JSON to `n8n/`.
3. Write `retell/` prompt files with the retell-voice-prompt skill; fill placeholders with the clinic.
4. Set `RETELL_API_KEY` locally and the n8n Retell credential; create functions, LLM and agent in Retell (setup script reading the env var); signature verification is already in the Phase 1 workflow; activate n8n workflow; Phase 2 tests.
5. Phase 3 call log (optional).
6. Phase 4 Indian number; go live with monitoring (Retell call history + Calls tab + error emails).

## 9. Inputs

**Provided (2026-10-18):**
| Input | Value |
|---|---|
| Clinic name / city | Smile Care Dental Clinic, Kolkata |
| Address | Ground Floor, 111, Muzaffar Ahmed St, Esplanade, off Park Street area, Kolkata, West Bengal 700016 |
| Landmark | Beside the Police Petrol Pump |
| Parking | Paid parking outside, two-wheelers and cars |
| Fees | ₹500 consultation; other charges decided by the doctor after consultation |
| Payment | Cash, UPI, cards |
| Reception (transfer) | +91 9163495068 |
| Clinic WhatsApp | +91 9163495070 |
| Error-alert email | taher.advisor@gmail.com |
| Retell API key | Received — Retell key named **CLAUDE_TANGO_KEY**. Value is **never** stored in this repo. |

**Where the API key lives:**
- **Local machine** — Windows user env var `RETELL_API_KEY` (used by the Retell setup script in Phase 2).
- **n8n** — a credential (Header Auth or generic credential named `Retell API - CLAUDE_TANGO_KEY`) used by the signature-check Code node and the call-log workflow. Not hard-coded in any node.
- `.gitignore` already must exclude any `.env`; no key in `retell/` or `n8n/` exports (check exported JSON before committing).
- The key was shared in a chat transcript; regenerate it in the Retell dashboard before go-live and update both places.

**Still needed:**
- Any services beyond consultation, fillings, extraction, gum treatment (e.g. cleaning, root canal, braces).
- Confirm: clinic open only evenings Mon–Sat, closed Sunday; keep "please arrive ten minutes early".
- Holidays for the next few months (optional).
- Whether Riya should also speak **Bengali** (see note below).

## 10. Out of scope for v1 (backlog)
Cancel/reschedule (needs BookingId + Status columns) · WhatsApp confirmation template after booking · outbound reminder calls · closed-day support in the WhatsApp flow · moving bookings from Sheets to a database if volume grows.
