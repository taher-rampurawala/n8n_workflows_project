# Booking Appointment using Telnyx Voice Agent

**Riya on Telnyx** — a voice receptionist for Smile Care Dental Clinic (Kolkata) built as a **Telnyx AI Assistant**. Patients phone in, and Riya books same-day evening tokens, answers clinic questions, finds / cancels / moves today's booking, and transfers to reception — in English, Hindi or Hinglish.

It is the Telnyx counterpart of the Retell project in [`../Booking Appointment using Voice AI Agent/`](../Booking%20Appointment%20using%20Voice%20AI%20Agent/): same clinic, same rules and persona, but a **separate project** with its own prompt, n8n workflow and Google Apps Script booking engine. Both write to the same Google Sheet, so Retell callers, Telnyx callers and the clinic's WhatsApp bot share the same 5 tokens per evening.

## How it works

```
Caller ──► Telnyx AI Assistant "Riya"   (Claude Haiku 4.5 · Azure Neerja Indic voice · Deepgram nova-3)
              │  webhook tools: check_availability · book_appointment · find_booking · cancel_booking · move_booking
              │  built-in tools: transfer (reception) · hangup
              ▼
           n8n  "Dental Voice Booking - Telnyx Webhook"      POST /webhook/telnyx/dental-booking?fn=<tool>
              │  X-Clinic-Secret header check → { fnName, args, callId, callerNumber }
              ▼
           Google Apps Script web app  "Smile Care Booking Engine (Telnyx)"
              │  LockService script lock · re-check after saving
              ▼
           Google Sheet "Appointment Booking" — Bookings · Holidays · Holds (hidden, shared)
```

## Highlights

- 🧩 **Telnyx webhook tools wired to n8n** — Telnyx sends only the model's arguments, so each tool's URL carries the function name (`?fn=`) and templated headers carry the caller's number (`{{telnyx_end_user_target}}`) and call id (`{{call_control_id}}`).
- 🔐 **Secrets never in config** — the webhook password is a Telnyx *integration secret* (`{{#integration_secret}}…{{/integration_secret}}`) checked by an n8n Header Auth credential; the booking engine has its own secret, sent by an n8n Query Auth credential.
- 🔒 **Safe concurrent bookings** — the engine takes Google's `LockService` lock, so Telnyx callers queue and never share a token. Because the Retell agent has its own engine, the Telnyx engine re-reads the sheet after saving a booking or a move and settles any clash with a Retell booking made at the same moment. A shared hidden **Holds** tab keeps an offered token for 2 minutes across both agents.
- 🧮 **Tested rules** — `engine/clinic-rules.js` (48 `node:test` cases with the engine): 5 tokens from 7 PM, same-day booking 9 AM–5 PM IST, Sundays and holidays closed, family bookings (duplicate = same name and phone), cancel and move, spelled-name and 10-digit phone validation, spoken dates and times.
- 🗣️ **One prompt, same behaviour** — Telnyx uses a single instructions prompt, built from sectioned source files (`telnyx/prompt/`): calm voice, yields to interruptions, never narrates its reasoning, reads back the saved name and number, emergency guidance, AI + recording disclosure.
- 🏷️ **Traceable** — every booking from this agent is written with `Channel = Telnyx Voice`.

## Files

```
├── PLAN.md                        # design, decisions, status, test checklist
├── engine/
│   ├── clinic-rules.js            # booking rules (Channel = Telnyx Voice)
│   └── clinic-rules.test.js
├── apps-script/
│   ├── booking-engine.js          # request handler + re-check against the Retell engine
│   ├── booking-engine.test.js
│   ├── sheet-adapter.gs.js        # web app entry, secret check, lock, sheet reads/writes
│   ├── build-apps-script.js       # builds Code.gs
│   └── Code.gs                    # generated — pasted into the Apps Script project
├── n8n/
│   ├── build-workflow.js          # builds the workflow JSON
│   └── dental-voice-booking-telnyx-webhook.json
└── telnyx/
    ├── prompt/                    # universal.md + sections/ (prompt sources)
    ├── build-instructions.js      # one instructions prompt from prompt/
    ├── instructions.md            # generated
    ├── tools.md                   # tool URLs, headers, JSON schemas, replies
    ├── setup-telnyx.js            # creates / updates the assistant via the Telnyx API
    └── telnyx-ids.json            # assistant id (no secrets)
```

## Setup

1. **Sheet** — the shared *Appointment Booking* sheet: Bookings tab with `Date, Time, TokenNumber, PatientName, Age, Reason, WhatsAppNumber, BookedAt, Channel, CallId, Status, BookingId`, plus a `Holidays` tab.
2. **Secrets** — generate `TELNYX_WEBHOOK_SECRET` and `TELNYX_ENGINE_SECRET` as Windows user env vars; set `TELNYX_API_KEY`.
3. **Booking engine** — `node apps-script/build-apps-script.js`, paste `Code.gs` into a new standalone Apps Script project, set the Script Property `SECRET` (= `TELNYX_ENGINE_SECRET`) and time zone IST, and deploy as a web app (Execute as: Me, Who has access: Anyone). Opening the URL shows the deployed version; after each change publish a **New version** in Manage deployments.
4. **n8n** — create a Header Auth credential (`X-Clinic-Secret` = `TELNYX_WEBHOOK_SECRET`) and a Query Auth credential (`key` = `TELNYX_ENGINE_SECRET`), put their ids and the web app URL in `n8n/build-workflow.js`, run it and import / publish the workflow.
5. **Telnyx** — create the integration secret `clinic_webhook_secret` (= `TELNYX_WEBHOOK_SECRET`), then `node telnyx/build-instructions.js` and `node telnyx/setup-telnyx.js`.
6. **Tests** — `node --test engine/clinic-rules.test.js apps-script/booking-engine.test.js`; Telnyx's tool-test endpoint for each tool; web test calls from the Telnyx portal.

## Status

Built and connected; Telnyx tool tests pass end to end. Next: booking tests inside clinic hours (including simultaneous Retell and Telnyx bookings), a web test call, and a phone number. See [`PLAN.md`](PLAN.md).
