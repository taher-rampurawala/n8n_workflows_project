# Plan — Dental Clinic Appointment Booking with a Telnyx Voice Agent

**Status (2026-10-22):** Plan approved; building. Decisions 1–4 confirmed 2026-10-22; the phone number (decision 5) is decided at go-live.

**Based on:** `Booking Appointment using Voice AI Agent/` (the Retell agent "Riya"). Same clinic, same rules, and the **same Google Apps Script booking engine and Google Sheet**, so Retell callers, Telnyx callers and the WhatsApp bot all share the same 5 tokens per evening and can never be given the same token.

**Clinic:** Smile Care Dental Clinic, Kolkata.

---

## 1. Goal

Patients phone the clinic and talk to **Riya on Telnyx**: a Telnyx AI Assistant with the same persona, rules and behaviour as the Retell agent. She books same-day evening tokens, answers clinic questions, finds / cancels / moves today's booking, and transfers to reception. Every check and change goes to the existing booking engine.

```
Caller ──► Telnyx AI Assistant "Riya" (Telnyx number or web call)
              │  webhook tools: check_availability · book_appointment
              │                 find_booking · cancel_booking · move_booking
              │  built-in tools: transfer (reception) · hangup
              ▼
           n8n webhook  POST /webhook/telnyx/dental-booking?fn=<function>   (new workflow)
              │  X-Clinic-Secret header check, then build { fnName, args, callId, callerNumber }
              ▼
           Google Apps Script booking engine  (unchanged, shared with the Retell agent)
              │  LockService script lock → one request at a time
              ▼
           Google Sheet "Appointment Booking" — Bookings · Holidays · Holds (hidden)
```

---

## 2. What is reused and what is new

| Part | Reused as is | New for Telnyx |
|---|---|---|
| Booking rules and engine | ✅ `apps-script/Code.gs`, same web app URL and secret | Only if the Channel label changes (§3, decision 4): engine accepts a `channel` field, redeploy as a new version |
| Google Sheet | ✅ Bookings, Holidays, Holds | — |
| n8n Error Alerts workflow | ✅ `Dental Voice Booking - Error Alerts` | — |
| Riya's prompts | ✅ content from `../Booking Appointment using Voice AI Agent/retell/` | A single **instructions** prompt generated from those files (Telnyx has one prompt, not states), so both agents follow the same rules |
| Function schemas | ✅ from `retell/functions.md` | Mapped to Telnyx webhook tools |
| n8n webhook | — | New workflow `Dental Voice Booking - Telnyx Webhook` (~8 nodes) |
| Agent | — | Telnyx AI Assistant created by a setup script (`telnyx/setup-telnyx.js`) |

---

## 3. Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Model ✅ | `anthropic/claude-haiku-4-5` — built into Telnyx, no extra key. The exact-detail problems seen with Haiku on Retell (digit counting, name copying) are now handled by the engine's validation and read-back. Alternative: `openai/gpt-4o` with your OpenAI key stored as a Telnyx integration secret |
| 2 | Voice ✅ | An Azure Indian-English female voice built into Telnyx (e.g. `en-IN-NeerjaNeural`, Hindi-capable alternative checked at build time from Telnyx's voices API), calm and steady. Alternative: ElevenLabs "Monika" (same as Retell) — needs your ElevenLabs API key |
| 3 | Speech-to-text | `deepgram/nova-3`, recommended by Telnyx for mixed English / Hindi, with clinic key terms boosted |
| 4 | Channel label ✅ | Write `Channel = Telnyx Voice` (Retell keeps `Voice`) so the sheet shows which agent booked. Needs a one-line engine change and an Apps Script redeploy |
| 5 | Phone number (at go-live) | Test with Telnyx web calls first. Indian numbers on Telnyx need regulatory documents and may not allow inbound AI calls; check availability before go-live, otherwise use a Telnyx number elsewhere or a SIP trunk from an Indian carrier |
| 6 | Rules | Identical to the Retell agent: same day only 9 AM–5 PM IST, Sundays and Holidays closed, 5 tokens from 7 PM, family bookings, duplicate = same name and phone, 2-minute holds, cancel and move today's booking |
| 7 | Transfer | Telnyx transfer tool to reception **+91 91634 95068**, `from` = the assistant's number |
| 8 | Behaviour | Same conversation rules as Retell: calm and never excited, yield to interruptions, never narrate reasoning, AI + recording disclosure in the greeting, emergency guidance |

---

## 4. How Telnyx calls our webhook (verified in Telnyx's OpenAPI spec)

- A **webhook tool** has `name`, `description`, `url`, `method`, `headers`, and `body_parameters` (JSON Schema). Telnyx sends **only the body parameters** the model fills in: no function name and no call details.
- So each tool's URL carries the function name: `…/webhook/telnyx/dental-booking?fn=book_appointment`.
- **Call details go in headers**, which support templating: `X-Caller-Number: {{telnyx_end_user_target}}` and `X-Call-Id: {{call_control_id}}`. Both are verified with Telnyx's tool-test endpoint at build time. If `call_control_id` is empty on web calls, the engine still works; holds and duplicates then rely on the phone number.
- **Security:** tool requests are not signed like Retell's. Each tool sends `X-Clinic-Secret: {{#integration_secret}}clinic_webhook_secret{{/integration_secret}}`. The secret is stored as a Telnyx **integration secret**, so it isn't visible in the assistant's settings, and n8n checks it with a new Header Auth credential.
- Tool timeout: `timeout_ms` 30000 (the engine queues simultaneous callers for a few seconds).
- The tool's JSON reply is given to the model as-is, so the engine's replies (spoken dates and times, `call_back_spoken`, `caller_id_available`) work unchanged.

---

## 5. Build steps

1. **Telnyx account prep (you):** store the API key as Windows env var `TELNYX_API_KEY` (never in the repo); confirm decisions 1, 2, 4 and 5.
2. **Engine (only if decision 4 = yes):** add an optional `channel` field to the engine and rebuild `Code.gs`; you paste it and deploy a **New version**; I check the version hash.
3. **n8n:** new workflow `Dental Voice Booking - Telnyx Webhook` from `telnyx/build-workflow.js`. Nodes: Webhook (Header Auth) → Normalize Request (fn from query, args from body, caller and call id from headers) → Call Booking Engine (existing Query Auth credential) → Engine Error? → Respond Result / Respond System Error → Raise Error Alert. Error workflow: the existing Error Alerts.
4. **Telnyx secret:** create the integration secret `clinic_webhook_secret` (generated locally, never printed) and the matching n8n Header Auth credential (you, in the n8n UI, as before).
5. **Prompt:** `telnyx/build-instructions.js` turns `retell/universal.md` + `retell/states/*.md` into one `telnyx/instructions.md` (transitions become "go to the Booking section", etc.). Greeting: "Thank you for calling Smile Care Dental Clinic. This is Riya, the clinic's virtual assistant. This call may be recorded. How can I help you today?"
6. **Assistant:** `telnyx/setup-telnyx.js` creates or updates the assistant (model, instructions, greeting, voice, transcription, 5 webhook tools, transfer, hangup, telephony settings), ids kept in `telnyx/telnyx-ids.json`.
7. **Tests:** Telnyx tool-test endpoint for each tool; then the same live checklist as the Retell agent (below) through the new webhook; then web test calls.
8. **Phone number:** buy or port a number (decision 5), assign it to the assistant, test from Jio / Airtel / Vi and a landline.

---

## 6. Test checklist (same as Retell, through the Telnyx webhook)

| # | Case | Expect |
|---|---|---|
| 1 | Missing / wrong `X-Clinic-Secret` | Rejected |
| 2 | Check availability today (9 AM–5 PM) | Next token offered and held 2 minutes |
| 3 | Book after checking | Uses the held token; row has `Channel` and `CallId` |
| 4 | Family member on the same phone | Next token |
| 5 | Same name and phone again | "already booked" |
| 6 | Tomorrow / before 9 AM / after 5 PM / Sunday | Correct call-back line |
| 7 | Find, cancel, then move another booking into the freed token | Moved |
| 8 | A Retell booking and a Telnyx booking at the same moment | Different tokens (shared engine lock) |
| 9 | Engine unreachable | `{ok:false}` + alert email |
| 10 | Web call: Hindi caller, interruptions, fee and address questions, "talk to a human", silence | Same behaviour as the Retell agent |

---

## 7. Files (this folder)
```
Booking Appointment using Telnyx Voice Agent/
├── PLAN.md
├── n8n/
│   ├── build-workflow.js          # generates the workflow JSON
│   └── dental-voice-booking-telnyx-webhook.json
└── telnyx/
    ├── build-instructions.js      # one prompt from the Retell agent's prompt files
    ├── instructions.md            # generated
    ├── tools.md                   # tool names, URLs, schemas, headers
    ├── assistant-settings.md      # model, voice, transcription, telephony
    ├── setup-telnyx.js            # creates / updates the assistant via the Telnyx API
    └── telnyx-ids.json            # assistant id (no secrets)
```

---

## 8. Security
- The Telnyx API key was pasted in a chat transcript: **regenerate it in the Telnyx portal before go-live** and update `TELNYX_API_KEY`.
- No secret is written to this folder. Secrets live in Windows env vars (`TELNYX_API_KEY`, `BOOKING_SCRIPT_SECRET`), the Telnyx integration secret, n8n credentials and the Apps Script property `SECRET`.

## 9. Open questions
- Phone number (decision 5).
- ~~Both agents live?~~ Yes: Retell and Telnyx stay live side by side (2026-10-22).
- Bengali (same open question as the Retell agent).
