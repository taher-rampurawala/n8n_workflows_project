// Creates or updates Riya in Retell from the prompt files in this folder.
//   node "Booking Appointment using Voice AI Agent/retell/setup-retell.js" [--no-secret]
// Env: RETELL_API_KEY (required), CLINIC_WEBHOOK_SECRET (the n8n "Retell Webhook - X-Clinic-Secret" value).
// --no-secret creates the custom functions without the X-Clinic-Secret header (n8n rejects them until rerun).
// Created ids are kept in retell-ids.json so reruns update the same LLM and agent.
const fs = require('fs');
const path = require('path');

const API = 'https://api.retellai.com';
const WEBHOOK_URL = 'https://n8n.srv1789828.hstgr.cloud/webhook/retell/dental-booking';
const RECEPTION = '+919163495068';
const IDS_FILE = path.join(__dirname, 'retell-ids.json');

const apiKey = process.env.RETELL_API_KEY;
const secret = process.env.CLINIC_WEBHOOK_SECRET;
if (!apiKey) throw new Error('RETELL_API_KEY is not set');
if (!secret && !process.argv.includes('--no-secret')) throw new Error('CLINIC_WEBHOOK_SECRET is not set (or pass --no-secret)');

const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8').replace(/\r\n/g, '\n');

// State name → prompt file. Edges come from each file's "## Transitions" lines.
const STATES = {
  intro: 'states/01_intro.md',
  booking: 'states/02_booking.md',
  faq: 'states/03_faq.md',
  transfer: 'states/04_transfer.md',
  closing: 'states/05_closing.md',
};

function edgesFrom(md) {
  const section = md.split('## Transitions')[1]?.split('\n## ')[0] ?? '';
  const byDest = {};
  for (const line of section.split('\n')) {
    const m = line.match(/^- (.*transition to `(\w+)`.*)$/);
    if (m) (byDest[m[2]] ??= []).push(m[1]);
  }
  return Object.entries(byDest).map(([destination_state_name, lines]) => ({ destination_state_name, description: lines.join(' ') }));
}

// The JSON schema for each custom function is the first ```json block under its heading in functions.md.
function schemaFor(name) {
  const section = read('functions.md').split(`## \`${name}\``)[1];
  return JSON.parse(section.match(/```json\n([\s\S]*?)```/)[1]);
}
const descriptionFor = (name) =>
  read('functions.md').split(`## \`${name}\``)[1].match(/\*\*Description \(shown to the LLM\):\*\* (.*)/)[1];

const customTool = (name, waitLine) => ({
  type: 'custom',
  name,
  description: descriptionFor(name),
  url: WEBHOOK_URL,
  method: 'POST',
  headers: secret ? { 'X-Clinic-Secret': secret } : {},
  parameters: schemaFor(name),
  speak_during_execution: true,
  speak_after_execution: true,
  execution_message_description: waitLine,
  timeout_ms: 10000,
  max_retry: 0, // book_appointment is not idempotent
  args_at_root: false,
});

const beginMessage = read(STATES.intro).match(/^> (.*)$/m)[1];

const llm = {
  model: 'claude-5.5-haiku',
  model_temperature: 0.2,
  start_speaker: 'agent',
  begin_message: beginMessage,
  general_prompt: read('universal.md'),
  general_tools: [
    { type: 'end_call', name: 'end_call', description: 'End the call after saying goodbye, or when the caller stays silent after one check-in.' },
    {
      type: 'transfer_call',
      name: 'transfer_call',
      description: 'Connect the caller to the clinic reception staff.',
      transfer_destination: { type: 'predefined', number: RECEPTION },
      transfer_option: { type: 'cold_transfer' },
    },
  ],
  states: Object.entries(STATES).map(([name, file]) => {
    const md = read(file);
    return {
      name,
      state_prompt: md,
      edges: edgesFrom(md),
      tools:
        name === 'booking'
          ? [customTool('check_availability', 'Say a short line like "One moment while I check."'), customTool('book_appointment', 'Say a short line like "Booking that now."')]
          : [],
    };
  }),
  starting_state: 'intro',
};

const agent = (llmId) => ({
  agent_name: 'Riya - Smile Care Dental Clinic',
  response_engine: { type: 'retell-llm', llm_id: llmId },
  voice_id: '11labs-Monika',
  language: ['en-IN', 'hi-IN'],
  interruption_sensitivity: 0.6,
  end_call_after_silence_ms: 20000,
  max_call_duration_ms: 600000,
  post_call_analysis_data: [
    { type: 'boolean', name: 'booked', description: 'Whether book_appointment returned booked true during the call.' },
    { type: 'number', name: 'token', description: 'Token number given to the caller, if any.' },
    { type: 'string', name: 'appointment_date', description: 'Appointment date as yyyy-MM-dd, if booked.' },
    { type: 'enum', name: 'intent', description: "Caller's main intent.", choices: ['booking', 'faq', 'transfer', 'other'] },
    { type: 'boolean', name: 'transferred', description: 'Whether the call was transferred to reception.' },
  ],
});

async function call(method, route, body) {
  const res = await fetch(`${API}${route}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${route}: HTTP ${res.status} ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

(async () => {
  if (process.argv.includes('--dry-run')) {
    const summary = { ...llm, general_prompt: `${llm.general_prompt.length} chars`, states: llm.states.map((s) => ({ ...s, state_prompt: `${s.state_prompt.length} chars` })) };
    for (const s of summary.states) for (const t of s.tools) t.headers = Object.keys(t.headers);
    return console.log(JSON.stringify(summary, null, 2));
  }
  const ids =fs.existsSync(IDS_FILE) ? JSON.parse(fs.readFileSync(IDS_FILE, 'utf8')) : {};

  const savedLlm = ids.llm_id ? await call('PATCH', `/update-retell-llm/${ids.llm_id}`, llm) : await call('POST', '/create-retell-llm', llm);
  ids.llm_id = savedLlm.llm_id;

  const savedAgent = ids.agent_id
    ? await call('PATCH', `/update-agent/${ids.agent_id}`, agent(ids.llm_id))
    : await call('POST', '/create-agent', agent(ids.llm_id));
  ids.agent_id = savedAgent.agent_id;

  fs.writeFileSync(IDS_FILE, `${JSON.stringify(ids, null, 2)}\n`);
  console.log(
    JSON.stringify({
      llm_id: ids.llm_id,
      agent_id: ids.agent_id,
      states: llm.states.map((s) => `${s.name} → ${s.edges.map((e) => e.destination_state_name).join(', ')}`),
      secretHeader: !!secret,
    }, null, 2),
  );
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
