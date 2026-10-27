// Creates or updates Riya in Retell from the prompt files in this folder.
//   node "Booking Appointment using Voice AI Agent/retell/setup-retell.js" [--no-secret] [--dry-run]
// Env: RETELL_API_KEY (required), CLINIC_WEBHOOK_SECRET (the n8n "Retell Webhook - X-Clinic-Secret" value).
// --no-secret creates the custom functions without the X-Clinic-Secret header (n8n rejects them until rerun).
// Riya is a conversation flow agent: each state file becomes a subagent node (prompt + tools), its
// "## Transitions" lines become edges, and universal.md is the global prompt. Retell retired
// multi-prompt agents (support ends 2026-12-15).
// Created ids are kept in retell-ids.json so reruns update the same conversation flow and agent.
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
  manage_booking: 'states/06_manage_booking.md',
};

function edgesFrom(name, md) {
  const section = md.split('## Transitions')[1]?.split('\n## ')[0] ?? '';
  const byDest = {};
  for (const line of section.split('\n')) {
    const m = line.match(/^- (.*transition to `(\w+)`.*)$/);
    if (m) (byDest[m[2]] ??= []).push(m[1]);
  }
  return Object.entries(byDest).map(([destination_node_id, lines]) => ({
    id: `${name}_to_${destination_node_id}`,
    transition_condition: { type: 'prompt', prompt: lines.join(' ') },
    destination_node_id,
  }));
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
  timeout_ms: 30000, // Google Sheets reads occasionally take 10+ s; a timeout here made Riya report a booking that had succeeded
  max_retry: 0, // book_appointment is not idempotent
  args_at_root: false,
});

// Every node gets transfer_call / end_call (they were general tools in the multi-prompt agent).
const COMMON_TOOLS = [
  { type: 'end_call', name: 'end_call', description: 'End the call after saying goodbye, or when the caller stays silent after one check-in.' },
  {
    type: 'transfer_call',
    name: 'transfer_call',
    description: 'Connect the caller to the clinic reception staff.',
    transfer_destination: { type: 'predefined', number: RECEPTION },
    transfer_option: { type: 'cold_transfer' },
  },
];

// Custom (n8n webhook) functions per node.
const STATE_TOOLS = {
  booking: [
    customTool('check_availability', 'Say a short line like "One moment while I check."'),
    customTool('book_appointment', 'Say a short line like "Booking that now."'),
  ],
  manage_booking: [
    customTool('find_booking', 'Say a short line like "One moment while I look that up."'),
    customTool('cancel_booking', 'Say a short line like "Cancelling that now."'),
    customTool('move_booking', 'Say a short line like "One moment."'),
  ],
};

// Flows have no begin message: the intro node's instruction opens with the line to say first.
const flow = {
  model_config: { type: 'cascading', primary: { model: 'claude-5.5-sonnet' }, temperature: 0.2 }, // haiku miscounted digits and mis-copied names into tool args
  start_speaker: 'agent',
  global_prompt: read('universal.md'),
  nodes: Object.entries(STATES).map(([name, file], i) => {
    const md = read(file);
    return {
      id: name,
      name,
      type: 'subagent',
      instruction: { type: 'prompt', text: md },
      edges: edgesFrom(name, md),
      tools: [...COMMON_TOOLS, ...(STATE_TOOLS[name] ?? [])],
      display_position: { x: 400 * i, y: 0 },
    };
  }),
  start_node_id: 'intro',
};

const agent = (flowId) => ({
  agent_name: 'Riya - Smile Care Dental Clinic',
  response_engine: { type: 'conversation-flow', conversation_flow_id: flowId },
  voice_id: '11labs-Monika',
  voice_temperature: 0.2, // steady, even delivery; the default 1 lets the voice get excited
  language: ['en-IN', 'hi-IN'],
  interruption_sensitivity: 0.9, // callers should be able to cut in easily; below 1 so background noise does not
  // Patience and recognition: callers pause mid-name, and Indian names need the accurate transcriber.
  stt_mode: 'accurate',
  responsiveness: 0.7,
  enable_dynamic_responsiveness: true,
  reminder_trigger_ms: 15000,
  reminder_max_count: 1,
  boosted_keywords: ['Smile Care', 'Riya', 'Muzaffar Ahmed Street', 'Esplanade', 'Park Street', 'UPI', 'token'],
  end_call_after_silence_ms: 30000,
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
    const summary = {
      ...flow,
      global_prompt: `${flow.global_prompt.length} chars`,
      nodes: flow.nodes.map((n) => ({
        ...n,
        instruction: `${n.instruction.text.length} chars`,
        tools: n.tools.map((t) => (t.headers ? { ...t, description: '…', parameters: '…', headers: Object.keys(t.headers) } : t.name)),
      })),
    };
    return console.log(JSON.stringify(summary, null, 2));
  }
  const ids = fs.existsSync(IDS_FILE) ? JSON.parse(fs.readFileSync(IDS_FILE, 'utf8')) : {};

  const savedFlow = ids.conversation_flow_id
    ? await call('PATCH', `/update-conversation-flow/${ids.conversation_flow_id}`, flow)
    : await call('POST', '/create-conversation-flow', flow);
  ids.conversation_flow_id = savedFlow.conversation_flow_id;
  fs.writeFileSync(IDS_FILE, `${JSON.stringify(ids, null, 2)}\n`); // keep the flow id even if the agent call fails

  const savedAgent = ids.agent_id
    ? await call('PATCH', `/update-agent/${ids.agent_id}`, agent(ids.conversation_flow_id))
    : await call('POST', '/create-agent', agent(ids.conversation_flow_id));
  ids.agent_id = savedAgent.agent_id;

  fs.writeFileSync(IDS_FILE, `${JSON.stringify(ids, null, 2)}\n`);
  console.log(
    JSON.stringify({
      conversation_flow_id: ids.conversation_flow_id,
      agent_id: ids.agent_id,
      nodes: flow.nodes.map((n) => `${n.id} → ${n.edges.map((e) => e.destination_node_id).join(', ')}`),
      secretHeader: !!secret,
    }, null, 2),
  );
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
