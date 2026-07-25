# n8n Workflows Project

A portfolio of production-style [n8n](https://n8n.io) automation workflows — covering conversational booking systems, integrations, and business process automation, built to solve real-world operational problems.

## 📋 Table of Contents

- [n8n Workflows Project](#n8n-workflows-project)
  - [📋 Table of Contents](#-table-of-contents)
  - [🎯 Overview](#-overview)
  - [🚀 Projects](#-projects)
    - [1. WhatsApp Doctor Appointment Booking](#1-whatsapp-doctor-appointment-booking)
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

## 🛠️ Technologies Used

### Integrations

- **WhatsApp Business API** — messaging platform (trigger + send)
- **Google Sheets** — booking records / logging

### n8n Features

- Data Tables (session & state persistence)
- Switch / If routing for multi-step conversation logic
- Aggregate nodes for slot-availability computation
- HTTP Request nodes
- Webhook-based triggers

---

## 📁 Repository Structure

```
n8n_workflows_project/
├── README.md
└── WhatsApp Doctor Appointment Booking/
    └── whatsapp-doctor-appointment-booking.json
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
   - Google Sheets OAuth2 credentials (where used)

### Installation Steps

1. **Import a workflow**
   - Open the desired project folder and locate the `.json` file
   - In n8n: **Workflows → Import from File**, and select the JSON

2. **Configure credentials**
   - Set up the required integration credentials in n8n's Credentials panel (WhatsApp, Google Sheets, etc.)

3. **Update workflow-specific settings**
   - Replace placeholder IDs (WhatsApp phone number ID, Data Table/Sheet IDs) with your own
   - Review Set nodes for any clinic/business-specific text that needs customizing

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
- Google Workspace account (for Sheets integration, where used)

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
