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
  retellHmac: { crypto: { id: 'xm742sLTHXUVqWZ7', name: 'Retell API - CLAUDE_TANGO_KEY' } },
};
const { DEFAULT_CONFIG } = require('./clinic-rules');
const ALERT_EMAIL = 'taher.advisor@gmail.com';
const ERROR_WORKFLOW_ID = 'VvptA2WfaqA3OvDW'; // Dental Voice Booking - Error Alerts
const HOLDS_TABLE_ID = 'ObMZfME6VuEdGL6a'; // Data table "Voice Slot Holds"

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

// Reads pass a failure on as a regular `{ error }` item instead of using an error output: with
// alwaysOutputData (needed so an empty sheet still yields an item), a failing node would emit an empty
// success item too, and the success branch would answer "all slots free". `rowsOf` turns that item into a throw.
const readSheet = (name, sheet, pos, filtersUI) =>
  node(
    name,
    'n8n-nodes-base.googleSheets',
    4.7,
    { documentId: document, sheetName: sheet, ...(filtersUI ? { filtersUI } : {}), options: {} },
    { credentials: CRED.sheets, executeOnce: true, alwaysOutputData: true, onError: 'continueRegularOutput' },
    pos,
  );
const ROWS_OF = `
const rowsOf = (name) => {
  const items = $(name).all().map((i) => i.json);
  const failed = items.find((r) => r.error);
  if (failed) throw new Error(\`\${name} failed: \${typeof failed.error === 'string' ? failed.error : failed.error.message ?? JSON.stringify(failed.error)}\`);
  return items.filter((r) => r.Date);
};
`;

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

// "Voice Slot Holds": data-table inserts never overwrite each other and get increasing ids, unlike Sheets rows.
const holdsTable = { __rl: true, mode: 'id', value: HOLDS_TABLE_ID, cachedResultName: 'Voice Slot Holds' };
const HOLD_COLUMNS = { date: 'string', token: 'number', holdId: 'string', callId: 'string', expiresAt: 'string' };
const holdSchema = (cols) =>
  cols.map((c) => ({ id: c, displayName: c, required: false, defaultMatch: false, display: true, type: HOLD_COLUMNS[c], canBeUsedToMatch: true }));
const TODAY_IST = "={{ $now.setZone('Asia/Kolkata').toFormat('yyyy-MM-dd') }}";
const readHolds = (name, pos) =>
  node(
    name,
    'n8n-nodes-base.dataTable',
    1.1,
    {
      resource: 'row',
      operation: 'get',
      dataTableId: holdsTable,
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'date', condition: 'eq', keyValue: TODAY_IST }] },
      returnAll: true,
    },
    { executeOnce: true, alwaysOutputData: true, onError: 'continueRegularOutput' },
    pos,
  );
const HOLDS_OF = `
const holdsOf = (name) => {
  const items = $(name).all().map((i) => i.json);
  const failed = items.find((r) => r.error);
  if (failed) throw new Error(\`\${name} failed: \${typeof failed.error === 'string' ? failed.error : failed.error.message ?? JSON.stringify(failed.error)}\`);
  return items.filter((r) => r.holdId);
};
`;

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
  {
    rules: { values: ['check_availability', 'book_appointment', 'find_booking', 'cancel_booking'].map(rule) },
    options: { fallbackOutput: 'extra', renameFallbackOutput: 'unknown' },
  },
  {},
  at(6, 0),
);

// check_availability
readSheet('Read Bookings - Availability', bookingsSheet, at(7, -4));
readSheet('Read Holidays - Availability', holidaysSheet, at(8, -4));
readHolds('Read Holds - Availability', at(9, -4));
code(
  'Compute Availability',
  withRules(`
${ROWS_OF}
${HOLDS_OF}
const req = $('Normalize Request').first().json;
const config = $('Clinic Config').first().json;
const now = new Date();
const response = checkAvailability({
  bookings: rowsOf('Read Bookings - Availability'),
  holidays: rowsOf('Read Holidays - Availability'),
  holds: holdsOf('Read Holds - Availability'),
  callId: req.callId,
  args: req.args,
  now,
  config,
});
// Hold the offered token for this call while the caller gives their details.
const hold = response.available
  ? newHold({ date: response.date, token: response.token, holdId: \`H-\${Date.now()}-\${Math.random().toString(36).slice(2, 8)}\`, callId: req.callId, now, config })
  : null;
return [{ json: { hold, response: { ...response, ...callerIdInfo(req.callerNumber) } } }];
`),
  at(10, -4),
);
ifNode('Hold Needed?', [isTrue('hold-needed', '={{ !!$json.hold }}')], at(11, -4));
respond('Respond Availability', '={{ $json.response }}', at(12, -3));
node(
  'Insert Hold',
  'n8n-nodes-base.dataTable',
  1.1,
  {
    resource: 'row',
    operation: 'insert',
    dataTableId: holdsTable,
    columns: {
      mappingMode: 'defineBelow',
      value: Object.fromEntries(Object.keys(HOLD_COLUMNS).map((c) => [c, `={{ $json.hold.${c} }}`])),
      schema: holdSchema(Object.keys(HOLD_COLUMNS)),
    },
    options: {},
  },
  { ...fallible },
  at(12, -5),
);
readHolds('Read Holds - Verify', at(13, -5));
code(
  'Resolve Hold',
  withRules(`
${ROWS_OF}
${HOLDS_OF}
const { hold } = $('Compute Availability').first().json;
const result = resolveHold({
  bookings: rowsOf('Read Bookings - Availability'),
  holidays: rowsOf('Read Holidays - Availability'),
  holds: holdsOf('Read Holds - Verify'),
  holdId: hold.holdId,
  now: new Date(),
  config: $('Clinic Config').first().json,
});
// A moved hold gets its new token; a squeezed-out hold is released by expiring it now.
const update = { token: result.token ?? hold.token, expiresAt: result.token === null ? new Date().toISOString() : hold.expiresAt };
const response = { ...result.response, ...callerIdInfo($('Normalize Request').first().json.callerNumber) };
return [{ json: { changed: result.changed, holdId: hold.holdId, update, response } }];
`),
  at(14, -5),
);
ifNode('Hold Moved?', [isTrue('hold-moved', '={{ $json.changed }}')], at(15, -5));
node(
  'Update Hold',
  'n8n-nodes-base.dataTable',
  1.1,
  {
    resource: 'row',
    operation: 'update',
    dataTableId: holdsTable,
    matchType: 'allConditions',
    filters: { conditions: [{ keyName: 'holdId', condition: 'eq', keyValue: '={{ $json.holdId }}' }] },
    columns: {
      mappingMode: 'defineBelow',
      value: { token: '={{ $json.update.token }}', expiresAt: '={{ $json.update.expiresAt }}' },
      schema: holdSchema(['token', 'expiresAt']),
    },
    options: {},
  },
  { ...fallible },
  at(16, -6),
);
respond('Respond Held', "={{ $('Resolve Hold').first().json.response }}", at(17, -5));

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
readHolds('Read Holds - Booking', at(10, 1));
code(
  'Decide Booking',
  withRules(`
${ROWS_OF}
${HOLDS_OF}
const decision = decideBooking({
  bookings: rowsOf('Read Bookings - Booking'),
  holidays: rowsOf('Read Holidays - Booking'),
  holds: holdsOf('Read Holds - Booking'),
  booking: $('Validate Booking Args').first().json.booking,
  callId: $('Normalize Request').first().json.callId,
  // Identifies this row for the clash check and for cancelling later.
  bookingId: \`VB-\${Date.now()}-\${Math.random().toString(36).slice(2, 8)}\`,
  now: new Date(),
  config: $('Clinic Config').first().json,
});
return [{ json: decision }];
`),
  at(11, 0),
);
ifNode('Can Book?', [isTrue('can-book', '={{ $json.canBook }}')], at(12, 0));
respond('Respond Not Booked', '={{ $json.response }}', at(13, 1));

const COLUMNS = ['Date', 'Time', 'TokenNumber', 'PatientName', 'Age', 'Reason', 'WhatsAppNumber', 'BookedAt', 'Channel', 'CallId', 'Status', 'BookingId'];
const columnsOf = (matchingColumns) => ({
  mappingMode: 'defineBelow',
  value: Object.fromEntries(COLUMNS.map((c) => [c, `={{ $json.row.${c} }}`])),
  matchingColumns,
  schema: COLUMNS.map((c) => ({ id: c, displayName: c, required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true })),
});
const sheetWrite = (name, operation, matchingColumns, pos) =>
  node(
    name,
    'n8n-nodes-base.googleSheets',
    4.7,
    { resource: 'sheet', operation, authentication: 'oAuth2', documentId: document, sheetName: bookingsSheet, columns: columnsOf(matchingColumns), options: {} },
    { credentials: CRED.sheets, ...fallible },
    pos,
  );

sheetWrite('Append Booking', 'append', [], at(13, 0));
// Re-read after saving so two callers booking at the same moment cannot both keep the same token.
readSheet('Read Bookings - Verify', bookingsSheet, at(14, 0), {
  values: [{ lookupColumn: 'Date', lookupValue: "={{ $('Decide Booking').first().json.row.Date }}" }],
});
code(
  'Resolve Token',
  withRules(`
${ROWS_OF}
const result = resolveToken({
  bookings: rowsOf('Read Bookings - Verify'),
  holidays: rowsOf('Read Holidays - Booking'),
  bookingId: $('Decide Booking').first().json.row.BookingId,
  now: new Date(),
  config: $('Clinic Config').first().json,
});
return [{ json: result }];
`),
  at(15, 0),
);
ifNode('Token Changed?', [isTrue('token-changed', '={{ $json.changed }}')], at(16, 0));
sheetWrite('Update Booking Row', 'update', ['BookingId'], at(17, -1));
respond('Respond Booked', "={{ $('Resolve Token').first().json.response }}", at(18, 0));

// find_booking
readSheet('Read Bookings - Find', bookingsSheet, at(7, 3));
code(
  'Find Bookings',
  withRules(`
${ROWS_OF}
const req = $('Normalize Request').first().json;
const response = findBookings({
  bookings: rowsOf('Read Bookings - Find'),
  phone: req.args.phone || req.callerNumber,
  now: new Date(),
  config: $('Clinic Config').first().json,
});
return [{ json: { response } }];
`),
  at(8, 3),
);
respond('Respond Find', '={{ $json.response }}', at(9, 3));

// cancel_booking
readSheet('Read Bookings - Cancel', bookingsSheet, at(7, 5));
code(
  'Plan Cancel',
  withRules(`
${ROWS_OF}
const req = $('Normalize Request').first().json;
const plan = planCancel({
  bookings: rowsOf('Read Bookings - Cancel'),
  token: req.args.token,
  phone: req.args.phone || req.callerNumber,
  now: new Date(),
  config: $('Clinic Config').first().json,
});
return [{ json: plan }];
`),
  at(8, 5),
);
ifNode('Can Cancel?', [isTrue('can-cancel', '={{ $json.canCancel }}')], at(9, 5));
sheetWrite('Cancel Booking Row', 'update', ['BookingId'], at(10, 4));
respond('Respond Cancel', "={{ $('Plan Cancel').first().json.response }}", at(11, 5));

// fallback + errors
respond('Respond Unknown Function', '={{ { ok: false, message: "Unknown function" } }}', at(7, 7));
respond('Respond System Error', '={{ { ok: false, message: "System problem, please offer a transfer" } }}', at(9, 9));
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
  at(10, 9),
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
  'Route by Function': main('Read Bookings - Availability', 'Validate Booking Args', 'Read Bookings - Find', 'Read Bookings - Cancel', 'Respond Unknown Function'),
  'Read Bookings - Availability': main('Read Holidays - Availability'),
  'Read Holidays - Availability': main('Read Holds - Availability'),
  'Read Holds - Availability': main('Compute Availability'),
  'Compute Availability': withError('Hold Needed?'),
  'Hold Needed?': main('Insert Hold', 'Respond Availability'),
  'Insert Hold': withError('Read Holds - Verify'),
  'Read Holds - Verify': main('Resolve Hold'),
  'Resolve Hold': withError('Hold Moved?'),
  'Hold Moved?': main('Update Hold', 'Respond Held'),
  'Update Hold': withError('Respond Held'),
  'Validate Booking Args': withError('Args Valid?'),
  'Args Valid?': main('Read Bookings - Booking', 'Respond Invalid Args'),
  'Read Bookings - Booking': main('Read Holidays - Booking'),
  'Read Holidays - Booking': main('Read Holds - Booking'),
  'Read Holds - Booking': main('Decide Booking'),
  'Decide Booking': withError('Can Book?'),
  'Can Book?': main('Append Booking', 'Respond Not Booked'),
  'Append Booking': withError('Read Bookings - Verify'),
  // A failure after the append answers {ok:false}; the agent retries and gets already_booked.
  'Read Bookings - Verify': main('Resolve Token'),
  'Resolve Token': withError('Token Changed?'),
  'Token Changed?': main('Update Booking Row', 'Respond Booked'),
  'Update Booking Row': withError('Respond Booked'),
  'Read Bookings - Find': main('Find Bookings'),
  'Find Bookings': withError('Respond Find'),
  'Read Bookings - Cancel': main('Plan Cancel'),
  'Plan Cancel': withError('Can Cancel?'),
  'Can Cancel?': main('Cancel Booking Row', 'Respond Cancel'),
  'Cancel Booking Row': withError('Respond Cancel'),
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
