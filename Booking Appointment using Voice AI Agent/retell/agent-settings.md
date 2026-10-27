# Agent settings — Riya

| Setting | Value |
|---|---|
| Agent type | **Conversation flow**: one `subagent` node per state file, edges from each file's "Transitions" lines, `universal.md` as the global prompt (moved from multi-prompt on 2026-10-27, Retell retires multi-prompt agents on 2026-12-15) |
| Agent name | Riya - Smile Care Dental Clinic (agent `agent_fdb944e829c8a73680c8fbdbc7`, conversation flow `conversation_flow_f80bb62974d3`) |
| Setup | `node "Booking Appointment using Voice AI Agent/retell/setup-retell.js"` creates or updates the flow and agent from these files (ids in `retell-ids.json`) |
| Universal prompt | `universal.md` |
| Nodes | `intro` (start) → `booking`, `faq`, `manage_booking` (cancel), `transfer`, `closing` — files in `states/` |
| Opening line | (flows have no begin message, so the `intro` node says it first) "Thank you for calling Smile Care Dental Clinic. This is Riya, the clinic's virtual assistant. This call may be recorded. How can I help you today?" |
| Who speaks first | Agent |
| Model | `claude-5.5-sonnet` (switched from haiku on 2026-10-21 for accuracy with names and numbers) |
| Temperature | 0.2 |
| Voice | `11labs-Monika` (Monika, en-IN, ElevenLabs); alternatives: `inworld-Saanvi`, `openai-Monika` |
| Voice temperature | 0.2 (steady, even delivery; prompt also forbids excited wording) |
| Language | `en-IN` + `hi-IN` |
| Interruption sensitivity | 0.9 (caller can cut in easily; prompt says take the new input and continue) |
| Speech-to-text | `stt_mode: accurate`; boosted keywords: Smile Care, Riya, Muzaffar Ahmed Street, Esplanade, Park Street, UPI, token |
| Responsiveness | 0.7 with dynamic responsiveness (waits through mid-sentence pauses) |
| "Are you still there?" reminder | after 15 s of silence, once |
| End call after silence | 30 s (15 s after the reminder) |
| Max call duration | 10 min |
| Functions | `check_availability`, `book_appointment` (booking); `find_booking`, `cancel_booking` (manage_booking); `transfer_call`, `end_call` (every node) — see `functions.md` |
| Transfer destination | +919163495068 (reception) |
| Post-call analysis (Phase 3) | `booked` (boolean), `token` (number), `appointment_date` (string), `intent` (booking / faq / transfer / other), `transferred` (boolean) |
| Agent webhook (Phase 3) | n8n call-log webhook — not built yet |

## Dynamic variables used
- `{{current_time_Asia/Kolkata}}` — Retell system variable
- Caller ID is not read from `{{user_number}}`: n8n returns `caller_id_available` / `caller_id_last4_spoken` in every `check_availability` reply (empty `{{user_number}}` on web calls confused the agent).

No custom variables need to be passed in.

## Before you deploy
- No placeholders open. Services are limited to the four listed in `states/03_faq.md`.
- Function names must match exactly: custom `check_availability`, `book_appointment`; built-in `transfer_call`, `end_call`.
- Set the `X-Clinic-Secret` header on both custom functions to the value in the n8n credential.
- Test scenarios (Phase 2): book today (after 9 AM); ask for tomorrow → "call tomorrow after nine AM"; call before 9 AM; after 5 PM; Sunday; today full; same caller books twice; hard-to-spell name; phone number with "double"; Hindi caller; interrupt mid-sentence; fee/address question mid-booking; "talk to a human"; silent caller; n8n down (`ok: false`).
