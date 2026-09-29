# n8n Workflows Project

A curated portfolio of [n8n](https://n8n.io) automation projects, showcasing practical, production-oriented workflow design across AI agents, integrations, and business process automation. This repository is actively maintained and grows as new projects are added.

## 📋 Table of Contents

- [n8n Workflows Project](#n8n-workflows-project)
  - [📋 Table of Contents](#-table-of-contents)
  - [🎯 Overview](#-overview)
  - [🚀 Projects](#-projects)
    - [1. WhatsApp Doctor Appointment Booking](#1-whatsapp-doctor-appointment-booking)
    - [2. AI Lead Generation Automation](#2-ai-lead-generation-automation)
    - [3. Gmail Inbox Assistant](#3-gmail-inbox-assistant)
    - [4. Invoice Processing Automation](#4-invoice-processing-automation)
    - [5. Job Search Automation](#5-job-search-automation)
    - [6. UGC Image \& Video Generator Automation](#6-ugc-image--video-generator-automation)
    - [7. AI Automation ChatBot](#7-ai-automation-chatbot)
    - [8. WhatsApp CRM](#8-whatsapp-crm)
    - [9. LinkedIn Content Generation](#9-linkedin-content-generation)
  - [🛠️ Technologies Used](#️-technologies-used)
    - [Integrations](#integrations)
    - [n8n Features](#n8n-features)
  - [📁 Repository Structure](#-repository-structure)
  - [📦 Setup Instructions](#-setup-instructions)
    - [Prerequisites](#prerequisites)
    - [Installation Steps](#installation-steps)
  - [🔑 Prerequisites](#-prerequisites)
    - [Technical Requirements](#technical-requirements)
    - [Account Requirements](#account-requirements)
  - [🤝 Contributing](#-contributing)
  - [📝 License](#-license)
  - [📧 Contact](#-contact)

---

## 🎯 Overview

This repository showcases a curated collection of n8n workflows designed and built to automate real business processes — from customer-facing conversational systems to backend integrations and data operations. Each workflow is built with production use in mind: clear state management, input validation, and reliable error handling, rather than as a proof of concept.

The goal of this portfolio is to demonstrate practical, end-to-end automation design — translating a business requirement into a well-structured, maintainable n8n workflow.

Each project lives in its own folder containing the exported workflow JSON, ready to be imported directly into any n8n instance.

---

## 🚀 Projects

### 1. WhatsApp Doctor Appointment Booking

**Folder:** [`WhatsApp Doctor Appointment Booking/`](./WhatsApp%20Doctor%20Appointment%20Booking/)

**Description:** A deterministic, state-machine driven WhatsApp booking flow built for a dental clinic. The workflow guides patients through a full appointment booking conversation — greeting, name/age collection, reason for visit, real-time slot availability, and booking confirmation — entirely through WhatsApp messages, without relying on an LLM.

**Key Features:**

- 💬 Full conversational booking flow driven by WhatsApp Trigger/Send nodes
- 🗂️ Stateful conversation tracking via n8n Data Tables (session step, patient details, retry attempts)
- 📅 Real-time slot availability check for same-day evening slots (7:00–8:30 PM)
- ➡️ Automatic next-day slot offer when the current day is fully booked
- ✅ Input validation at every step (name, age, reason, yes/no responses)
- 🔁 Retry-limit tracking per step with a "reset conversation" escape hatch after repeated invalid input
- 🧾 Booking log maintained via Google Sheets / Data Tables append
- 🎯 Professional, clinic-appropriate tone throughout the conversation

**Use Cases:**

- Healthcare / clinic appointment scheduling via WhatsApp
- Deterministic (non-AI) conversational automation where predictable, auditable flows are required
- Template for other appointment-based booking bots (salons, service businesses, consultations)

---

### 2. AI Lead Generation Automation

**Folder:** [`AI Lead Generation Automation/`](./AI%20Lead%20Generation%20Automation/)

**Description:** A two-workflow lead generation pipeline built around a conversational AI agent on Telegram. Users describe the leads they need (location, industry, job title) via text or voice, and the agent gathers requirements, triggers a scraping sub-workflow via Apify, and delivers deduplicated results as a Google Sheet emailed directly to the requester.

**Key Features:**

- 🤖 Conversational AI agent (GPT-5-mini) that collects search criteria one question at a time
- 🎤 Voice message support — Telegram voice notes are transcribed via OpenAI Whisper before reaching the agent
- 🧠 Persistent per-chat session memory backed by n8n Data Tables, with a conversation reset command
- 🔍 Automated lead scraping through an Apify actor, called as a tool sub-workflow from the AI agent
- 🧹 Deduplication of results across runs (matched by LinkedIn URL)
- 📊 Results delivered as a fresh Google Sheet per request
- 📧 Automatic email notification with the Google Sheet link via Gmail

**Use Cases:**

- Sales / business development lead prospecting through a chat interface
- Automating manual lead research and handoff to a scraping tool
- Reference pattern for AI agent + sub-workflow tool-calling in n8n

---

### 3. Gmail Inbox Assistant

**Folder:** [`Gmail Inbox Assistant/`](./Gmail%20Inbox%20Assistant/)

**Description:** An AI-powered Gmail inbox manager that automatically categorizes incoming mail (Primary / Social / Promotions), applies labels and routes each category accordingly, and drafts or sends context-aware replies to professional inquiries using a Pinecone-backed retrieval-augmented (RAG) agent grounded in the account owner's own profile data.

**Key Features:**

- 📥 Automatic email categorization via an AI Text Classifier (Primary / Social / Promotions)
- 🏷️ Gmail label management and inbox triage (mark-as-read, forward, archive by category)
- 🧠 Retrieval-augmented reply agent — answers professional/recruiting inquiries using a Pinecone vector store of the owner's CV/profile data
- ✍️ A second AI classifier + writer decides whether an email needs a reply, then drafts one or files it as a Gmail draft for review
- 🔀 Multi-branch Switch routing between auto-reply, draft, and no-action paths
- 📄 Structured JSON output parsing for reliable subject/body generation

**Use Cases:**

- Personal inbox triage and auto-labeling
- Automated, RAG-grounded responses to recruiter/professional outreach
- Reducing manual email management overhead

---

### 4. Invoice Processing Automation

**Folder:** [`Invoice Processing Automation/`](./Invoice%20Processing%20Automation/)

**Description:** A Google Drive-triggered invoice/receipt processing pipeline. Dropping a file into a watched folder triggers AI-powered OCR extraction of structured data, appends the parsed invoice to a Google Sheet, renames the file to a consistent convention, and files it into processed or error folders based on extraction success.

**Key Features:**

- 📂 Google Drive folder watcher — triggers on new invoice/receipt uploads
- 🧾 AI-powered OCR extraction (vision-capable LLM) pulling structured fields: date, invoice number, supplier, tax, totals, expense category, payment method
- ✅ Error handling — failed extractions are routed to a separate "Error Invoice" folder instead of failing silently
- 📊 Structured logging of every processed invoice to a Google Sheet
- 🔄 Automatic file renaming (date, vendor, invoice ID, amount) and move to a "Processed" folder
- 🗂️ End-to-end paperless expense tracking with no manual data entry

**Use Cases:**

- Automated bookkeeping / expense tracking
- Receipt and invoice digitization for accounting workflows
- Template for document-extraction pipelines using vision LLMs

---

### 5. Job Search Automation

**Folder:** [`Job Search Automation/`](./Job%20Search%20Automation/)

**Description:** A scheduled job-search pipeline that scrapes job listings via Apify, scores each listing against a candidate profile using an LLM-based fit evaluator, and automatically generates a tailored cover letter for strong, remote-eligible matches — logging everything to a Google Sheet for application tracking.

**Key Features:**

- ⏰ Daily scheduled scraping of job listings via an Apify scraper actor
- 🔁 Batch processing of results via a Loop Over Items node
- 🎯 LLM-based fit scoring (1–5 scale) against a candidate profile, with structured JSON output (strengths, gaps, recommendation)
- 🌍 Automatic filtering for high-fit (score ≥ 4) and remote-eligible roles only
- ✍️ AI-generated, tailored cover letters for qualifying roles
- 📊 Full results (score, cover letter, salary, location, status) logged to a Google Sheet for application tracking

**Use Cases:**

- Automated job search and application triage
- Personalized cover letter generation at scale
- Template for AI-based candidate/job matching pipelines

> **Note:** The example candidate profile embedded in this workflow's prompts has been genericized for portfolio publication — names, phone numbers, and email addresses are placeholders.

---

### 6. UGC Image & Video Generator Automation

**Folder:** [`UGC Image & Video Generator Automation/`](./UGC%20Image%20&%20Video%20Generator%20Automation/)

**Description:** A Telegram bot that turns a single product photo into UGC-style (user-generated-content) marketing assets. Users send a product photo and answer a short guided conversation — generation mode, caption, and visual style — and a vision-enabled AI agent researches current short-form trends before writing tailored image and video prompts. Assets are then generated via Kie.ai (Nano Banana 2 for images, Veo 3.1 for video) and delivered back into the chat. Ships as a three-workflow set: the main bot, a catch-all error alerter, and an hourly session-cleanup job.

**Key Features:**

- 🤖 Vision-enabled AI agent (GPT-5-mini) that reads the actual product photo and grounds every prompt in what it sees
- 🔎 Live trend research via a Tavily search tool called by the agent before prompt generation
- 📐 Structured output parsing with an auto-fixing parser, producing separate `image_prompt` and `video_prompt` fields
- 🎨 Image generation via Kie.ai **Nano Banana 2** (Gemini 3.1 Flash Image), 9:16 vertical, 2K
- 🎬 Video generation via Kie.ai **Veo 3.1** (`veo3_fast`, reference-to-video) with native audio
- 🗂️ Stateful multi-step conversation backed by Postgres (`ugc_sessions`), routed by a step-based state machine
- ⏳ Asynchronous job polling — create-task → wait → poll status → extract result URL, for both media types
- 🛡️ Guard nodes that detect API-level failures returned as HTTP 200 with an error `code`, routing them into real retry loops
- 🔁 Bounded retry-with-backoff around both generation paths, with graceful user-facing failure messages
- 🚨 Companion error-alert workflow that notifies an admin chat with the failing node and execution link
- 🧹 Hourly cleanup of abandoned mid-conversation sessions (Postgres has no native TTL)

**Use Cases:**

- Rapid UGC-style ad creative generation for e-commerce and D2C product listings
- Turning a single catalogue photo into social-ready vertical image and video assets
- Reference pattern for async third-party job APIs (create → poll → deliver) in n8n
- Template for Postgres-backed conversational state machines on Telegram

> **Note:** The Telegram bot token embedded in this workflow's `Build Image URL` node has been replaced with the placeholder `YOUR_TELEGRAM_BOT_TOKEN` for portfolio publication. Replace it with your own token (or an n8n variable) before importing.

---

### 7. AI Automation ChatBot

**Folder:** [`AI Automation ChatBot/`](./AI%20Automation%20ChatBot/)

**Description:** An AI travel-consultant chat agent — **Musafir** — built for a fictional boutique agency, **Meridian & Co.**, paired with a full companion Next.js marketing site that embeds it as a floating chat widget. Unlike the other projects in this repo, this one ships as a **two-part project**: the n8n workflow (`Musafir-Chat-Agent.json`) and the site that talks to it (`meridian-travel/`). The agent answers destination, package, and policy questions by calling **live per-topic Google Sheets lookup tools** rather than working from a pre-loaded knowledge base, reasons through discovery/pricing/escalation rules with a dedicated Think tool, and hands off to a human via a branded HTML email when a request is out of scope.

**Key Features:**

- 🧳 Agent-driven knowledge retrieval — 7 separate `lookup_*` Google Sheets tools (overview, destinations, packages, itinerary, about us, FAQs, contact info) called only when the agent actually needs them, instead of pre-fetching all 7 tabs on every message
- 🧠 Structured JSON output (`reply` / `escalate` / `escalation`) via an auto-fixing Structured Output Parser, wired to its own dedicated model connection for the auto-fix retry call
- 🤔 A private **Think** tool the agent uses to reason through discovery completeness, escalation conditions, and price-estimate math before answering — never shown to the customer
- 📐 Mandatory discovery gate (budget, preference, region) enforced conversationally, one question at a time, before any package recommendation
- 🚨 3-condition escalation logic (knowledge gap / not in catalogue / ready to book) that emails a branded HTML enquiry to a human, only once at least one contact method is captured
- 🛡️ Graceful degradation on model-format failures — `onError: continueErrorOutput` on the agent node routes malformed structured-output errors to a sanitized 500 response instead of hanging the caller
- 💬 A production-grade chat widget on the companion site — resizable between compact / half-screen split / full-screen, suggested prompt chips, typing indicator, abortable in-flight requests, and a "demo mode" fallback when no webhook is configured
- 🔄 Stateless-by-design sessions — no client-side persistence, so reloading the page always starts a fresh conversation

**Use Cases:**

- Reference pattern for an **agent-driven** (call-on-demand) knowledge base over Google Sheets, as opposed to a pre-fetch-everything RAG approach
- Template for pairing a marketing-site chat widget with an n8n backend, including CORS and session-ID handling
- Human-handoff / escalation design for an AI agent that must never over-promise pricing or availability

> **Knowledge base:** `Meridian_Travel_Knowledge_Base.xlsx` in this folder is the source spreadsheet the 7 lookup tools read from — import it into Google Sheets and reconnect the tool nodes' credentials before use.
>
> **Frontend:** `meridian-travel/` is a separate Next.js 16 / React 19 app (see its own `CLAUDE.md` for the full build standard). Run `npm install` then `npm run dev` inside that folder, and set `NEXT_PUBLIC_N8N_CHAT_WEBHOOK_URL` in its `.env.local` to your n8n webhook's production URL to connect the widget.

---

### 8. WhatsApp CRM

**Folder:** [`WhatsApp CRM/wacrm/`](./WhatsApp%20CRM/wacrm/)

**Description:** Unlike the other entries in this repo, this isn't an n8n workflow export — it's a full **self-hosted CRM application** (Next.js 16 + Supabase) built on the official WhatsApp Business Cloud API, used here as the customer-facing automation layer that pairs with the n8n workflows above (e.g. wiring its Automations/Flows builder or webhook steps into an n8n backend for booking logic, similar in spirit to the WhatsApp Doctor Appointment Booking workflow). It ships with two independent, built-in automation engines plus an MCP server so the CRM itself can be driven from Claude, Cursor, and other AI assistants.

**Key Features:**

- 💬 Shared inbox on the official WhatsApp Business Cloud API — multi-agent, per-conversation assignment, status, and notes
- 👥 Contacts with tags, custom fields, CSV import, and deduplication
- 📊 Kanban sales pipelines with deals linked to conversations
- 📣 Broadcasts with Meta-approved templates, delivery/read tracking, per-recipient variable substitution
- 🤖 Two no-code automation engines built in: a linear **Automations** builder (trigger → send message/buttons/list → wait → condition → webhook → tag/assign steps) and a graph-based **Flows** builder for stateful, branching WhatsApp chatbots
- 🧠 AI reply assistant (bring-your-own OpenAI or Anthropic key) with optional knowledge-base retrieval (Postgres full-text, or pgvector for semantic search)
- 🔌 Public REST API (`/api/v1`) with scoped, revocable API keys, plus an MCP server for driving the CRM from AI coding assistants
- 🔐 Supabase-backed (Postgres + Auth + Storage + RLS) with AES-256-GCM token encryption and HMAC-verified webhooks
- 👤 Multi-user accounts with role-based access (owner / admin / agent / viewer)

**Use Cases:**

- Standalone, self-hosted WhatsApp CRM for small businesses (salons, clinics, service providers) needing a shared inbox plus appointment/booking automation
- Companion CRM layer for n8n-driven conversational workflows elsewhere in this repo — e.g. list-message based package browsing and appointment booking
- Reference for building an MCP server against a real product's own REST API

> **Setup:** `WhatsApp CRM/wacrm/` is a fork of the open-source [ArnasDon/wacrm](https://github.com/ArnasDon/wacrm) template and manages its own dependencies, Supabase migrations, and environment file — see its own [README.md](./WhatsApp%20CRM/wacrm/README.md) for full setup. Run `npm install` then `npm run dev` inside that folder; copy `.env.local.example` to `.env.local` and fill in your Supabase + Meta WhatsApp credentials (never committed — see below).

---

### 9. LinkedIn Content Generation

**Folder:** [`LinkedIn Content Generation/`](./LinkedIn%20Content%20Generation/)

**Description:** A human-in-the-loop LinkedIn content agent. A form takes a topic and target audience, plus an optional GitHub link to an n8n workflow, a short project description, and a workflow screenshot. An AI agent researches the topic with Tavily and writes an educational post, or a project showcase grounded in the workflow's real structure fetched from GitHub. A second agent art-directs a matching image, generated with `gpt-image-2`. The exact post is previewed in Telegram, and nothing reaches LinkedIn until the owner taps **Approve** on an inline button. Approved posts are published to the owner's **personal LinkedIn profile** (not a company page), with one image or two (generated image + workflow screenshot).

**Key Features:**

- 📝 Form trigger with required topic/audience and optional GitHub URL, project description, and screenshot upload
- 🔗 GitHub-grounded project mode — fetches the workflow JSON (single file or a whole project folder) and trims it to structure only (triggers, models, services, node flow, connections), so the post describes what the automation actually does and never invents features
- 🔎 Research & Write agent that always calls a Tavily search tool, with a structured output parser (auto-fix on) returning `post_text` and `project_summary`
- 🎨 Randomised art direction per run plus an Image Prompt agent, then `gpt-image-2` at 1536×1024 for a feed-ready landscape image
- 📲 Exact Telegram preview — a single photo, or a 2-image album when a screenshot is attached — using the same text and image bytes that get posted
- ✅ In-chat approval with inline **Approve / Decline** buttons: a tap posts the decision as a reply in the chat and resumes the waiting run through a signed resume URL stored in an n8n Data Table (Telegram's 64-byte button limit rules out embedding the URL)
- 🔒 Tap validation — only the owner's chat/user ID and well-formed button data are accepted; stale taps show "expired", typed messages are ignored, and a 24-hour timeout counts as declined
- 💼 LinkedIn publishing as a person: the built-in LinkedIn node for single-image posts, and the LinkedIn REST API (Images `initializeUpload` → upload → Posts `multiImage`) for two-image posts
- 🚨 Per-node error outputs on every critical step (GitHub fetch, agent, image generation, LinkedIn calls) routed to one Telegram alert — no silent failures

**Use Cases:**

- Consistent, research-backed LinkedIn posting with a final human review before anything goes public
- Turning finished automation projects into showcase posts straight from their GitHub folder
- Reference pattern for Telegram inline-button approval that resumes an n8n Wait node, and for binary data that must survive a long wait

> **Setup:** Requires an OpenAI credential (organization-verified for image generation), a Tavily API key as Header Auth, a dedicated Telegram bot, and a **LinkedIn OAuth2 (Standard)** credential backed by a LinkedIn Developer app with *Sign in with LinkedIn using OpenID Connect* and *Share on LinkedIn* enabled. After import, select the LinkedIn credential in the three HTTP Request nodes of the two-image path, create a Data Table with `execution_id` and `resume_url` columns, and replace the Telegram chat ID, LinkedIn person ID, and Data Table ID with your own. The Telegram button trigger only receives taps while the workflow is **published**. `linkedin-agent-n8n-plan.md` documents the full design.

---

## 🛠️ Technologies Used

### Integrations

- **WhatsApp Business API** — messaging platform (trigger + send)
- **Telegram** — messaging platform (trigger + send, text and voice)
- **Gmail** — inbox automation, labeling, and email delivery
- **Google Sheets** — booking, lead, invoice, and job-search data logging
- **Google Drive** — invoice/receipt file watching and storage
- **Pinecone** — vector store for retrieval-augmented email replies
- **Apify** — third-party actors for lead scraping and job scraping
- **OpenAI** — GPT models for conversational agents and classifiers, Whisper for voice transcription, embeddings for RAG
- **Google Gemini** — vision-capable LLM for invoice OCR extraction
- **Kie.ai** — unified API for Nano Banana 2 (image) and Veo 3.1 (video) generation
- **Tavily** — live web search tool for AI-agent trend research
- **PostgreSQL** — session/state persistence for the UGC bot conversation
- **Next.js / React** — companion marketing site with an embedded AI chat widget (AI Automation ChatBot), and the full WhatsApp CRM application
- **Supabase** — Postgres + Auth + Storage + RLS backing the WhatsApp CRM
- **Model Context Protocol (MCP)** — server exposing the WhatsApp CRM's own API to Claude/Cursor and other AI assistants
- **LinkedIn API** — posting to a personal profile via the LinkedIn node and the REST Images/Posts APIs (multi-image posts)
- **GitHub** — public contents/raw API for fetching n8n workflow JSON to ground project-showcase posts

### n8n Features

- AI Agent nodes with tool-calling sub-workflows
- Text Classifier and structured output parser nodes
- Vector store (Pinecone) retrieval for RAG
- Data Tables (session & state persistence)
- Switch / If routing for multi-step conversation and decision logic
- Aggregate nodes for slot-availability computation
- Loop / batch processing (Split In Batches)
- HTTP Request nodes
- Webhook, schedule, and file-watcher triggers
- Error Trigger workflows for centralized failure alerting
- Wait nodes for asynchronous job polling loops
- Per-node error outputs (`onError: continueErrorOutput`) with bounded retry branches
- Agent-driven (call-on-demand) tool retrieval — per-topic Google Sheets tools instead of a single pre-fetch step
- Think tool for private, pre-answer agent reasoning
- Structured Output Parser with auto-fix, wired to its own model connection
- Form trigger with file upload
- Human-in-the-loop approval — Wait node resumed by a webhook from a Telegram inline-button tap

---

## 📁 Repository Structure

```
n8n_workflows_project/
├── README.md
├── WhatsApp Doctor Appointment Booking/
│   └── whatsapp-doctor-appointment-booking.json
├── AI Lead Generation Automation/
│   ├── ultimate-lead-generation-automation.json
│   └── lead-scraping.json
├── Gmail Inbox Assistant/
│   └── n8n-gmail-automation.json
├── Invoice Processing Automation/
│   └── n8n-invoice-agent-automation.json
├── Job Search Automation/
│   └── indeed-job-search-automation.json
├── UGC Image & Video Generator Automation/
│   ├── UGC Content Studio - Telegram Bot.json
│   ├── UGC Content Studio - Error Alerts.json
│   └── UGC Content Studio - Session Cleanup.json
├── AI Automation ChatBot/
│   ├── Musafir-Chat-Agent.json
│   ├── Meridian_Travel_Knowledge_Base.xlsx
│   ├── CLAUDE.md
│   └── meridian-travel/          # companion Next.js chat-widget frontend
├── WhatsApp CRM/
│   └── wacrm/                    # self-hosted Next.js + Supabase CRM (own repo/README)
└── LinkedIn Content Generation/
    ├── LinkedIn Content Agent.json
    └── linkedin-agent-n8n-plan.md  # design plan for the workflow
```

Each project folder is self-contained and includes the exported workflow JSON. New projects will be added as additional top-level folders following the same convention.

---

## 📦 Setup Instructions

### Prerequisites

1. **n8n Installation**

   ```bash
   npm install -g n8n
   # or
   docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n
   ```

2. **Required API Keys / Credentials**
   - WhatsApp Business API credentials
   - Telegram Bot API token
   - Google Sheets / Gmail / Google Drive OAuth2 credentials
   - Pinecone API key
   - Apify API token
   - OpenAI API key
   - Google Gemini API key
   - Kie.ai API key (image/video generation)
   - Tavily API key (agent web search)
   - PostgreSQL connection (UGC bot session store)
   - LinkedIn OAuth2 credential (Standard) for posting to a personal profile

### Installation Steps

1. **Import a workflow**
   - Open the desired project folder and locate the `.json` file
   - In n8n: **Workflows → Import from File**, and select the JSON

2. **Configure credentials**
   - Set up the required integration credentials in n8n's Credentials panel (WhatsApp, Telegram, Google Sheets, Gmail, Google Drive, Pinecone, Apify, OpenAI, Gemini, etc.)

3. **Update workflow-specific settings**
   - Replace placeholder IDs (WhatsApp phone number ID, Data Table/Sheet/Drive folder IDs) with your own
   - Replace any placeholder values such as `YOUR_GOOGLE_API_KEY` with your own credentials — these are intentionally redacted in the published JSON
   - Review Set nodes and AI prompts for any business-specific or example text that needs customizing

4. **Test the workflow**
   - Use n8n's manual execution / pinned data to test each branch
   - Verify the full conversation path end-to-end via a test WhatsApp number

5. **Activate**
   - Turn the workflow on and monitor executions for errors

---

## 🔑 Prerequisites

### Technical Requirements

- n8n instance (cloud or self-hosted)
- Webhook endpoint reachable by WhatsApp (for triggers)
- Node.js 20+ and npm (for the companion Next.js frontend in `AI Automation ChatBot/meridian-travel`, and for the full `WhatsApp CRM/wacrm` application)
- Supabase project (Postgres + Auth) for `WhatsApp CRM/wacrm`
- Stable internet connection

### Account Requirements

- WhatsApp Business account with API access
- Telegram account (for Bot creation via BotFather)
- Google Workspace account (Sheets, Gmail, Drive)
- Pinecone account (for vector store retrieval)
- Apify account (for lead and job scraping actors)
- OpenAI account (for GPT models, Whisper transcription, and embeddings)
- Google AI Studio account (for Gemini API access)
- Kie.ai account with credits (for Nano Banana 2 image and Veo 3.1 video generation)
- Tavily account (for AI-agent web search)
- PostgreSQL database (for UGC bot conversation state)
- LinkedIn Developer app with *Sign in with LinkedIn using OpenID Connect* and *Share on LinkedIn* (for the LinkedIn content agent)

---

## 🤝 Contributing

This is a personal portfolio repository, but suggestions and feedback are always welcome — feel free to open an issue.

---

## 📝 License

This project is open source and available under the MIT License.

---

## 📧 Contact

For questions, suggestions, or collaboration:

- **Email:** taher.advisor@gmail.com
