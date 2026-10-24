# Plan — Dental Clinic Appointment Booking with a Telnyx Voice Agent

**Status (2026-10-22):** Plan approved; building. Decisions 1–4 confirmed 2026-10-22; the phone number (decision 5) is decided at go-live.

**Based on:** `Booking Appointment using Voice AI Agent/` (the Retell agent "Riya"). Same clinic and rules, kept as a **separate project** (decided 2026-10-24): its own copy of the rules and its **own Google Apps Script booking engine**, writing to the **same Google Sheet**, so Retell callers, Telnyx callers and the WhatsApp bot share the same 5 tokens per evening.

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
           Google Apps Script booking engine "Smile Care Booking Engine (Telnyx)"  (own project)
              │  LockService script lock → one Telnyx request at a time
              │  re-check after saving → settles clashes with the Retell agent's script
              ▼
           Google Sheet "Appointment Booking" — Bookings · Holidays · Holds (hidden, shared by both engines)
```

---

## 2. What is reused and what is new

| Part | Reused as is | New for Telnyx |
|---|---|---|
| Booking rules | Copied from the Retell project into `engine/clinic-rules.js` (with its tests) | Own copy: `Channel = Telnyx Voice` |
| Booking engine | — | Own Apps Script project (standalone, opens the sheet by id): `apps-script/Code.gs`, own web app URL and secret; re-checks the sheet after saving a booking or a move |
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
| 4 | Channel label ✅ | `Channel = Telnyx Voice` (Retell keeps `Voice`), written by the Telnyx engine |
| 5 | Phone number (at go-live) | Test with Telnyx web calls first. Indian numbers on Telnyx need regulatory documents and may not allow inbound AI calls; check availability before go-live, otherwise use a Telnyx number elsewhere or a SIP trunk from an Indian carrier |
| 6 | Rules | Identical to the Retell agent: same day only 9 AM–5 PM IST, Sundays and Holidays closed, 5 tokens from 7 PM, family bookings, duplicate = same name and phone, 2-minute holds, cancel and move today's booking |
| 7 | Transfer | Telnyx transfer tool to reception **+91 91634 95068**, `from` = the assistant's number |
| 9 | Separate engine ✅ | Own Apps Script and rules (2026-10-24). Two scripts have two locks, so after saving a booking or a move the Telnyx engine re-reads the sheet: if a Retell booking landed on the same token a moment earlier, the Telnyx booking moves to the next free token (a move is put back). Only the Telnyx side re-checks (decided); a Telnyx save fractionally before a Retell save is not corrected by the Retell script — very rare at 5 tokens a day |
| 10 | Holds ✅ | Shared hidden `Holds` tab, so neither agent offers a token the other is holding |
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
2. **Engine:** `apps-script/build-apps-script.js` builds `Code.gs` from `engine/clinic-rules.js` + `apps-script/booking-engine.js` + `apps-script/sheet-adapter.gs.js`. You create a new standalone Apps Script project, paste it, add the `SECRET` property and deploy it as a web app; I check the version hash.
3. **n8n:** own workflow `Dental Voice Booking - Telnyx Webhook` (`v5uqxIwH3TuJR4WT`) from `n8n/build-workflow.js`. Nodes: Webhook (own Header Auth credential) → Normalize Request (fn from query, args from body, caller and call id from headers) → Call Booking Engine (own Query Auth credential for the Telnyx engine) → Engine Error? → Respond Result / Respond System Error → Raise Error Alert. Error workflow: the existing Error Alerts.
4. **Secrets:** two new secrets generated locally (`TELNYX_WEBHOOK_SECRET`, `TELNYX_ENGINE_SECRET`), never printed: the webhook secret goes into a Telnyx integration secret and an n8n Header Auth credential; the engine secret into the script's `SECRET` property and an n8n Query Auth credential.
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
| 8 | A Retell booking and a Telnyx booking at the same moment | Different tokens (Telnyx engine re-checks and moves its own booking) |
| 9 | Engine unreachable | `{ok:false}` + alert email |
| 10 | Web call: Hindi caller, interruptions, fee and address questions, "talk to a human", silence | Same behaviour as the Retell agent |

---

## 7. Files (this folder)
```
Booking Appointment using Telnyx Voice Agent/
├── PLAN.md
├── engine/
│   ├── clinic-rules.js            # booking rules (copy of the Retell project's, Channel = Telnyx Voice)
│   └── clinic-rules.test.js
├── apps-script/
│   ├── booking-engine.js          # request handler + re-check against the Retell engine
│   ├── booking-engine.test.js
│   ├── sheet-adapter.gs.js        # web app entry, lock, sheet reads/writes
│   ├── build-apps-script.js
│   └── Code.gs                    # generated; pasted into the Telnyx Apps Script project
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
- No secret is written to this folder. Secrets live in Windows env vars (`TELNYX_API_KEY`, `TELNYX_WEBHOOK_SECRET`, `TELNYX_ENGINE_SECRET`), the Telnyx integration secret, n8n credentials and the Telnyx Apps Script property `SECRET`.

## 9. Open questions
- Phone number (decision 5).
- ~~Both agents live?~~ Yes: Retell and Telnyx stay live side by side (2026-10-22).
- Bengali (same open question as the Retell agent).
