# Plan: LinkedIn Content Agent in n8n

## Goal
Build an n8n workflow that takes a **topic** and **target audience** from a form, researches the topic, writes an educational LinkedIn post, generates a matching image, asks for approval, and then publishes to LinkedIn.

## Instructions for Claude Code
- Use the n8n MCP tools. Before building, call `get_workflow_best_practices`, `get_sdk_reference`, and `search_nodes` to confirm exact node types and parameters. Do not guess node names.
- Build with `create_workflow_from_code`, then run `validate_workflow`, then `test_workflow` (use `prepare_test_pin_data` to pin the form input).
- Use `list_credentials` to find existing credentials. Never hardcode API keys. If a credential is missing, stop and tell me which one to create in n8n.
- Do NOT publish or activate the workflow until I confirm the test run looks right.

## Prerequisites (I set these up in n8n)
- OpenAI credential (the account must be **organization-verified** for image generation) — already exists in the instance (`OpenAI account`).
- Tavily API key (as an HTTP header auth credential) — already exists (`Tavily API`).
- **LinkedIn OAuth2 credential — does NOT exist yet.** Posting is as **person** (my own profile, `postAs: 'person'`), visibility **PUBLIC**. This needs the **Standard** LinkedIn OAuth2 credential (not Community Management), backed by a LinkedIn Developer app with the "Sign in with LinkedIn using OpenID Connect" and "Share on LinkedIn" products enabled. Claude Code: stop before the LinkedIn node and give me exact setup steps rather than guessing scopes.
- **Telegram Bot credential — dedicated bot** for this workflow — created (`LinkedinPost Telegram Bot`, @linkedin_post_tango_bot). Do not reuse `Lead_Generator_Bot` or `UGC_Generation_Bot`. Chat ID `810102376`, used for the preview, approval and alert steps.
- GitHub: the project link is always a **public GitHub URL** pointing at n8n workflow JSON (a `.json` file or a project folder). No credential needed. Private repos are **out of scope for v1** — add a PAT later only if one comes up.
- ~~n8n API key credential~~ — **dropped.** Workflow structure now comes from the JSON committed to GitHub, not from the n8n instance.

## Workflow design

| # | Node | Purpose |
|---|------|---------|
| 1 | **Form Trigger** | Fields: `topic` (text, required), `audience` (text, required), **GitHub URL** → `github_url` (text, optional: link to an n8n workflow `.json` file, `github.com/<owner>/<repo>/blob/<branch>/<path>.json`, or a project folder, `github.com/<owner>/<repo>/tree/<branch>/<folder>`), `project_description` (textarea, optional: short description of the project), **Workflow screenshot** → `workflow_image` (file, optional, single `.png`/`.jpg`/`.jpeg`: a screenshot of the n8n workflow, published as the **second image** of the post). |
| 1a | **Code: Fetch Workflow Structure** | Runs before the agent, no credential. Empty `github_url` → passes the form data through unchanged. File URL → fetches the raw JSON. Folder URL → lists the folder via the GitHub contents API and fetches every `.json` directly inside it, keeping only files with a `nodes` array. Each workflow is **trimmed to structure only**: name, triggers, AI models, services (from node types), node names + types, and connections. Node parameters (prompts, sheet/chat IDs, etc.) are never passed on. Output: form fields + `workflow_structure` (capped at 12,000 chars). A bad URL, any failed fetch, or no workflow JSON found → error output → Telegram alert (no silent fallback). The GitHub README is **not** fetched — for GitHub projects my short description plus the workflow structure is enough. |
| 2 | **AI Agent: Research & Write** | OpenAI chat model. Receives the form fields and `workflow_structure`. Always uses the Tavily search tool for research on the topic. Then writes the post. |
| 2a | └ **HTTP Request Tool** (Tavily) | POST to the Tavily search API. The agent supplies the query via `$fromAI`. |
| 2b | └ **Structured Output Parser** | Returns `{ post_text, project_summary }` (auto-fix on). `project_summary` is a factual 1–3 sentence summary of the project for the image prompt; empty in general mode. |
| 3a | **Set: Art Direction** | Picks one art direction at random from a list (e.g. isometric 3D scene, editorial flat illustration, cinematic photo-real, blueprint/technical diagram style, paper-cut collage, futuristic dark UI render) using a JS expression, so every run gets a different visual style. Output: `art_direction`. |
| 3 | **AI Agent: Image Prompt** | Inputs: `post_text` and `project_summary`, plus `topic`, `audience`, `project_description` and `github_url` from the Form Trigger node, plus `art_direction`. Output: `{ image_prompt }`. |
| 4 | **OpenAI: Generate Image** | `gpt-image-2`, **quality: medium**, **size: 1536x1024** (landscape, works well as a LinkedIn feed image). This model family always returns binary directly — no separate "Convert to File" step needed. |
| 4a | **Code: Attach Workflow Screenshot** + **IF: Has Workflow Screenshot?** | Every node between the form and image generation drops binary, so the uploaded screenshot is re-attached here: output item carries binary `data` (generated image) and, when uploaded, `workflow_image` (screenshot), plus `has_workflow_image`. |
| 5 | **Telegram preview** | ONE combined message in my chat that is an exact preview of the LinkedIn post — same `post_text`, same image binaries as step 8, plain text caption (no parse mode). **No screenshot:** `sendPhoto` with the generated image and `post_text` as caption. **With screenshot:** a 2-photo **album** (`sendMediaGroup`) — generated image first with `post_text` as caption, screenshot second. `sendMediaGroup` only accepts Telegram file IDs/URLs (not binary), and the bot token can't be used outside the Telegram node, so both images are first uploaded silently in parallel (`sendPhoto`, `disable_notification`) to get file IDs, merged, sent as the album, and the two temporary upload messages are then deleted. |
| 6a | **Data table: Save Pending Approval** | Inserts `{ execution_id: $execution.id, resume_url: $execution.resumeUrl }` into the n8n data table **LinkedIn Pending Approvals**. Needed because this instance signs resume URLs (`/webhook-waiting/<id>?signature=<64 hex>`), which is too long for Telegram's 64-byte button data. |
| 6 | **Telegram: Send Message** (inline buttons) | Replies to the preview with "Post this to LinkedIn?" and **inline** buttons **✅ Approve** (`callback_data: a:<execution id>`) and **❌ Decline** (`d:<execution id>`). The decision happens inside the chat — no browser link. (Replaces the earlier "Send and Wait" node, whose buttons open an n8n web page.) |
| 6b | **Wait: Wait for Decision** | Resume on webhook call (POST), timeout **24 hours**. Resumes with `body.decision` = `approve` / `decline`; on timeout it resumes with no body (→ treated as declined). |
| 7 | **IF** | `body.decision === 'approve'` goes to step 8. Anything else (decline or timeout) goes to step 9. |
| 10 | **Telegram Trigger: Button Tap** (second trigger, same workflow) | `callback_query` updates. Do **not** use the trigger's "Restrict to Chat/User IDs" options — on this instance (Telegram Trigger v1.3) they only read `message.chat.id`, so every button tap is silently dropped. Instead the first IF requires `callback_query.message.chat.id` and `callback_query.from.id` = my chat ID, then validates the data (`a:`/`d:` + execution id) → looks up the pending row → posts the decision as a bot reply in the chat ("✅ Approve" / "❌ Decline", replying to the question) → deletes the row (one tap only) → POSTs `{ decision }` to the stored resume URL → edits the question message to "✅ Approved" / "❌ Declined" and removes the buttons → answers the callback. Rejected taps (wrong chat/user or bad data) are only answered, nothing else happens; typed chat messages never reach the workflow because the trigger listens to `callback_query` only. No row (already answered) or a failed resume (run expired) → message edited to "This request has expired or was already answered." Only listens while the workflow is **published**. |
| 8 | **LinkedIn: Create Post** | Post as **person**, visibility **PUBLIC**, `post_text` as commentary. **One image** (no screenshot): the built-in LinkedIn node works (`postAs: 'person'`, `shareMediaCategory: 'IMAGE'`). **Two images** (with screenshot): the built-in node supports only one image, so use HTTP Request nodes with the LinkedIn OAuth2 credential against LinkedIn's REST API — get the person URN (`/v2/userinfo` → `sub`), `POST /rest/images?action=initializeUpload` + `PUT` the binary for each image, then `POST /rest/posts` with `content.multiImage.images` = [generated, screenshot]. Confirm exact headers (`LinkedIn-Version`, `X-Restli-Protocol-Version`) and scopes against LinkedIn docs when building. Then a Telegram message confirms "Posted to LinkedIn". |
| 9 | **Telegram: Send Message** (reject path) | Sends "Post rejected, nothing was published" and ends the run. No LinkedIn call is made. |

## Prompt guidance

**Research & Write agent (system prompt)**
- Role: LinkedIn content writer for the given audience.
- Always call the search tool at least once and base claims on results only.
- **Project mode:** if `github_url` or `project_description` is provided, write the post as a project showcase in my voice ("I built..."), covering the problem, what I built, the tools used, and the result or lesson. If both are empty, write a general educational post on the topic instead.
  - Project facts come **only** from `project_description` and `workflow_structure`. Describe the automation from its actual triggers, nodes and connections in plain language (e.g. "a Telegram message triggers a GPT-5 agent that saves the result to Postgres and replies on Telegram") — no mechanical lists of node names or counts.
  - Never invent features, steps, integrations, metrics, motivations or outcomes. If a GitHub URL is given but the description is empty, describe only what the workflow does, with no claims about results or why it was built.
  - Web search is for context on the topic, never for facts about my project.
  - When a workflow screenshot is attached (`workflow_screenshot_attached: yes`), the post may point readers to it ("the full workflow is in the second image"), but must not describe anything not in `workflow_structure` or my description.
- Format: strong hook in the first line, short paragraphs, one clear takeaway, a light call to action (in project mode, end with the GitHub URL), **max 1,000 characters total including hashtags** (Telegram photo captions are limited to 1,024 characters, and the preview must fit in one message), at most 3 hashtags, no emojis in the first line.
- Never invent statistics or quotes.

**Image Prompt agent (system prompt)**
- Role: art director creating one unique, high-quality, professional image for a LinkedIn post.
- Use the topic, target audience, `post_text`, and (when provided) `project_description` and `project_summary` (what the workflow does, its trigger, AI models, services and main flow, taken from the fetched structure) to decide what the image should depict. The image must clearly relate to this specific subject, not a generic "AI" or "technology" visual.
- Project mode: visualize the project's core idea or workflow as a concrete scene or metaphor (for example, the flow of data through the automation it performs), not a screenshot.
- Follow the given `art_direction` for style. Specify subject, composition, camera angle or perspective, lighting, color palette, and mood. Choose colors and tone that suit the audience.
- Avoid clichés: no glowing brains, robot handshakes, generic circuit-board backgrounds, or stock-photo office scenes.
- No text, letters, logos, or watermarks inside the image (image models render text poorly). No real people's faces or brand marks.
- Output one detailed prompt of 60 to 120 words. Return only `{ image_prompt }`.

## Error handling
- Set retries (2 to 3) on the HTTP Request Tool and image generation nodes.
- **Keep it simple: handle errors inline in this workflow, not a separate shared error workflow.** Wire per-node error outputs (`onError: continueErrorOutput`) on the critical nodes (GitHub structure fetch, research agent, image generation, LinkedIn post) into one Telegram alert node within this same workflow, so nothing fails silently.
- Code-node error messages must not contain `:` (n8n truncates the message at the last colon) — URLs in messages are shown without `https://`.
- Set a timeout on the approval wait (24 hours). If there is no response, treat it as rejected and do not post.

## Build order
1. Skeleton: Form Trigger, Research & Write agent (with Tavily tool), test with pinned input.
2. Add the Fetch Workflow Structure code step before the agent, and confirm it handles an empty URL, a `.json` file URL, a folder URL, and an invalid URL (→ alert).
3. Add the Image Prompt agent and image generation (`gpt-image-2`, medium quality), and confirm a valid image file comes out.
4. Add the Telegram approval flow (Send Photo, save pending run, inline-button message, Wait for Decision, IF with both branches) plus the Telegram Trigger path that resumes the waiting run on a button tap.
5. Add the LinkedIn node, but test it with the node **disabled** first, and confirm the reject path posts nothing. This step needs the LinkedIn OAuth2 credential created first — pause and hand me setup steps if it's still missing.
6. Wire inline error handling (per-node error outputs → one Telegram alert node).
7. Validate the whole workflow and do a full test run.
8. Report back to me. Publish only after I approve.

## Done when
- Submitting the form sends me one Telegram message with the generated image and the post text as its caption, exactly as it would appear on LinkedIn, followed by a short message with inline Approve and Decline buttons that work inside the chat (no browser link). After a tap the message shows my decision as text and the buttons disappear.
- The text and image that get posted to LinkedIn are identical to the preview (same `post_text`, same image binary).
- With only topic and audience filled in, the post is a general educational post. With a GitHub URL and/or project description, the post is a project showcase based on my description and the actual node structure of the workflow JSON fetched from GitHub (file or folder), not a README and not a screenshot.
- A GitHub URL that is invalid, unreachable, or contains no workflow JSON sends a Telegram alert instead of a post.
- The two project fields are optional, so the form submits fine without them.
- With a workflow screenshot uploaded, the Telegram preview is one album (generated image + screenshot, post text as caption) and the LinkedIn post carries both images in the same order. Without it, a single image as before.
- The generated image is high quality, specific to the topic, audience and (if given) the project, and visibly different in style from run to run.
- Approve posts to LinkedIn with the image and confirms on Telegram. Decline (or timeout) posts nothing and sends a "rejected" message.
- A failure in any critical node sends me a Telegram alert instead of failing silently.
- No hardcoded secrets, and `validate_workflow` passes with no errors.

## Optional later
- Schedule a weekly topic list from a data table or sheet instead of the form.
- Log every generated post and its status in an n8n data table.
- Add a GitHub personal access token if a private repo needs showcasing.
