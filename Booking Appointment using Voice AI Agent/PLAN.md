# Plan — Dental Clinic Appointment Booking with a Voice AI Agent

**Status (2026-10-22):** Live for testing. Riya (Retell) books, finds, cancels and moves same-day tokens through an n8n webhook that forwards every request to a Google Apps Script booking engine on the shared Google Sheet. All parts are deployed and match this folder. **Not yet done:** publish the Retell agent (dashboard test calls use the draft), connect an Indian phone number, optional call log.

**Clinic:** Smile Care Dental Clinic, Kolkata (the WhatsApp bot for the same sheet keeps the name "Dentoshine Clinic" — decided 2026-10-19).

---

## 1. Goal

Patients phone the clinic, talk to **Riya** (a Retell AI voice agent), and book an evening appointment token for **today**. Riya never decides availability herself: every check and change goes to one booking engine, which writes to the **same Google Sheet tab the WhatsApp bot uses**, so both channels share the same 5 tokens per evening.

```
Caller ──► Retell: Riya (Claude Sonnet, multi-prompt, ElevenLabs voice)
              │  custom functions: check_availability · book_appointment
              │                    find_booking · cancel_booking · move_booking
              ▼
           n8n webhook  POST /webhook/retell/dental-booking   (11 nodes)
              │  X-Clinic-Secret header + X-Retell-Signature HMAC check, then forward
              ▼
           Google Apps Script web app  "Smile Care Booking Engine"
              │  LockService script lock → one request at a time
              ▼
           Google Sheet "Appointment Booking"
              ├─ Bookings  (shared with the WhatsApp bot)
              ├─ Holidays  (extra closed dates)
              └─ Holds     (hidden; 2-minute token holds)
```

---

## 2. Decisions

| Topic | Decision |
|---|---|
| Tokens | 5 per evening from 7:00 PM, 15 minutes apart (7:00–8:00 PM), timezone Asia/Kolkata |
| Bookable dates | **Same day only, 9 AM–5 PM IST** (2026-10-21). Any other day → "please call on that day after nine AM"; the engine returns the spoken call-back day |
| Closed days | Sunday, plus any date in the **Holidays** tab |
| Scope | Book, answer clinic questions, find / cancel / move today's booking, transfer to reception. Changing a booking's name, age, reason or phone → reception |
| Duplicates | Same patient name **and** same phone on the same day → "already booked". One phone can book several family members |
| Token choice | Never by the agent. The engine gives the lowest free token; a cancelled token is reused |
| Two callers at once | Engine runs under Google's `LockService` script lock, so requests queue and never share a token (2026-10-22) |
| Slot hold | An offered token is held for the caller for **2 minutes** while they give details; others are offered the next token. If every free token is held: "call back in a couple of minutes" |
| Patient data | Name (spelled back and confirmed), age, reason (Consultation, Fillings, Tooth extraction, Gum treatment, Other + short description), mobile number |
| Phone number | Caller ID offered first when available; otherwise asked once. Digits are read back; the engine checks there are exactly 10 |
| Read-back | After booking, Riya reads the saved name and number from the engine's reply, so a mis-copied detail is caught on the call |
| Errors | The webhook always answers HTTP 200 JSON. Engine or network failure → `{ok:false}` (Riya never claims a booking, offers transfer) and the Error Alerts workflow emails the owner |
| Agent | Multi-prompt, persona **Riya**, `claude-5.5-sonnet`, voice `11labs-Monika` at low voice temperature (calm, never excited), English + Hindi/Hinglish |
| Conversation rules | Yield to interruptions and continue from the caller's input; never narrate reasoning; never promise an action without a function for it |
| WhatsApp bot | Unchanged except the date-filter fix and `Channel = WhatsApp`. It does not see voice holds and counts cancelled rows (conservative) — decided 2026-10-21 |

---

## 3. Components

### 3.1 Google Sheet — "Appointment Booking" (`1bhlO4EFmgqcoXCNK4GrD6BSF-7izvMM1nsk1cgjAg9E`)
- **Bookings** (gid `1583914306`): `Date | Time | TokenNumber | PatientName | Age | Reason | WhatsAppNumber | BookedAt | Channel | CallId | Status | BookingId`. Voice rows: `Channel = Voice`, `Status = Active/Cancelled`, a `BookingId`. Blank `Status` (WhatsApp rows) counts as active. Cancelled rows stay, so the token can be reused.
- **Holidays**: `Date (yyyy-MM-dd, plain text) | Note`.
- **Holds**: created and hidden by the engine; old days are deleted automatically.

### 3.2 Booking engine — Google Apps Script web app
- Code: `apps-script/Code.gs`, **generated** by `apps-script/build-apps-script.js` from
  `n8n/clinic-rules.js` (rules, tested), `apps-script/booking-engine.js` (request handler, tested) and `apps-script/sheet-adapter.gs.js` (web app entry, lock, sheet reads/writes).
- Deployed as a web app (Execute as: Me, Who has access: Anyone). URL: `https://script.google.com/macros/s/AKfycbxOn15nLc9KAo9-ElAUZrohvihRpfYziU4pe4NUx8WTF-Khx9KHIef30j7vyUiKEr4pfA/exec`.
- Requests must carry `?key=<SECRET>` (Script Property `SECRET`). `GET` on the URL is a health check that reports the deployed **version** (content hash of `Code.gs`).
- Writes strings as plain text, so Sheets never reformats dates/times and a name can never become a formula.

### 3.3 n8n — `Dental Voice Booking - Retell Webhook` (`lHxWgkEL8UcweIDG`, 11 nodes)
Webhook (Header Auth `X-Clinic-Secret`, raw body) → Prepare Signature → Compute HMAC (Crypto credential = Retell API key) → Signature Valid? → Normalize Request → Call Booking Engine (HTTP POST, Query Auth credential, 25 s timeout) → Engine Error? → Respond Result, or Respond System Error → Raise Error Alert.
Generated by `n8n/build-workflows.js`. Error workflow: `Dental Voice Booking - Error Alerts` (`VvptA2WfaqA3OvDW`, emails taher.advisor@gmail.com). Both must stay **published**.

### 3.4 Retell — Riya (agent `agent_e99b2cdd4f4da3d2c9f4e7cd8c`, LLM `llm_4e575cbe0649e32ca888e725d0f1`)
- Prompts: `retell/universal.md` (identity, style, clinic facts, read-out rules, interruptions, safety) and `retell/states/` — `intro`, `booking`, `faq`, `manage_booking` (find / cancel / move), `transfer`, `closing`.
- Functions and replies: `retell/functions.md` (the setup script reads the JSON schemas from it). `transfer_call` (to +91 91634 95068) and `end_call` are Retell built-ins in every state.
- Settings: `retell/agent-settings.md`. `retell/setup-retell.js` creates or updates the LLM and agent from these files (ids in `retell/retell-ids.json`).

---

## 4. Clinic rules (in `n8n/clinic-rules.js`)
- Token *n* → `19:00 + (n-1) × 15 min`; times and dates are returned already in spoken form ("seven thirty PM", "Thursday, the 22nd of October").
- A day is bookable only if it is today, open (not Sunday / not a holiday), between 9 AM and 5 PM IST, and has a free token not held by another caller.
- Refusal reasons: `not_today`, `before_opening`, `past_cutoff`, `full`, `all_held`, `closed`, `past_date`, `invalid_date` — each with `call_back_spoken` where it makes sense.
- Booking validation: real date, name ≥ 2 characters and written as words (spelled letters are rejected so the agent resends), age 1–120, one of the five reasons, phone exactly 10 digits after removing +91 / 0 (an extra or missing digit is refused, never trimmed).
- Cancel and move only for today's active booking made with the same phone; bookings without a `BookingId` (WhatsApp) go to reception. Move goes to the earliest free token by default, or a named token.

---

## 5. Security
- Webhook: `X-Clinic-Secret` Header Auth credential, plus Retell's `X-Retell-Signature` (HMAC-SHA256 of raw body + timestamp, ≤ 5 minutes old) checked with the built-in Crypto node, because this n8n instance blocks `$env` and the `crypto` module in Code nodes. A bad signature gets `{ok:false, message:"Unauthorized"}`.
- Engine: only answers requests carrying its own secret.
- Where secrets live (never in this repo): Windows user env vars `RETELL_API_KEY`, `CLINIC_WEBHOOK_SECRET`, `BOOKING_SCRIPT_SECRET`; n8n credentials "Retell Webhook - X-Clinic-Secret", "Retell API - CLAUDE_TANGO_KEY" (Crypto), "Booking Engine - Apps Script" (Query Auth); Apps Script property `SECRET`. The Retell key must carry Retell's **webhook** badge (it signs requests).
- The Retell key was shared in a chat transcript: regenerate it before go-live and update the env var and the Crypto credential.

---

## 6. How to change and redeploy
1. Edit the source files (`n8n/clinic-rules.js`, `apps-script/booking-engine.js`, `apps-script/sheet-adapter.gs.js`, `retell/*`).
2. Run the tests: `node --test "Booking Appointment using Voice AI Agent/n8n/clinic-rules.test.js" "Booking Appointment using Voice AI Agent/apps-script/booking-engine.test.js"`.
3. Rules or engine changed → `node "Booking Appointment using Voice AI Agent/apps-script/build-apps-script.js"`, paste `Code.gs` into the Apps Script editor, then **Deploy → Manage deployments → pencil → Version: New version → Deploy**. Check the version at the web app URL matches the build output.
4. n8n changed → `node "Booking Appointment using Voice AI Agent/n8n/build-workflows.js"`, update the workflow and re-publish it.
5. Prompts or agent settings changed → `node "Booking Appointment using Voice AI Agent/retell/setup-retell.js"` (needs `RETELL_API_KEY` and `CLINIC_WEBHOOK_SECRET`), then publish the agent for real phone calls.
6. Live tests after 5 PM IST need a temporary webhook copy with the cutoff disabled; delete it afterwards and cancel TEST rows.

---

## 7. Testing done
- **Unit tests:** 46 `node:test` cases (rules + engine) — availability, same-day window, holidays, holds, duplicates, family bookings, cancel, move, phone and name validation.
- **Live, 2026-10-19 → 22:** security (no secret → 403, bad signature refused), same-day rule, family bookings, duplicate refusal, find / cancel / move, move into a just-freed token, 2-minute holds, and simultaneous callers (five at once got distinct tokens or a correct "full").
- **Voice test calls** found and fixed: wrong signing key, slow Sheets causing false "booking failed", fee and address unavailable mid-booking, name spelling and digit errors, the agent counting digits, reasoning spoken aloud, and cancel-then-move needing one step.

---

## 8. Next steps
1. A real test call on the current version, then **publish the Retell agent**.
2. **Indian phone number:** choose a carrier with Indian numbers and SIP trunking (Plivo / Exotel / Twilio), confirm AI calls are permitted, connect the SIP trunk in Retell, bind the number to the published agent, test from Jio / Airtel / Vi and a landline.
3. Regenerate the Retell API key before go-live (see §5).
4. Optional **call log**: Retell `call_analyzed` webhook → a **Calls** tab (`CallId, StartedAt, From, DurationSec, Booked, Token, AppointmentDate, Transferred, Summary`). Post-call fields are already configured on the agent.
5. Optional clean-up: delete the unused n8n data table "Voice Slot Holds" (`ObMZfME6VuEdGL6a`).

## 9. Open questions
- Should Riya also speak **Bengali**?
- Confirm "please arrive ten minutes early" stays in the booking confirmation.

## 10. Backlog
WhatsApp or SMS confirmation after booking · callback reminders for callers told to call back · changing a booking's details by voice · the WhatsApp bot using the same engine (holds, cancelled rows) · automated Retell test calls · Bengali.

---

## Change log
- **2026-10-18** Plan approved; n8n webhook, Error Alerts and Retell prompts built; WhatsApp "today's bookings" date filter fixed.
- **2026-10-19** Live tests; Riya created in Retell; Sheets-failure bug fixed; `Channel = WhatsApp` added.
- **2026-10-21** Same-day booking only (9 AM–5 PM); Sonnet model and calm voice; interruption rules; family bookings; cancel by voice; 2-minute holds; name, phone and read-back fixes from test calls.
- **2026-10-22** Move booking to an earlier time; booking engine moved to Google Apps Script with `LockService`; n8n webhook reduced to 11 nodes.
