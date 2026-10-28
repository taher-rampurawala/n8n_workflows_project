# Context: Upwork Jobs Automation

## Domain terms

**Job** — An Upwork job posting scraped via an Apify actor on a schedule. Raw jobs are cleaned/normalized before scoring.

**Target Niche** — n8n / AI-automation work only (workflow builds, agentic chatbots, RAG agents). Explicitly excludes the freelancer's enterprise Java/Spring Boot/backend-integration background — that market isn't sourced through Upwork's open marketplace.

**Fit Score** — A 1–10 score an LLM assigns to a Job against the Target Niche criteria (skills match, budget reasonableness, client quality).

**Qualifying Threshold** — The minimum Fit Score (starting value: 7) a Job must reach to become a Qualifying Job.

**Qualifying Job** — A Job whose Fit Score meets or exceeds the Qualifying Threshold; the only Jobs that proceed to Proposal generation.

**Red Flag** — A signal the scoring prompt treats as a reason to score a Job low regardless of surface fit: budget/scope mismatch (e.g. "build an AI SaaS" for under $200), a request for unpaid trial work, or a brief too vague to score confidently.

**Proposal** — An AI-drafted response to a Qualifying Job, generated from the Freelance Bio and grounded in the client's own language. Always reviewed by a human before sending — never auto-submitted (Upwork's API restricts automated proposal submission).

**Freelance Bio** — The document (`docs/freelance-bio.md`) that grounds Proposal generation: engineering background, n8n/AI-automation skills, and Portfolio Projects. Kept separate from the CV — the CV is written for employers, the Bio for freelance clients.

**Portfolio Project** — One of the freelancer's own built n8n automations (WhatsApp CRM, Meridian/Musafir AI chatbot, UGC Image & Video Generator, Gmail Inbox Assistant, Invoice Processing Automation, Job Search Automation, AI Lead Generation Automation) presented in the Bio as evidence of capability. Not claimed as paid client work, and not labeled as practice — framed plainly as portfolio work demonstrating the skill.

## Decisions

- **Apify actor**: `hyperbach/upwork-scraper-ai` (id `RDMDCh3d2XZKng8Mz`), chosen to fit Apify's free plan ($5/month credit): $0.002/job, no platform fees, empty runs free. `neatrat/upwork-job-scraper` was dropped because it refuses free-plan accounts. `notifications_only` returns only jobs new since the last run, so each Job is billed once. Request: `any_words` keywords, `none_words` excluding human-role jobs (customer support, video editor, data entry…), payment-verified clients only, posted in the last 3 hours. Measured with the actor's estimate mode on 2026-10-28: ~61 jobs/day, ~$3.68/month (without the exclusions and payment filter: ~139/day, $8.35). Send only the keys you mean — the Apify console adds `false` for every checkbox field, and this actor treats `false` as a filter. A saved copy lives in Apify as task `tangohi5/upwork-jobs-automation`, but n8n calls the actor directly.
- **Schedule**: every 2 hours, around the clock, up to 20 Jobs/run (not hourly, to keep Apify and LLM costs down). The 1-hour overlap between runs prevents gaps; a Remove Duplicates node keyed on job URL ensures each Job is processed once.
- **AI split**: OpenAI only. `gpt-5.4-mini` scores every Job; `gpt-5.4` drafts Proposals only for Qualifying Jobs.
- **Search keywords**: "n8n", "workflow automation", "AI agent", "voice agent", "voice AI", "RAG", "chatbot automation".
- **Output**: logged to a new, dedicated Google Sheet (not an existing one).
- **Infra**: runs on the freelancer's existing self-hosted n8n instance (Hostinger); finished workflow exported as JSON and imported there.
