// Builds the n8n workflow JSON files. The webhook verifies Retell's request and forwards it to the
// Apps Script booking engine (apps-script/Code.gs), which applies the clinic rules under a script lock.
// Run: node "Booking Appointment using Voice AI Agent/n8n/build-workflows.js"
const fs = require('fs');
const path = require('path');

const CRED = {
  gmail: { gmailOAuth2: { id: 'yahjkfnlA7BBZg5G', name: 'Gmail account' } },
  webhookAuth: { httpHeaderAuth: { id: 'sV6s6l9O7OvJgxLb', name: 'Retell Webhook - X-Clinic-Secret' } },
  retellHmac: { crypto: { id: 'xm742sLTHXUVqWZ7', name: 'Retell API - CLAUDE_TANGO_KEY' } },
  bookingEngine: { httpQueryAuth: { id: 'heQ4v5RTTreUrKjV', name: 'Booking Engine - Apps Script' } }, // ?key=<SECRET>
};
const ENGINE_URL = 'https://script.google.com/macros/s/AKfycbxOn15nLc9KAo9-ElAUZrohvihRpfYziU4pe4NUx8WTF-Khx9KHIef30j7vyUiKEr4pfA/exec';
const ALERT_EMAIL = 'taher.advisor@gmail.com';
const ERROR_WORKFLOW_ID = 'VvptA2WfaqA3OvDW'; // Dental Voice Booking - Error Alerts

// The rules module minus its CommonJS export; only normalizeRequest is used here, the rest runs in Apps Script.
const rules = fs
  .readFileSync(path.join(__dirname, 'clinic-rules.js'), 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/\nmodule\.exports = \{[\s\S]*?\};\s*$/, '\n');
if (rules.includes('module.exports')) throw new Error('clinic-rules.js export block was not stripped');
const withRules = (adapter) => `${rules}\n// ---- n8n adapter ----\n${adapter.trim()}\n`;

const nodes = [];
function node(name, type, typeVersion, parameters, extra = {}, pos) {
  const n = { id: `dvb-${nodes.length + 1}`, name, type, typeVersion, position: pos, parameters, ...extra };
  nodes.push(n);
  return n;
}
const at = (col, row) => [col * 240, row * 200];
const fallible = { onError: 'continueErrorOutput' };

// Always HTTP 200: Retell hands the JSON to the LLM, and `ok: false` tells the agent to apologize / transfer.
const respond = (name, body, pos) =>
  node(name, 'n8n-nodes-base.respondToWebhook', 1.5, { respondWith: 'json', responseBody: body, options: {} }, {}, pos);

const ifNode = (name, conditions, pos) =>
  node(
    name,
    'n8n-nodes-base.if',
    2.3,
    {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 1 },
        conditions,
        combinator: 'and',
      },
      options: {},
    },
    {},
    pos,
  );
const isTrue = (id, leftValue) => ({ id, leftValue, rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } });

const code = (name, jsCode, pos, extra = fallible) =>
  node(name, 'n8n-nodes-base.code', 2, { mode: 'runOnceForAllItems', jsCode }, extra, pos);

// ---------------------------------------------------------------- main workflow
node(
  'Webhook',
  'n8n-nodes-base.webhook',
  2.1,
  { httpMethod: 'POST', path: 'retell/dental-booking', authentication: 'headerAuth', responseMode: 'responseNode', options: { rawBody: true } },
  { webhookId: 'a3c9e0f4-7b2d-4c1e-9f6a-5d8b2e1c4a70', credentials: CRED.webhookAuth },
  at(0, 0),
);

code(
  'Prepare Signature',
  `
// Retell signs the raw body: X-Retell-Signature = "v=<ms timestamp>,d=<hex HMAC-SHA256(rawBody + timestamp)>".
const item = $input.first();
const rawBody = (await this.helpers.getBinaryDataBuffer(0, 'data')).toString('utf8');
const header = String(item.json.headers?.['x-retell-signature'] ?? '');
const m = header.match(/^v=(\\d+),d=([0-9a-fA-F]+)$/);
const fresh = !!m && Math.abs(Date.now() - Number(m[1])) <= 5 * 60 * 1000;
return [{ json: { rawBody, toSign: rawBody + (m ? m[1] : ''), digest: m ? m[2].toLowerCase() : '', fresh } }];
`,
  at(1, 0),
);

node(
  'Compute HMAC',
  'n8n-nodes-base.crypto',
  2,
  { action: 'hmac', binaryData: false, type: 'SHA256', value: '={{ $json.toSign }}', dataPropertyName: 'expected', encoding: 'hex' },
  { credentials: CRED.retellHmac, ...fallible }, // Crypto credential: HMAC secret = Retell API key
  at(2, 0),
);

ifNode(
  'Signature Valid?',
  [
    isTrue('sig-fresh', '={{ $json.fresh }}'),
    { id: 'sig-match', leftValue: '={{ $json.expected }}', rightValue: '={{ $json.digest }}', operator: { type: 'string', operation: 'equals' } },
  ],
  at(3, 0),
);

respond('Respond Unauthorized', '={{ { ok: false, message: "Unauthorized" } }}', at(4, 1));

code(
  'Normalize Request',
  withRules(`
let body;
try { body = JSON.parse($('Prepare Signature').first().json.rawBody); } catch { body = {}; }
return [{ json: normalizeRequest(body) }];
`),
  at(4, 0),
);

// One POST per Retell function call. The engine runs one request at a time under LockService, so a burst of
// simultaneous callers queues for a few seconds; the timeout stays under Retell's 30 s function timeout.
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
  at(5, 0),
);

// The engine reports its own failures as { ok:false, system_error }: answer the agent, then alert the owner.
ifNode('Engine Error?', [isTrue('engine-error', '={{ !!$json.system_error || $json.message === "Unauthorized" }}')], at(6, 0));
respond('Respond Result', '={{ $json }}', at(7, 1));
respond('Respond System Error', '={{ { ok: false, message: "System problem, please offer a transfer" } }}', at(7, -1));
node(
  'Raise Error Alert',
  'n8n-nodes-base.stopAndError',
  1,
  {
    errorType: 'errorMessage',
    errorMessage:
      "={{ 'Voice booking failed: ' + ($json.system_error || $json.message || (typeof $json.error === 'string' ? $json.error : ($json.error?.message || JSON.stringify($json).slice(0, 500)))) }}",
  },
  {},
  at(8, -1),
);

const main = (...targets) => ({ main: targets.map((t) => (t ? [].concat(t).map((n) => ({ node: n, type: 'main', index: 0 })) : [])) });
const withError = (success, ...rest) => main(success, ...rest, 'Respond System Error');

const connections = {
  Webhook: main('Prepare Signature'),
  'Prepare Signature': withError('Compute HMAC'),
  'Compute HMAC': withError('Signature Valid?'),
  'Signature Valid?': main('Normalize Request', 'Respond Unauthorized'),
  'Normalize Request': withError('Call Booking Engine'),
  'Call Booking Engine': withError('Engine Error?'),
  'Engine Error?': main('Respond System Error', 'Respond Result'),
  'Respond System Error': main('Raise Error Alert'),
};

const mainWorkflow = {
  name: 'Dental Voice Booking - Retell Webhook',
  nodes,
  connections,
  settings: { executionOrder: 'v1', timezone: 'Asia/Kolkata', errorWorkflow: ERROR_WORKFLOW_ID, saveDataErrorExecution: 'all', saveDataSuccessExecution: 'all' },
};

// ---------------------------------------------------------------- error alerts workflow
const alertsWorkflow = {
  name: 'Dental Voice Booking - Error Alerts',
  nodes: [
    { id: 'dva-1', name: 'Error Trigger', type: 'n8n-nodes-base.errorTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
    {
      id: 'dva-2',
      name: 'Email Owner',
      type: 'n8n-nodes-base.gmail',
      typeVersion: 2.1,
      position: [240, 0],
      parameters: {
        sendTo: ALERT_EMAIL,
        subject: "=[Dental Voice Booking] Failure in {{ $json.workflow.name }}",
        emailType: 'text',
        message:
          "=Workflow: {{ $json.workflow.name }}\nNode: {{ $json.execution.lastNodeExecuted }}\nError: {{ $json.execution.error.message }}\nTime: {{ $now.setZone('Asia/Kolkata').toFormat('yyyy-MM-dd HH:mm:ss') }} IST\nExecution: {{ $json.execution.url }}\n\nIf this was a booking call, the caller was told there was a system problem and offered a transfer.",
        options: { appendAttribution: false },
      },
      credentials: CRED.gmail,
    },
  ],
  connections: { 'Error Trigger': main('Email Owner') },
  settings: { executionOrder: 'v1', timezone: 'Asia/Kolkata' },
};

for (const [file, wf] of [
  ['dental-voice-booking-retell-webhook.json', mainWorkflow],
  ['dental-voice-booking-error-alerts.json', alertsWorkflow],
]) {
  fs.writeFileSync(path.join(__dirname, file), `${JSON.stringify(wf, null, 2)}\n`);
  console.log(`wrote ${file} (${wf.nodes.length} nodes)`);
}
