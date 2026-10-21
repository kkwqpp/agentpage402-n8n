// Optional integration check: requires the pinned n8n installation described in README.md.
// Uses only a new isolated state directory, fixed fixtures and one unsigned live quote.
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const testRoot = resolve(root, '.testnet');
await mkdir(testRoot, { recursive: true });
const state = await mkdtemp(resolve(testRoot, 'n8n-validation-'));
const env = Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT']
  .filter(k => process.env[k]).map(k => [k, process.env[k]]));
Object.assign(env, {
  N8N_USER_FOLDER: state, DB_TYPE: 'sqlite', DB_SQLITE_DATABASE: resolve(state, 'database.sqlite'),
  N8N_ENCRYPTION_KEY: 'isolated-test-instance-no-user-credentials',
  N8N_DIAGNOSTICS_ENABLED: 'false', N8N_VERSION_NOTIFICATIONS_ENABLED: 'false',
  N8N_TEMPLATES_ENABLED: 'false', N8N_PERSONALIZATION_ENABLED: 'false',
  N8N_RUNNERS_ENABLED: 'true', N8N_RUNNERS_MODE: 'internal', N8N_RUNNERS_BROKER_PORT: '59173',
  N8N_BLOCK_ENV_ACCESS_IN_NODE: 'true', N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS: 'false',
  N8N_LOG_LEVEL: 'info', EXECUTIONS_MODE: 'regular', N8N_DEFAULT_BINARY_DATA_MODE: 'default',
});
// An optional explicit CLI path reuses a pinned installation, never its state.
const bin = process.argv[2] ? resolve(process.argv[2]) : resolve(testRoot, 'n8n-runtime/node_modules/n8n/bin/n8n');
async function cli(args, name, timeout = 600_000) {
  let stdout = '', stderr = '';
  const child = spawn(process.execPath, [bin, ...args], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', b => stdout += b); child.stderr.on('data', b => stderr += b);
  const timer = setTimeout(() => child.kill(), timeout);
  const exit = await new Promise((done, reject) => {
    child.on('error', reject); child.on('exit', (code, signal) => done({ code, signal }));
  });
  clearTimeout(timer);
  await writeFile(resolve(state, name + '.log'), stdout + '\nSTDERR\n' + stderr);
  console.log(name, exit);
  return { stdout, stderr, ...exit };
}
function parsedExecution(stdout) {
  // n8n emits rawOutput through its info logger; startup/shutdown lines and
  // logger metadata can surround the execution object.
  stdout = stripVTControlCharacters(stdout);
  for (let start = stdout.indexOf('{'); start >= 0; start = stdout.indexOf('{', start + 1)) {
    let depth = 0, quoted = false, escaped = false;
    for (let end = start; end < stdout.length; end++) {
      const char = stdout[end];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === '{') depth++;
      else if (char === '}' && --depth === 0) {
        try {
          const value = JSON.parse(stdout.slice(start, end + 1));
          if (value?.data?.resultData && typeof value.status === 'string') return value;
        } catch {}
        break;
      }
    }
  }
  throw new Error('No complete execution JSON; inspect the isolated log.');
}
const portable = JSON.parse(await readFile(resolve(root, 'agentpage402-review.json'), 'utf8'));
const quote = { ...structuredClone(portable), id: 'ap402quote20261020' };
const review = { ...structuredClone(portable), id: 'ap402review20261020', name: portable.name + ' [fixture review]' };
const fields = review.nodes.find(n => n.type === 'n8n-nodes-base.set').parameters.assignments.assignments;
for (const [name, value] of Object.entries({ mode: 'review', url: 'https://example.com/research',
  reportJson: await readFile(resolve(root, 'fixtures/after.json'), 'utf8'),
  baselineReportJson: await readFile(resolve(root, 'fixtures/before.json'), 'utf8') })) {
  fields.find(f => f.name === name).value = value;
}
const inputFile = resolve(state, 'workflows.json');
await writeFile(inputFile, JSON.stringify([quote, review]));
console.log('Isolated validation state:', state);
const version = await cli(['--version'], 'version');
assert.equal(version.code, 0, 'n8n version check failed');
assert.equal(version.stdout.trim(), '2.44.4', 'Install the documented pinned n8n version');
const imported = await cli(['import:workflow', '--input=' + inputFile], 'import');
assert.equal(imported.code, 0, 'Import failed; inspect import.log in the isolated state directory.');
const reviewRun = await cli(['execute', '--id=' + review.id, '--rawOutput'], 'review');
assert.equal(reviewRun.code, 0, 'Review execution failed; inspect review.log.');
const reviewData = parsedExecution(reviewRun.stdout);
assert.equal(reviewData.data.resultData.error, undefined, 'Review node failed');
const runs = reviewData.data.resultData.runData;
assert.equal(runs['Unsigned quote — no payment'], undefined, 'Review must not make a request');
const summary = runs['Compare and prepare review'][0].data.main[0][0].json;
assert.equal(summary.status, 'human_review_required');
assert(summary.counts.new >= 1); assert(summary.counts.no_longer_flagged >= 1);
const binary = runs['Download Markdown'][0].data.main[0][0].binary.data;
assert.equal(binary.fileName, 'agentpage402-review.md');
assert.equal(typeof binary.data, 'string');
assert(!binary.data.includes(':'), 'Expected in-memory binary data for exact Markdown comparison.');
assert.equal(Buffer.from(binary.data, 'base64').toString('utf8'),
  (await readFile(resolve(root, 'fixtures/review.md'), 'utf8')).replace(/\r\n/g, '\n'));
const quoteRun = await cli(['execute', '--id=' + quote.id, '--rawOutput'], 'quote');
assert.equal(quoteRun.code, 0, 'Quote execution failed; inspect quote.log.');
const quoteData = parsedExecution(quoteRun.stdout);
assert.equal(quoteData.data.resultData.error, undefined, 'Quote node failed');
const qruns = quoteData.data.resultData.runData;
assert.equal(qruns['Compare and prepare review'], undefined);
const quoteSummary = qruns['Inspect quote'][0].data.main[0][0].json;
assert.equal(quoteSummary.status, 'payment_required');
assert.equal(quoteSummary.paid, false); assert.equal(quoteSummary.amountUsdc, '0.25');
const validation = { n8n: '2.44.4', imported: true, reviewExecuted: true, reviewNoHttp: true,
  markdownFileCreated: true, markdownMatchesFixture: true, unsignedLiveQuoteExecuted: true,
  quoteHttpStatus: qruns['Unsigned quote — no payment'][0].data.main[0][0].json.statusCode,
  amountUsdc: quoteSummary.amountUsdc, paid: false, at: new Date().toISOString() };
await writeFile(resolve(state, 'validation.json'), JSON.stringify(validation, null, 2));
console.log(JSON.stringify(validation));
