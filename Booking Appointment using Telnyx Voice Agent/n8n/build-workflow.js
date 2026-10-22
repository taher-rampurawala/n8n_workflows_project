// Builds the n8n workflow for the Telnyx voice agent. It forwards each Telnyx webhook-tool call to the same
// Apps Script booking engine the Retell agent uses (one lock, one sheet, shared tokens).
// Run: node "Booking Appointment using Telnyx Voice Agent/n8n/build-workflow.js"
const fs = require('fs');
const path = require('path');

const CRED = {
  // Same X-Clinic-Secret as the Retell webhook; Telnyx sends it from an integration secret.
  webhookAuth: { httpHeaderAuth: { id: 'sV6s6l9O7OvJgxLb', name: 'Retell Webhook - X-Clinic-Secret' } },
  bookingEngine: { httpQueryAuth: { id: 'heQ4v5RTTreUrKjV', name: 'Booking Engine - Apps Script' } }, // ?key=<SECRET>
};
const ENGINE_URL = 'https://script.google.com/macros/s/AKfycbxOn15nLc9KAo9-ElAUZrohvihRpfYziU4pe4NUx8WTF-Khx9KHIef30j7vyUiKEr4pfA/exec';
const ERROR_WORKFLOW_ID = 'VvptA2WfaqA3OvDW'; // Dental Voice Booking - Error Alerts (shared)
const WEBHOOK_PATH = 'telnyx/dental-booking';

const nodes = [];
function node(name, type, typeVersion, parameters, extra = {}, pos) {
  nodes.push({ id: `dvt-${nodes.length + 1}`, name, type, typeVersion, position: pos, parameters, ...extra });
}
const at = (col, row) => [col * 240, row * 200];
const fallible = { onError: 'continueErrorOutput' };
// Always HTTP 200: Telnyx hands the JSON to the model, and `ok: false` tells the agent to apologize / transfer.
const respond = (name, body, pos) =>
  node(name, 'n8n-nodes-base.respondToWebhook', 1.5, { respondWith: 'json', responseBody: body, options: {} }, {}, pos);

node(
  'Webhook',
  'n8n-nodes-base.webhook',
  2.1,
  { httpMethod: 'POST', path: WEBHOOK_PATH, authentication: 'headerAuth', responseMode: 'responseNode', options: {} },
  { webhookId: 'c7e1a2b3-4d5e-4f60-8a71-0e1f2a3b4c5d', credentials: CRED.webhookAuth },
  at(0, 0),
);

// Telnyx sends only the arguments the model filled in. The function name comes from ?fn= on the tool URL, and
// call details from templated headers ({{telnyx_end_user_target}}, {{call_control_id}}).
node(
  'Normalize Request',
  'n8n-nodes-base.code',
  2,
  {
    mode: 'runOnceForAllItems',
    jsCode: `
const item = $input.first().json;
const headers = item.headers || {};
// A header Telnyx could not fill arrives as the raw template ("{{...}}") or empty: treat it as unknown.
const clean = (v) => {
  const s = String(v ?? '').trim();
  return /^\\{\\{.*\\}\\}$/.test(s) ? '' : s;
};
const args = item.body && typeof item.body === 'object' && !Array.isArray(item.body) ? item.body : {};
return [{
  json: {
    fnName: String(item.query?.fn ?? ''),
    args,
    callId: clean(headers['x-call-id']),
    callerNumber: clean(headers['x-caller-number']),
    channel: 'Telnyx Voice',
  },
}];
`,
  },
  { ...fallible },
  at(1, 0),
);

// One POST per tool call. The engine runs one request at a time under LockService, shared with the Retell agent.
node(
  'Call Booking Engine',
  'n8n-nodes-base.httpRequest',
  4.2,
  {
    method: 'POST',
    url: ENGINE_URL,
    authentication: 'genericCredentialType',
    genericAuthType: 'httpQueryAuth',
    sendBody: true,
    specifyBody: 'json',
    jsonBody: '={{ JSON.stringify($json) }}',
    options: { timeout: 25000, redirect: { redirect: { followRedirects: true, maxRedirects: 5 } } },
  },
  { credentials: CRED.bookingEngine, ...fallible },
  at(2, 0),
);

node(
  'Engine Error?',
  'n8n-nodes-base.if',
  2.3,
  {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 1 },
      conditions: [
        {
          id: 'engine-error',
          leftValue: '={{ !!$json.system_error || $json.message === "Unauthorized" }}',
          rightValue: '',
          operator: { type: 'boolean', operation: 'true', singleValue: true },
        },
      ],
      combinator: 'and',
    },
    options: {},
  },
  {},
  at(3, 0),
);
respond('Respond Result', '={{ $json }}', at(4, 1));
respond('Respond System Error', '={{ { ok: false, message: "System problem, please offer a transfer" } }}', at(4, -1));
node(
  'Raise Error Alert',
  'n8n-nodes-base.stopAndError',
  1,
  {
    errorType: 'errorMessage',
    errorMessage:
      "={{ 'Telnyx voice booking failed: ' + ($json.system_error || $json.message || (typeof $json.error === 'string' ? $json.error : ($json.error?.message || JSON.stringify($json).slice(0, 500)))) }}",
  },
  {},
  at(5, -1),
);

const main = (...targets) => ({ main: targets.map((t) => (t ? [{ node: t, type: 'main', index: 0 }] : [])) });
const withError = (success) => main(success, 'Respond System Error');

const workflow = {
  name: 'Dental Voice Booking - Telnyx Webhook',
  nodes,
  connections: {
    Webhook: main('Normalize Request'),
    'Normalize Request': withError('Call Booking Engine'),
    'Call Booking Engine': withError('Engine Error?'),
    'Engine Error?': main('Respond System Error', 'Respond Result'),
    'Respond System Error': main('Raise Error Alert'),
  },
  settings: { executionOrder: 'v1', timezone: 'Asia/Kolkata', errorWorkflow: ERROR_WORKFLOW_ID, saveDataErrorExecution: 'all', saveDataSuccessExecution: 'all' },
};

const out = path.join(__dirname, 'dental-voice-booking-telnyx-webhook.json');
fs.writeFileSync(out, `${JSON.stringify(workflow, null, 2)}\n`);
console.log(`wrote ${path.basename(out)} (${nodes.length} nodes)`);
