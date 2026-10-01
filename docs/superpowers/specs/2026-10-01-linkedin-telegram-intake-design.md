# LinkedIn Content Generator — Telegram Chat Intake

**Date:** 2026-10-01
**Workflow:** LinkedIn Content Generator (`1iq4ahgre4HMnqc5`)
**Status:** Approved design, pending implementation plan

## Goal

Replace the Form Trigger input with a conversation in the existing Telegram bot (@linkedin_post_tango_bot, credential `LinkedinPost Telegram Bot`). The same bot already sends the preview and the Approve/Decline buttons; it now also collects the post inputs. Everything after input collection (GitHub fetch, research, image, preview, approval, LinkedIn publish) stays as it is.

## Requirements

- Any opening message ("hi" or similar) starts intake. The bot asks for the inputs the form used to collect.
- Required: **Topic**, **Target Audience**, **Description**. Optional: **GitHub URL**, **Workflow Screenshot**.
- If the user does not give everything up front, the bot asks for one missing field at a time.
- Special instructions given anywhere in the conversation are always followed (within the limits below).
- A screenshot sent in chat becomes the second image in the Telegram preview and in the LinkedIn post.
- Approve/Decline stays in the same chat.
- An AI agent interprets messages; node count is kept minimal.
- Every intake question carries a **Reset** button. No idle timer.
- When all required inputs are present, the bot shows a recap with **Generate** and **Reset** buttons. Nothing is generated until Generate is tapped.
- While a post is generating or waiting for Approve/Decline, new messages get a "still waiting" reply and are not processed.

## Constraints

- **One trigger.** A Telegram bot has one webhook. The existing `Telegram Button Tap` trigger is changed to listen to both `message` and `callback_query` updates. No second trigger or workflow may use this bot.
- **Owner only.** Only chat/user ID `810102376` is served. The check happens in the routing step, not in the trigger's "Restrict to Chat/User IDs" option, which drops `callback_query` updates on Telegram Trigger v1.3.
- **Telegram caption limit.** The post stays at 1,000 characters or less so the preview caption matches the LinkedIn post exactly.
- **No bot token outside Telegram nodes.** Dynamic inline keyboards are done with separate Telegram nodes behind an IF, not with HTTP requests.

## Architecture

```
Telegram Trigger (message + callback_query)
  └─ Route Update (Switch)
       ├─ approve/decline tap (a:/d:)  → existing approval path (unchanged)
       ├─ Generate / Reset tap (g / r) → intake button path
       ├─ chat message from owner      → intake chat path
       └─ anything else                → ignored
```

### Intake chat path

1. **Load Session** — data table lookup by `chat_id` (always outputs data, so an empty session still continues).
2. **Prepare Turn** (Code) — merges the session with the message. Reads the text (or photo caption). Takes the largest `message.photo` size's `file_id`, or `message.document.file_id` when the document's MIME type is `image/png` or `image/jpeg`. Computes `busy`: status is `generating` and `status_at` is less than 25 hours ago.
3. **Is Busy?** (IF) — true → **Send Busy Reply** ("A post is still waiting for your decision — tap Approve or Decline on it first.") and stop.
4. **Intake Agent** — reuses the existing Writer Model, with its own Structured Output Parser (auto-fix on, using the existing JSON Fixer Model). Contract below.
5. **Apply Turn** (Code) — merges the agent's non-null fields and the screenshot `file_id` into the session, validates the GitHub URL, applies `reset`, and decides the reply text and whether the recap is shown.
6. **Save Session** — data table upsert by `chat_id`.
7. **Ready?** (IF) — true → **Send Recap** (Generate + Reset buttons); false → **Send Question** (Reset button).

### Intake button path

- **Generate (`g`)**
  1. Load the session. Check that the required fields are present and the session is not busy; otherwise answer the callback "This request has expired".
  2. Set `status = generating`, `status_at = now`, clear the intake fields from the row (a copy goes forward in the item), and edit the recap message to "Generating…" with no buttons.
  3. **Post Inputs** (Set) — replaces the Form Trigger as the source of `topic`, `audience`, `project_description`, `github_url`, `special_instructions` and `screenshot_file_id`. Every expression that referenced `$('LinkedIn Post Form')` now references `$('Post Inputs')`.
  4. If `screenshot_file_id` is set, **Download Screenshot** (Telegram file get, binary property `workflow_image`). Then on to the existing **Fetch Workflow Structure** node.
  5. **Attach Workflow Screenshot** re-attaches the screenshot binary from the download node instead of from the form.
- **Reset (`r`)** — answer the callback, clear the intake fields (status is left unchanged so a pending post stays blocked), and send "Let's start over — what's the topic?" with the Reset button.

### Releasing the block

One **Release Session** node (data table update: `status = idle`) is fed from all the places a run ends: Confirm LinkedIn Post (approve), Send Rejected Notice (decline or timeout) and Send Error Alert. A `generating` status older than 25 hours is treated as idle (the approval wait times out at 24 hours), so a crashed run cannot lock the bot.

### Data

New data table **LinkedIn Intake Sessions**, one row per chat:

| Column | Type | Notes |
|---|---|---|
| `chat_id` | string | lookup key |
| `topic` | string | required |
| `audience` | string | required |
| `description` | string | required |
| `github_url` | string | optional |
| `screenshot_file_id` | string | optional, Telegram `file_id` |
| `special_instructions` | string | optional, accumulated |
| `last_asked` | string | `topic` / `audience` / `description` / `recap` |
| `status` | string | `idle` / `generating` |
| `status_at` | date | when `status` last changed |

The existing **LinkedIn Pending Approvals** table is unchanged.

## Intake Agent contract

**Input:** saved fields (JSON), the message text or caption, `photo_attached: yes/no`, and `last_asked`.

**Output:**

```json
{ "topic": "...|null", "audience": "...|null", "description": "...|null",
  "github_url": "...|null", "special_instructions": "...|null",
  "intent": "answer|greeting|reset|vague" }
```

- Fields are returned only when the message provides or changes them; otherwise `null`. A `null` never clears a saved value.
- A short reply is mapped to the `last_asked` field.
- One message may fill several fields at once.
- Corrections ("actually make the audience CTOs") overwrite the field.
- "start over" / "reset" in text → `intent: reset`, same effect as the Reset button.
- `special_instructions` captures only new instructions about how the post or image should be written or look (tone, length, structure, hashtags, call to action, facts to mention, visual style). It is not a restatement of topic, audience or description.

**Reply logic (Apply Turn, in code — the agent does not write replies):**

- Required fields are asked in fixed order: topic → audience → description.
- `greeting` with an empty session → welcome line + topic question.
- `vague` → "I didn't catch that" + the current question again.
- `reset` → clear the intake fields + topic question.
- A `github_url` that is not a `github.com` link is rejected with a short note in the reply and is not saved. Full validation still happens in Fetch Workflow Structure.
- All required fields present → recap message listing topic, audience, description, GitHub URL (or "none"), screenshot (attached / none) and special instructions (or "none"), plus "Send a GitHub link or screenshot to add them, type a correction, or tap Generate."

## Special instructions in the pipeline

- New `special_instructions` are appended to the saved ones. When two conflict, the later one wins (the Research & Write agent is told so).
- They are passed to **Research and Write Post** and **Write Image Prompt**, with a rule to follow them over the default style rules (tone, structure, hashtags, call to action, length, visual style).
- Two rules still apply over them:
  - the post is at most 1,000 characters;
  - no invented facts. A fact the user states in an instruction counts as user input and may be used.

## Error handling

- **Intake Agent** — retries on, error output → **Send Intake Error** ("Sorry, I couldn't process that — please resend.", Reset button). The session is not changed. Not routed to Send Error Alert.
- **Download Screenshot** — error output → Send Error Alert (which also releases the block).
- **Release Session** on every end of a run, plus the 25-hour stale guard (see above).
- **Stale buttons** — Generate/Reset on an old recap is checked against the current session and answered "This request has expired". Approve/Decline keeps its current expired handling.
- **Non-owner updates** — ignored, with no reply.
- Error alert text renamed from "LinkedIn Content Agent failed" to "LinkedIn Content Generator failed".

## Removed

- **LinkedIn Post Form** (Form Trigger). Its form title "LinkedIn Content Agent" goes with it.

## Testing

1. `validate_workflow` passes with no errors.
2. Intake, with pinned Telegram updates:
   - "hi" on an empty session → welcome + topic question with Reset.
   - One message containing all required fields + a special instruction → recap with Generate/Reset.
   - One field at a time → asked topic, then audience, then description.
   - A vague message → "didn't catch that" + same question.
   - A correction after the recap → recap updated.
   - "start over" in text → session cleared.
   - A photo with a caption → `screenshot_file_id` saved, caption parsed.
   - Any message while `status = generating` → busy reply.
3. End to end in the live chat (the Telegram trigger only receives updates while the workflow is published):
   - Required fields only → single image preview → Decline → rejected notice → bot unblocked.
   - All fields + screenshot → two-image album preview → Approve → posted with both images. The LinkedIn publish nodes stay **disabled** for this run until the user has seen the preview, unless told otherwise.
   - Invalid GitHub URL → error alert → bot unblocked.

## Docs and repo

- Update `LinkedIn Content Generator/linkedin-agent-n8n-plan.md` and the README section for Telegram intake.
- Re-sync `LinkedIn Content Generator/LinkedIn Content Generator.json` from the live workflow, restoring credential references that the MCP export drops.

## Out of scope

- Idle timers or proactive nudges.
- More than one user.
- Starting a new post while one is pending.
