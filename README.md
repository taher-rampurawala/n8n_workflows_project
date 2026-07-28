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
└── UGC Image & Video Generator Automation/
    ├── UGC Content Studio - Telegram Bot.json
    ├── UGC Content Studio - Error Alerts.json
    └── UGC Content Studio - Session Cleanup.json
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
