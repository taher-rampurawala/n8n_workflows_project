# Plan: LinkedIn Content Generator in n8n

## Goal
An n8n workflow that collects a **topic**, **target audience** and **description** from me in a **Telegram chat**, researches the topic, writes a LinkedIn post (educational or a project showcase), generates a matching image, asks for my approval in the same chat, and then publishes to LinkedIn.

> **v2 change (2026-10-01):** the input moved from a Form Trigger to a Telegram conversation with the same bot that handles approval. The workflow was renamed from "LinkedIn Content Agent" to **LinkedIn Content Generator** (n8n ID `1iq4ahgre4HMnqc5`).

## Instructions for Claude Code
- Use the n8n MCP tools. Before building, call `get_workflow_best_practices`, `get_sdk_reference`, and `search_nodes` to confirm exact node types and parameters. Do not guess node names.
- The workflow already exists — change it with `update_workflow`, then run `validate_workflow`, then `test_workflow` (use `prepare_test_pin_data` to pin Telegram `message` / `callback_query` updates).
- Use `list_credentials` to find existing credentials. Never hardcode API keys. If a credential is missing, stop and tell me which one to create in n8n.
- Do NOT publish the changed workflow until I confirm the test runs look right.
- After every live change, re-sync the local JSON in this folder, keeping the node credential references (the MCP export drops them).

## Prerequisites (I set these up in n8n)
- OpenAI credential (the account must be **organization-verified** for image generation) — exists (`OpenAI account`).
- Tavily API key (as an HTTP header auth credential) — exists (`Tavily API`).
- **LinkedIn OAuth2 credential (Standard)** — posting is as **person** (my own profile, `postAs: 'person'`), visibility **PUBLIC**, backed by a LinkedIn Developer app with "Sign in with LinkedIn using OpenID Connect" and "Share on LinkedIn" enabled.
- **Telegram Bot credential — dedicated bot** (`LinkedinPost Telegram Bot`, @linkedin_post_tango_bot). Do not reuse `Lead_Generator_Bot` or `UGC_Generation_Bot`. Chat ID `810102376`. Used for **input collection**, preview, approval and alerts. A bot has only one webhook, so no other trigger or workflow may use this bot.
- n8n data tables: **LinkedIn Pending Approvals** (exists: `execution_id`, `resume_url`) and **LinkedIn Intake Sessions** (new, see below).
- GitHub: the project link is always a **public GitHub URL** pointing at n8n workflow JSON (a `.json` file or a project folder). No credential needed. Private repos are out of scope.

## Telegram conversation

What I can send the bot:

| Input | Required | How it's given |
|---|---|---|
| Topic | yes | text |
| Target audience | yes | text |
| Description | yes | text — a short brief of what the post should cover |
| GitHub URL | no | text — a `.json` file (`github.com/<owner>/<repo>/blob/<branch>/<path>.json`) or a folder (`github.com/<owner>/<repo>/tree/<branch>/<folder>`) |
| Workflow screenshot | no | a photo, or a PNG/JPEG sent as a file — published as the **second image** of the post |
| Special instructions | no | anything about how the post or image should be written or look, in any message |

Behaviour:
- "hi" (or any first message) starts intake. I can give everything in one message or answer one question at a time.
- Fields are asked one at a time in the order topic → audience → description → GitHub URL → screenshot → special instructions. The last three are optional: each question says "reply skip", and any optional field I've already given is not asked again. Skipping a required field gets "This one is required." **Every question has a Reset button.**
- **All at once:** if my opening message (or my reply to the first topic question) gives two or more details, the intake switches to all-at-once mode (`intake_mode = bulk`): only missing **required** fields are asked, one at a time; optional fields I didn't mention are skipped and the recap follows. The recap reminds me I can still add a GitHub link, screenshot or special instructions.
- Vague messages get "I didn't catch that" plus the same question again. Typing "start over" works like Reset.
- When every step is answered or skipped, the bot shows a **recap** (post type, topic, target audience, description, GitHub URL, screenshot yes/no, special instructions — each on its own line with a blank line between) with **Generate** and **Reset** buttons. I can still type a correction or send a screenshot before tapping Generate.
- While a post is generating or waiting for my Approve/Decline, new messages only get "A post is still waiting for your decision". A run is unblocked by Approve, Decline, the 24-hour timeout, or an error alert. A stuck `generating` status older than 25 hours counts as idle.
- Only my chat/user ID is served. Everything else is ignored.

**Post mode.** The Intake Agent decides whether the post is a **project showcase** ("I built…", "my workflow…") or **educational** (explaining a topic). A GitHub URL or screenshot always forces project mode. If unclear, it defaults to educational. The recap shows the mode, and I can change it by typing.

## Workflow design

### Input (Telegram intake)

| # | Node | Purpose |
|---|------|---------|
| 1 | **Telegram Trigger: Telegram Update** | Listens to `message` **and** `callback_query`. Do **not** use the trigger's "Restrict to Chat/User IDs" options — on Telegram Trigger v1.3 they only read `message.chat.id`, so every button tap is dropped. The owner check happens in step 2. Only listens while the workflow is **published**. |
| 2 | **Switch: Route Update** | Owner check (`chat.id` and `from.id` = my chat ID), then routes: approve/decline tap (`a:`/`d:` + execution id) → approval path (step 13); Generate (`g`) / Reset (`r`) tap → intake buttons (steps 9–10); chat message → intake chat (steps 3–8); any other tap → just answered; anything else → ignored. Replaces the old **Is Approval Tap?** IF. |
| 3 | **Data table: Load Session** | Get the **LinkedIn Intake Sessions** row for my chat (always outputs data, so an empty session continues). |
| 4 | **Code: Prepare Turn** | Merges the session with the message. Reads the text or photo caption. Takes the largest `message.photo` `file_id`, or `message.document.file_id` when it is `image/png` / `image/jpeg`. Computes `busy`. |
| 5 | **IF: Is Busy?** | True → **Telegram: Send Busy Reply** and stop. |
| 6 | **AI Agent: Intake Agent** | Reuses the **JSON Fixer Model** (`gpt-5.4-mini`, fast enough for chat replies). **Intake Output Parser** (auto-fix on, same model) returns `{ topic, audience, description, github_url, special_instructions, post_mode, intent }`. See *Prompt guidance*. Retries once; error output → **Send Question**, which then says "Sorry, I couldn't process that. Please send it again." with the Reset button; the session is not changed. |
| 7 | **Code: Apply Turn** + **Data table: Save Session** | Merges the agent's non-null fields and the screenshot `file_id` into the session. Rejects a non-`github.com` URL with a note in the reply. Forces `post_mode = project` when a GitHub URL or screenshot is present. Handles `reset`. Picks the reply: next missing question, "didn't catch that", or the recap. Upserts the row by `chat_id`. |
| 8 | **IF: Ready?** | True → **Telegram: Send Recap** (Generate + Reset). False → **Telegram: Send Question** (Reset). |
| 9 | **Generate tap** | Confirm Button Tap answers the callback. **Load Generate Session** → **Can Generate?** (complete and not busy; otherwise **Show Recap Expired** edits the recap). **Start Generation** sets `status = generating` and clears the intake fields (the loaded copy goes forward). **Show Generating** adds "Generating..." to the recap and removes its buttons. |
| 10 | **Reset tap** | Confirm Button Tap answers the callback. **Clear Session** clears the intake fields (status unchanged, so a pending post stays blocked) → **Send Question** ("Let's start over. What's the topic of the post?", Reset button). |
| 11 | **IF: Has Screenshot File?** → **Telegram: Download Screenshot** | Only when the session has a `screenshot_file_id`: Telegram file get → binary `data`. Error output → error alert. Runs **before** Post Inputs so Fetch Workflow Structure still receives the inputs as its direct input. |
| 11a | **Set: Post Inputs** | Replaces the old Form Trigger as the single source of `topic`, `audience`, `project_description`, `github_url`, `special_instructions`, `post_mode` and `screenshot_file_id` (copied from Load Generate Session). Every expression that referenced `$('LinkedIn Post Form')` now references `$('Post Inputs')`. |

**Data table LinkedIn Intake Sessions** (`tWW1wrJAhVDkmGsy`) — one row per chat, all columns text: `chat_id`, `topic`, `audience`, `description`, `github_url`, `screenshot_file_id`, `special_instructions`, `post_mode`, `last_asked` (`topic` / `audience` / `description` / `github_url` / `screenshot` / `special_instructions` / `recap`), `intake_mode` (`bulk` or empty for step by step), `status` (`idle` / `generating`), `status_at` (ISO timestamp).

### Generation, preview and publishing (unchanged except where noted)

| # | Node | Purpose |
|---|------|---------|
| 12a | **Code: Fetch Workflow Structure** | Runs before the agent, no credential. Empty `github_url` → passes the inputs through unchanged. File URL → fetches the raw JSON. Folder URL → lists the folder via the GitHub contents API and fetches every `.json` directly inside it, keeping only files with a `nodes` array. Each workflow is **trimmed to structure only**: name, triggers, AI models, services (from node types), node names + types, and connections. Node parameters (prompts, sheet/chat IDs, etc.) are never passed on. Output: inputs + `workflow_structure` (capped at 12,000 chars). A bad URL, any failed fetch, or no workflow JSON found → error output → Telegram alert. The GitHub README is not fetched. |
| 12b | **AI Agent: Research & Write** | OpenAI chat model. Receives the inputs, `post_mode`, `special_instructions` and `workflow_structure`. Always uses the Tavily search tool. Then writes the post. |
| 12c | └ **HTTP Request Tool** (Tavily) | POST to the Tavily search API. The agent supplies the query via `$fromAI`. |
| 12d | └ **Structured Output Parser** | Returns `{ post_text, project_summary }` (auto-fix on). `project_summary` is a factual 1–3 sentence summary of the project for the image prompt; empty in educational mode. |
| 12e | **Set: Art Direction** | Picks one art direction at random (isometric 3D scene, editorial flat illustration, cinematic photo-real, blueprint/technical diagram, paper-cut collage, futuristic dark UI render) so every run gets a different visual style. Output: `art_direction`. |
| 12f | **AI Agent: Image Prompt** | Inputs: `post_text`, `project_summary`, `art_direction`, and from Post Inputs: `topic`, `audience`, `project_description`, `github_url`, `special_instructions`. Output: `{ image_prompt }`. |
| 12g | **OpenAI: Generate Image** | `gpt-image-2`, **quality: medium**, **size: 1536x1024**. Returns binary directly. |
| 12h | **Code: Attach Workflow Screenshot** + **IF: Has Workflow Screenshot?** | Nodes in between drop binary, so the screenshot is re-attached here **from Download Screenshot** (was: the form), renamed to `workflow_image`: binary `data` (generated image) and, when present, `workflow_image`, plus `has_workflow_image`. |
| 12i | **Telegram preview** | ONE message that is an exact preview of the LinkedIn post — same `post_text`, same image binaries as step 14, plain text caption. **No screenshot:** `sendPhoto` with `post_text` as caption. **With screenshot:** a 2-photo **album** (`sendMediaGroup`) — generated image first with the caption, screenshot second. Both images are first uploaded silently to get file IDs, then sent as the album, then the temporary uploads are deleted. |
| 12j | **Data table: Save Pending Approval** | Inserts `{ execution_id, resume_url }` into **LinkedIn Pending Approvals** (signed resume URLs are too long for Telegram's 64-byte button data). |
| 12k | **Telegram: Ask for Approval** | Replies to the preview with "Post this to LinkedIn?" and inline **✅ Approve** (`a:<execution id>`) / **❌ Decline** (`d:<execution id>`). |
| 12l | **Wait: Wait for Decision** | Resume on webhook call (POST), timeout **24 hours**. Timeout resumes with no body → treated as declined. |
| 12m | **IF: Is Approved?** | `body.decision === 'approve'` → step 14. Anything else → step 15. |
| 13 | **Approval tap path** (from the Route Update switch) | Validates the data → looks up the pending row → posts the decision as a reply in the chat → deletes the row (one tap only) → POSTs `{ decision }` to the stored resume URL → edits the question to "✅ Approved" / "❌ Declined" and removes the buttons → answers the callback. No row or a failed resume → "This request has expired or was already answered." |
| 14 | **LinkedIn: Create Post** | Post as **person**, visibility **PUBLIC**. **One image:** built-in LinkedIn node. **Two images:** LinkedIn REST API via HTTP Request nodes (`/v2/userinfo` → `sub`, `POST /rest/images?action=initializeUpload` + `PUT` per image, `POST /rest/posts` with `content.multiImage.images` = [generated, screenshot]). Then "Posted to LinkedIn" on Telegram. |
| 15 | **Telegram: Send Rejected Notice** | "Post rejected, nothing was published". No LinkedIn call. |
| 16 | **Data table: Release Session** | Sets `status = idle`. Fed from Confirm LinkedIn Post, Send Rejected Notice and Send Error Alert, so every end of a run unblocks the bot. |

## Prompt guidance

**Intake Agent (system prompt)**
- Role: extract LinkedIn post inputs from my chat messages. It does **not** write the bot's replies — code does.
- Input: saved fields (JSON), the message text or caption, `photo_attached`, and `last_asked`.
- Return a field only when the message provides or changes it; otherwise `null` (never clear a saved value). A short reply fills the `last_asked` field. One message may fill several fields. Corrections overwrite.
- `special_instructions`: only **new** instructions about how the post or image should be written or look (tone, length, structure, hashtags, call to action, facts to mention, whether to include the GitHub link, visual style) — not a restatement of topic, audience or description. A request like "share the repo link" is saved here as well as the URL going into `github_url`.
- `post_mode`: `project` when I describe something I built, `educational` when I ask for an explanation or view on a topic, `null` when there's no new signal.
- `intent`: `greeting` (hi / opening message), `reset` ("start over", "reset"), `vague` (nothing usable), `skip` ("skip", "no", "none" in reply to an optional question), otherwise `answer`.
- `last_asked` can be `topic`, `audience`, `description`, `github_url`, `screenshot`, `special_instructions` or `recap`; a short reply to the special-instructions question is saved as a special instruction.

**Research & Write agent (system prompt)**
- Role: LinkedIn content writer for the given audience.
- Always call the search tool at least once and base claims on results only.
- **Mode comes from `post_mode`** (was: "project mode if `github_url` or `project_description` is provided").
  - **Project:** a showcase in my voice ("I built..."), covering the problem, what I built, the tools used, and the result or lesson.
    - Project facts come **only** from the description, `workflow_structure` and facts I state in special instructions. Describe the automation from its actual triggers, nodes and connections in plain language — no mechanical lists of node names or counts.
    - Never invent features, steps, integrations, metrics, motivations or outcomes. If there's a GitHub URL but the description says nothing about results, make no claims about results or why it was built.
    - Web search is for context on the topic, never for facts about my project.
    - Study `workflow_structure` thoroughly first (trigger, what each step does, models, services, data flow, branching/approval/error paths), then aim the Tavily research at what the workflow actually does.
    - By default the GitHub repo is never mentioned or linked in the post — `github_url` and `workflow_structure` are only for understanding the project. **Exception:** if my special instructions ask to include/share the repo link, the post includes `github_url` exactly as given, once, near the call to action (counts toward the 1,000 characters; never invented if no URL was given).
    - When a screenshot is attached (`workflow_screenshot_attached: yes`), the post may point readers to it ("the full workflow is in the second image"), but must not describe anything not in `workflow_structure` or my description.
  - **Educational:** a general post on the topic, using the description as the brief.
- **Special instructions:** follow `special_instructions` over the default style rules below (tone, structure, hashtags, call to action, length). When two conflict, the later one wins. They never override the 1,000-character cap or the no-invented-facts rule.
- Format (defaults): strong hook in the first line, short paragraphs, one clear takeaway, a specific call to action that invites a response, **max 1,000 characters total including hashtags** (Telegram's photo caption limit — the preview must fit in one message), at most 3 hashtags, no emojis in the first line.
- Never invent statistics or quotes.

**Image Prompt agent (system prompt)**
- Role: art director creating one unique, high-quality, professional image for a LinkedIn post.
- Use the topic, target audience, `post_text`, and (when provided) the description and `project_summary` to decide what the image should depict. The image must clearly relate to this specific subject, not a generic "AI" or "technology" visual.
- Project mode: visualize the project's core idea or workflow as a concrete scene or metaphor, not a screenshot.
- Follow the given `art_direction` for style, unless `special_instructions` say something about the image's look — then those win. Specify subject, composition, camera angle or perspective, lighting, color palette, and mood.
- Avoid clichés: no glowing brains, robot handshakes, generic circuit-board backgrounds, or stock-photo office scenes.
- No text, letters, logos, or watermarks inside the image. No real people's faces or brand marks.
- Output one detailed prompt of 60 to 120 words. Return only `{ image_prompt }`.

## Error handling
- Retries (2 to 3) on the HTTP Request Tool, image generation and Intake Agent nodes.
- Errors are handled inline in this workflow. Per-node error outputs (`onError: continueErrorOutput`) on the critical generation nodes (Download Screenshot, GitHub structure fetch, research agent, image generation, LinkedIn post) go to one **Send Error Alert** node ("LinkedIn Content Generator failed…"), which then releases the session.
- Intake Agent errors go to **Send Question** with a "please send it again" message instead (nothing is generating yet).
- Code-node error messages must not contain `:` (n8n truncates the message at the last colon) — URLs in messages are shown without `https://`.
- Approval wait timeout 24 hours → treated as rejected, nothing posted. A `generating` status older than 25 hours counts as idle, so a crashed run can't lock the bot.
- Stale Generate/Reset buttons are checked against the current session and answered "This request has expired".

## Build order (v2)
Status 2026-10-01: all steps done. Live-tested in Telegram with LinkedIn posting temporarily bypassed, then the LinkedIn path was reconnected and the workflow **published** with real posting enabled.

1. Create the **LinkedIn Intake Sessions** data table.
2. Change the Telegram Trigger to `message` + `callback_query` and add **Route Update**. Move the existing approval path behind it and check that Approve/Decline still work.
3. Add the intake chat path (Load Session → Prepare Turn → Is Busy? → Intake Agent → Apply Turn → Save Session → Ready? → Send Recap / Send Question). Test with pinned `message` updates.
4. Add the Generate and Reset tap paths, **Post Inputs** and **Download Screenshot**. Repoint every `$('LinkedIn Post Form')` reference to `$('Post Inputs')`, and re-attach the screenshot from Download Screenshot.
5. Update the Research & Write and Image Prompt prompts for `post_mode` and `special_instructions`.
6. Add **Release Session** after approve, decline/timeout and the error alert. Rename the error alert text.
7. Remove the Form Trigger. Validate the whole workflow.
8. Report back to me. Publish only after I approve, then run the live end-to-end tests with the LinkedIn publish nodes **disabled** for the approve run unless I say otherwise.

## Testing
1. `validate_workflow` passes with no errors.
2. Intake, with pinned Telegram updates:
   - "hi" on an empty session → welcome + topic question with Reset.
   - One message with all required fields + a special instruction → recap with Generate/Reset.
   - One field at a time → asked topic, then audience, then description.
   - "I built …" description → recap says project showcase; "explain …" with no GitHub URL or screenshot → educational; a GitHub URL forces project.
   - A vague message → "didn't catch that" + the same question.
   - A correction after the recap → recap updated.
   - "start over" in text → session cleared.
   - A photo with a caption → `screenshot_file_id` saved, caption parsed.
   - Any message while `status = generating` → busy reply.
3. End to end in the live chat (after publishing):
   - Required fields only → single-image preview → Decline → rejected notice → bot unblocked.
   - All fields + screenshot → two-image album preview → Approve → posted with both images (LinkedIn publish nodes disabled for this run unless I say otherwise).
   - Invalid GitHub URL → error alert → bot unblocked.

## Done when
- "hi" gets a welcome and the topic question with a Reset button. Missing required fields are asked one at a time; all of them in one message goes straight to the recap.
- The recap shows post type, all inputs and special instructions, with Generate and Reset. Nothing is generated before Generate.
- Reset (button or "start over") clears the inputs and starts again from the topic.
- A message while a post is pending only gets the "still waiting" reply. After Approve, Decline, timeout or an error, the bot accepts a new post.
- Tapping Generate sends me one Telegram preview (generated image + post text as caption, exactly as it will appear on LinkedIn), then inline Approve/Decline buttons that work inside the chat. After a tap the message shows my decision and the buttons disappear.
- The text and images posted to LinkedIn are identical to the preview.
- An "I built…" description or any GitHub URL/screenshot gives a project showcase based on my description and the actual structure of the workflow JSON from GitHub. Otherwise the post is educational.
- Special instructions are visibly followed, within the 1,000-character cap and without invented facts.
- With a screenshot, the preview is one album (generated image + screenshot) and the LinkedIn post carries both images in that order. Without it, a single image.
- The generated image is high quality, specific to the topic, audience and (if given) the project, and visibly different in style from run to run.
- An invalid, unreachable or non-workflow GitHub URL sends a Telegram alert instead of a post.
- A failure in any critical node sends a Telegram alert instead of failing silently.
- Messages and taps from anyone other than me are ignored.
- No hardcoded secrets, and `validate_workflow` passes with no errors.

## Optional later
- Schedule a weekly topic list from a data table or sheet as a second input source.
- Log every generated post and its status in an n8n data table.
- Add a GitHub personal access token if a private repo needs showcasing.
