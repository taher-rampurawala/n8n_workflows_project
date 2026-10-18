# Agent settings — Riya

| Setting | Value |
|---|---|
| Agent type | Retell LLM, **multi-prompt** |
| Agent name | Riya - Smile Care Dental Clinic |
| Universal prompt | `universal.md` |
| States | `intro` (start) → `booking`, `faq`, `transfer`, `closing` — files in `states/` |
| Begin message | "Thank you for calling Smile Care Dental Clinic. This is Riya, the clinic's virtual assistant. This call may be recorded. How can I help you today?" |
| Who speaks first | Agent |
| Model | Fastest Claude (Haiku-class) listed in Retell; fallback: fastest GPT mini model |
| Temperature | Low (0.2–0.3) |
| Voice | Female, Indian English, Hindi-capable — shortlist 2–3 in the dashboard and pick by ear |
| Language | Multilingual (English + Hindi); if not available, English (India) |
| Interruption sensitivity | Medium |
| Responsiveness | Default |
| End call after silence | ~20 s |
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
- Placeholder still open: `[ANY OTHER SERVICES]` in `states/03_faq.md`.
- Function names must match exactly: custom `check_availability`, `book_appointment`; built-in `transfer_call`, `end_call`.
- Set the `X-Clinic-Secret` header on both custom functions to the value in the n8n credential.
- Test scenarios (Phase 2): happy path; day full → next day; Sunday request; after 5 PM same-day; same caller books twice; Hindi caller; caller interrupts mid-sentence; fee question; "talk to a human"; silent caller; n8n down (`ok: false`).
