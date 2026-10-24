// Builds the single Telnyx instructions prompt from prompt/universal.md and prompt/sections/*.md.
// Run: node "Booking Appointment using Telnyx Voice Agent/telnyx/build-instructions.js"
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'prompt');
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').trim();

function buildInstructions() {
  const sections = fs
    .readdirSync(path.join(dir, 'sections'))
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => read(path.join(dir, 'sections', f)));
  return [
    read(path.join(dir, 'universal.md')),
    '# Call flow',
    'The call is organised in sections. Start in the Start section and move between sections as each one says. Only one section applies at a time; follow its steps, then go where it sends you.',
    ...sections,
  ].join('\n\n');
}

if (require.main === module) {
  const out = buildInstructions();
  fs.writeFileSync(path.join(__dirname, 'instructions.md'), `${out}\n`);
  console.log(`wrote instructions.md (${out.length} characters)`);
}

module.exports = { buildInstructions };
