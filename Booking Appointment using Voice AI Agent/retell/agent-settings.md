# Agent settings — Riya

| Setting | Value |
|---|---|
| Agent type | Retell LLM, **multi-prompt** |
| Agent name | Riya - Smile Care Dental Clinic (agent `agent_e99b2cdd4f4da3d2c9f4e7cd8c`, LLM `llm_4e575cbe0649e32ca888e725d0f1`) |
| Setup | `node "Booking Appointment using Voice AI Agent/retell/setup-retell.js"` creates or updates both from these files (ids in `retell-ids.json`) |
| Universal prompt | `universal.md` |
| States | `intro` (start) → `booking`, `faq`, `transfer`, `closing` — files in `states/` |
| Begin message | "Thank you for calling Smile Care Dental Clinic. This is Riya, the clinic's virtual assistant. This call may be recorded. How can I help you today?" |
| Who speaks first | Agent |
| Model | `claude-5.5-haiku` |
| Temperature | 0.2 |
| Voice | `11labs-Monika` (Monika, en-IN, ElevenLabs); alternatives: `inworld-Saanvi`, `openai-Monika` |
| Language | `en-IN` + `hi-IN` |
| Interruption sensitivity | 0.6 |
| Speech-to-text | `stt_mode: accurate`; boosted keywords: Smile Care, Riya, Muzaffar Ahmed Street, Esplanade, Park Street, UPI, token |
| Responsiveness | 0.7 with dynamic responsiveness (waits through mid-sentence pauses) |
| "Are you still there?" reminder | after 15 s of silence, once |
| End call after silence | 30 s (15 s after the reminder) |
| Max call duration | 10 min |
| Functions | `check_availability`, `book_appointment` (booking state); `transfer_call`, `end_call` (every state) — see `functions.md` |
| Transfer destination | +919163495068 (reception) |
| Post-call analysis (Phase 3) | `booked` (boolean), `token` (number), `appointment_date` (string), `intent` (booking / faq / transfer / other), `transferred` (boolean) |
| Agent webhook (Phase 3) | n8n call-log webhook — not built yet |

## Dynamic variables used
- `{{current_time_Asia/Kolkata}}` — Retell system variable
- `{{user_number}}` — Retell system variable (caller ID; empty on web calls)

No custom variables need to be passed in.

## Before you deploy
- No placeholders open. Services are limited to the four listed in `states/03_faq.md`.
- Function names must match exactly: custom `check_availability`, `book_appointment`; built-in `transfer_call`, `end_call`.
- Set the `X-Clinic-Secret` header on both custom functions to the value in the n8n credential.
- Test scenarios (Phase 2): happy path; day full → next day; Sunday request; after 5 PM same-day; same caller books twice; Hindi caller; caller interrupts mid-sentence; fee question; "talk to a human"; silent caller; n8n down (`ok: false`).
