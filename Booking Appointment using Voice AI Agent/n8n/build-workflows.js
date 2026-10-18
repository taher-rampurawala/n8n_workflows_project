// Builds the n8n workflow JSON files from clinic-rules.js so the Code nodes run the tested rules.
// Run: node "Booking Appointment using Voice AI Agent/n8n/build-workflows.js"
const fs = require('fs');
const path = require('path');

const SHEET_ID = '1bhlO4EFmgqcoXCNK4GrD6BSF-7izvMM1nsk1cgjAg9E';
const BOOKINGS_GID = 1583914306;
const CRED = {
  sheets: { googleSheetsOAuth2Api: { id: 'UoP5i2rbCOyXAvdg', name: 'Google Sheets account' } },
  gmail: { gmailOAuth2: { id: 'yahjkfnlA7BBZg5G', name: 'Gmail account' } },
  webhookAuth: { httpHeaderAuth: { id: 'sV6s6l9O7OvJgxLb', name: 'Retell Webhook - X-Clinic-Secret' } },
};
const { DEFAULT_CONFIG } = require('./clinic-rules');
const ALERT_EMAIL = 'taher.advisor@gmail.com';
const ERROR_WORKFLOW_ID = 'VvptA2WfaqA3OvDW'; // Dental Voice Booking - Error Alerts

// The rules module minus its CommonJS export, pasted ahead of each Code node's adapter.
const rules = fs
  .readFileSync(path.join(__dirname, 'clinic-rules.js'), 'utf8')
  .replace(/\nmodule\.exports = .*\n?$/, '\n');
const withRules = (adapter) => `${rules}\n// ---- n8n adapter ----\n${adapter.trim()}\n`;

const document = { __rl: true, mode: 'id', value: SHEET_ID, cachedResultName: 'Appointment Booking' };
const bookingsSheet = { __rl: true, mode: 'id', value: BOOKINGS_GID, cachedResultName: 'Bookings' };
const holidaysSheet = { __rl: true, mode: 'name', value: 'Holidays' };

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

const readSheet = (name, sheet, pos, filtersUI) =>
  node(
    name,
    'n8n-nodes-base.googleSheets',
    4.7,
    { documentId: document, sheetName: sheet, ...(filtersUI ? { filtersUI } : {}), options: {} },
    { credentials: CRED.sheets, executeOnce: true, alwaysOutputData: true, ...fallible },
    pos,
  );

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
  { ...fallible }, // credential "Retell API - CLAUDE_TANGO_KEY" (type Crypto, HMAC secret = Retell API key) is selected in the UI
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

respond('Respond Unauthorized', '={{ { ok: false, message: "Unauthorized" } }}', at(4, 2));

node(
  'Clinic Config',
  'n8n-nodes-base.set',
  3.4,
  {
    mode: 'raw',
    jsonOutput: JSON.stringify(
      DEFAULT_CONFIG,
      null,
      2,
    ),
    options: {},
  },
  {},
  at(4, 0),
);

code(
  'Normalize Request',
  withRules(`
let body;
try { body = JSON.parse($('Prepare Signature').first().json.rawBody); } catch { body = {}; }
return [{ json: normalizeRequest(body) }];
`),
  at(5, 0),
);

const rule = (value) => ({
  conditions: {
    options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 1 },
    conditions: [{ leftValue: '={{ $json.fnName }}', rightValue: value, operator: { type: 'string', operation: 'equals' } }],
    combinator: 'and',
  },
  renameOutput: true,
  outputKey: value,
});
node(
  'Route by Function',
  'n8n-nodes-base.switch',
  3.4,
  { rules: { values: [rule('check_availability'), rule('book_appointment')] }, options: { fallbackOutput: 'extra', renameFallbackOutput: 'unknown' } },
  {},
  at(6, 0),
);

// check_availability
readSheet('Read Bookings - Availability', bookingsSheet, at(7, -2));
readSheet('Read Holidays - Availability', holidaysSheet, at(8, -2));
code(
  'Compute Availability',
  withRules(`
const rows = (name) => $(name).all().map((i) => i.json).filter((r) => r.Date);
const response = checkAvailability({
  bookings: rows('Read Bookings - Availability'),
  holidays: rows('Read Holidays - Availability'),
  args: $('Normalize Request').first().json.args,
  now: new Date(),
  config: $('Clinic Config').first().json,
});
return [{ json: { response } }];
`),
  at(9, -2),
);
respond('Respond Availability', '={{ $json.response }}', at(10, -2));

// book_appointment
code(
  'Validate Booking Args',
  withRules(`
const req = $('Normalize Request').first().json;
const result = validateBookingArgs(req.args, req.callerNumber);
return [{ json: result.ok ? { valid: true, booking: result.value } : { valid: false, response: result } }];
`),
  at(7, 0),
);
ifNode('Args Valid?', [isTrue('args-valid', '={{ $json.valid }}')], at(8, 0));
respond('Respond Invalid Args', '={{ $json.response }}', at(9, 1));
readSheet('Read Bookings - Booking', bookingsSheet, at(9, 0));
readSheet('Read Holidays - Booking', holidaysSheet, at(10, 0));
code(
  'Decide Booking',
  withRules(`
const rows = (name) => $(name).all().map((i) => i.json).filter((r) => r.Date);
const decision = decideBooking({
  bookings: rows('Read Bookings - Booking'),
  holidays: rows('Read Holidays - Booking'),
  booking: $('Validate Booking Args').first().json.booking,
  callId: $('Normalize Request').first().json.callId,
  now: new Date(),
  config: $('Clinic Config').first().json,
});
return [{ json: decision }];
`),
  at(11, 0),
);
ifNode('Can Book?', [isTrue('can-book', '={{ $json.canBook }}')], at(12, 0));
respond('Respond Not Booked', '={{ $json.response }}', at(13, 1));

const COLUMNS = ['Date', 'Time', 'TokenNumber', 'PatientName', 'Age', 'Reason', 'WhatsAppNumber', 'BookedAt', 'Channel', 'CallId'];
node(
  'Append Booking',
  'n8n-nodes-base.googleSheets',
  4.7,
  {
    resource: 'sheet',
    operation: 'append',
    authentication: 'oAuth2',
    documentId: document,
    sheetName: bookingsSheet,
    columns: {
      mappingMode: 'defineBelow',
      value: Object.fromEntries(COLUMNS.map((c) => [c, `={{ $json.row.${c} }}`])),
      matchingColumns: [],
      schema: COLUMNS.map((c) => ({ id: c, displayName: c, required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: c === 'Date' })),
    },
    options: {},
  },
  { credentials: CRED.sheets, ...fallible },
  at(13, 0),
);
respond('Respond Booked', "={{ $('Decide Booking').first().json.response }}", at(14, 0));
readSheet('Read Bookings - Verify', bookingsSheet, at(15, 0), {
  values: [{ lookupColumn: 'Date', lookupValue: "={{ $('Decide Booking').first().json.row.Date }}" }],
});
code(
  'Check Duplicate Token',
  `
// Residual race: two calls booking the same date within the same second can get the same token.
// Throwing here fails the execution, so the Error Alerts workflow emails the owner to fix it by hand.
const { row } = $('Decide Booking').first().json;
const same = $input.all().filter((i) => String(i.json.Date) === row.Date && Number(i.json.TokenNumber) === row.TokenNumber);
if (same.length > 1) {
  throw new Error(\`Duplicate token \${row.TokenNumber} on \${row.Date} (\${same.length} rows). Re-number one booking and call the patient.\`);
}
return [{ json: { duplicate: false, date: row.Date, token: row.TokenNumber } }];
`,
  at(16, 0),
  {},
);

// fallback + errors
respond('Respond Unknown Function', '={{ { ok: false, message: "Unknown function" } }}', at(7, 2));
respond('Respond System Error', '={{ { ok: false, message: "System problem, please offer a transfer" } }}', at(9, 4));
node(
  'Raise Error Alert',
  'n8n-nodes-base.stopAndError',
  1,
  {
    errorType: 'errorMessage',
    errorMessage:
      "={{ 'Voice booking failed: ' + (typeof $json.error === 'string' ? $json.error : ($json.error?.message || JSON.stringify($json).slice(0, 500))) }}",
  },
  {},
  at(10, 4),
);

const main = (...targets) => ({ main: targets.map((t) => (t ? [].concat(t).map((n) => ({ node: n, type: 'main', index: 0 })) : [])) });
const withError = (success, ...rest) => main(success, ...rest, 'Respond System Error');

const connections = {
  Webhook: main('Prepare Signature'),
  'Prepare Signature': withError('Compute HMAC'),
  'Compute HMAC': withError('Signature Valid?'),
  'Signature Valid?': main('Clinic Config', 'Respond Unauthorized'),
  'Clinic Config': main('Normalize Request'),
  'Normalize Request': withError('Route by Function'),
  'Route by Function': main('Read Bookings - Availability', 'Validate Booking Args', 'Respond Unknown Function'),
  'Read Bookings - Availability': withError('Read Holidays - Availability'),
  'Read Holidays - Availability': withError('Compute Availability'),
  'Compute Availability': withError('Respond Availability'),
  'Validate Booking Args': withError('Args Valid?'),
  'Args Valid?': main('Read Bookings - Booking', 'Respond Invalid Args'),
  'Read Bookings - Booking': withError('Read Holidays - Booking'),
  'Read Holidays - Booking': withError('Decide Booking'),
  'Decide Booking': withError('Can Book?'),
  'Can Book?': main('Append Booking', 'Respond Not Booked'),
  'Append Booking': withError('Respond Booked'),
  'Respond Booked': main('Read Bookings - Verify'),
  // A failed verification read must not send a second response; it only fails the execution (→ alert).
  'Read Bookings - Verify': main('Check Duplicate Token', 'Raise Error Alert'),
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
