// Creates or updates "Riya" as a Telnyx AI Assistant from the files in this folder.
//   node "Booking Appointment using Telnyx Voice Agent/telnyx/setup-telnyx.js" [--dry-run]
// Env: TELNYX_API_KEY. The webhook secret is NOT read here: tools reference the Telnyx integration secret
// "clinic_webhook_secret", which holds TELNYX_WEBHOOK_SECRET. The assistant id is kept in telnyx-ids.json.
const fs = require('fs');
const path = require('path');
const { buildInstructions } = require('./build-instructions');

const API = 'https://api.telnyx.com/v2';
const WEBHOOK_URL = 'https://n8n.srv1789828.hstgr.cloud/webhook/telnyx/dental-booking';
const RECEPTION = '+919163495068';
const IDS_FILE = path.join(__dirname, 'telnyx-ids.json');
const GREETING =
  "Thank you for calling Smile Care Dental Clinic. This is Riya, the clinic's virtual assistant. This call may be recorded. How can I help you today?";

const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8').replace(/\r\n/g, '\n');
const tools = read('tools.md');
const section = (name) => tools.split(`## \`${name}\``)[1];
const schemaFor = (name) => JSON.parse(section(name).match(/```json\n([\s\S]*?)```/)[1]);
const descriptionFor = (name) => section(name).match(/\*\*Description \(shown to the LLM\):\*\* (.*)/)[1];

// Telnyx sends only the body parameters, so the function name rides in ?fn= and call details in headers.
const webhookTool = (name) => ({
  type: 'webhook',
  timeout_ms: 30000,
  webhook: {
    name,
    description: descriptionFor(name),
    url: `${WEBHOOK_URL}?fn=${name}`,
    method: 'POST',
    headers: [
      { name: 'X-Clinic-Secret', value: '{{#integration_secret}}clinic_webhook_secret{{/integration_secret}}' },
      { name: 'X-Caller-Number', value: '{{telnyx_end_user_target}}' },
      { name: 'X-Call-Id', value: '{{call_control_id}}' },
    ],
    body_parameters: schemaFor(name),
  },
});

const assistant = {
  name: 'Riya - Smile Care Dental Clinic (Telnyx)',
  description: 'Same-day dental appointment booking for Smile Care Dental Clinic, Kolkata.',
  model: 'anthropic/claude-haiku-4-5',
  instructions: buildInstructions(),
  greeting: GREETING,
  tools: [
    ...['check_availability', 'book_appointment', 'find_booking', 'cancel_booking', 'move_booking'].map(webhookTool),
    {
      type: 'transfer',
      transfer: { targets: [{ name: 'Reception', to: RECEPTION }], from: '{{telnyx_agent_target}}' },
    },
    { type: 'hangup', hangup: { description: 'End the call after saying goodbye, or when the caller stays silent after one check-in.' } },
  ],
  voice_settings: { voice: 'Azure.en-IN-NeerjaIndicNeural' },
  transcription: {
    model: 'deepgram/nova-3', // multilingual with automatic language detection (English / Hindi / Hinglish)
    settings: { smart_format: true, keyterm: 'Smile Care, Riya, Muzaffar Ahmed Street, Esplanade, Park Street, UPI, token' },
  },
  telephony_settings: { time_limit_secs: 600, user_idle_timeout_secs: 30 },
  interruption_settings: { enable: true },
  enabled_features: ['telephony'],
};

async function call(method, route, body) {
  const res = await fetch(`${API}${route}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.TELNYX_API_KEY}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${route}: HTTP ${res.status} ${text.slice(0, 800)}`);
  return JSON.parse(text);
}

(async () => {
  if (process.argv.includes('--dry-run')) {
    const summary = { ...assistant, instructions: `${assistant.instructions.length} chars` };
    return console.log(JSON.stringify(summary, null, 2));
  }
  if (!process.env.TELNYX_API_KEY) throw new Error('TELNYX_API_KEY is not set');
  const ids = fs.existsSync(IDS_FILE) ? JSON.parse(fs.readFileSync(IDS_FILE, 'utf8')) : {};
  const saved = ids.assistant_id
    ? await call('POST', `/ai/assistants/${ids.assistant_id}`, assistant)
    : await call('POST', '/ai/assistants', assistant);
  const a = saved.data || saved;
  ids.assistant_id = a.id;
  fs.writeFileSync(IDS_FILE, `${JSON.stringify(ids, null, 2)}\n`);
  console.log(JSON.stringify({ assistant_id: a.id, name: a.name, model: a.model, voice: a.voice_settings?.voice, tools: (a.tools || []).map((t) => t.type + (t.webhook ? ':' + t.webhook.name : '')) }, null, 2));
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
