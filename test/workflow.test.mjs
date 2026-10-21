import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { buildWorkflow } from '../build-workflow.mjs';

const workflow = JSON.parse(await readFile(new URL('../agentpage402-review.json', import.meta.url), 'utf8'));
test('sanitized native n8n export matches the reviewed workflow without instance metadata', async () => {
  const exported = JSON.parse(await readFile(new URL('../exports/AgentPage402%20%E2%80%94%20unsigned%20quote%20and%20manual%20audit%20review.json', import.meta.url), 'utf8'));
  assert.deepEqual(exported, workflow);
  assert.equal(exported.id, undefined);
  assert.equal(exported.shared, undefined);
  assert.equal(exported.meta, undefined);
  assert.equal(exported.active, false);
});
const url = 'https://example.com/research';
const beforeFixture = JSON.parse(await readFile(new URL('../fixtures/before.json', import.meta.url), 'utf8'));
const afterFixture = JSON.parse(await readFile(new URL('../fixtures/after.json', import.meta.url), 'utf8'));
const result = () => structuredClone(beforeFixture);
function execute(name, json, input = { url }) {
  const node = workflow.nodes.find(n => n.name === name);
  const items = [{ json }];
  return vm.runInNewContext(`(function () { ${node.parameters.jsCode}\n})()`, {
    Buffer, $input: { all: () => items, first: () => items[0] },
    $: selected => { assert.equal(selected, 'Validate input'); return { first: () => ({ json: input }) }; },
  }, { timeout: 1000 })[0].json;
}
const review = (report, baseline = null) => execute('Compare and prepare review', {
  url, reportJson: JSON.stringify(report), baselineReportJson: baseline ? JSON.stringify(baseline) : '',
});
function challenge(overrides = {}) {
  return { x402Version: 2, resource: { url: 'https://agentpage402-demo.onrender.com/v1/page-audit' }, accepts: [{
    scheme: 'exact', network: 'eip155:8453', asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    amount: '250000', payTo: '0x1111111111111111111111111111111111111111', maxTimeoutSeconds: 300,
    extra: { name: 'USD Coin', version: '2', assetTransferMethod: 'eip3009' }, ...overrides,
  }] };
}
const quote = (body = challenge(), statusCode = 402) => execute('Inspect quote', {
  statusCode, headers: { 'Payment-Required': Buffer.from(JSON.stringify(body)).toString('base64') }, body: '{}',
});

test('generated portable workflow matches sources and has only an unsigned fixed-origin request', async () => {
  assert.deepEqual(workflow, await buildWorkflow());
  assert.equal(workflow.active, false);
  const names = new Set(workflow.nodes.map(n => n.name));
  assert.equal(names.size, workflow.nodes.length);
  assert.equal(new Set(workflow.nodes.map(n => n.id)).size, workflow.nodes.length);
  for (const [from, connections] of Object.entries(workflow.connections)) {
    assert(names.has(from));
    for (const group of connections.main) for (const connection of group) assert(names.has(connection.node));
  }
  const network = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest');
  assert.equal(network.length, 1);
  assert.equal(network[0].parameters.url, 'https://agentpage402-demo.onrender.com/v1/page-audit');
  assert.equal(network[0].parameters.authentication, 'none');
  assert.equal(network[0].parameters.sendHeaders, undefined);
  assert.equal(network[0].retryOnFail, false);
  assert.equal(network[0].parameters.options.redirect.redirect.followRedirects, false);
  const allowed = ['manualTrigger', 'set', 'code', 'if', 'httpRequest', 'convertToFile', 'stickyNote'].map(n => 'n8n-nodes-base.' + n);
  for (const node of workflow.nodes) { assert(allowed.includes(node.type)); assert.equal(node.credentials, undefined); }
  const fields = workflow.nodes.find(n => n.type === 'n8n-nodes-base.set').parameters.assignments.assignments;
  assert.equal(fields.find(f => f.name === 'mode').value, 'quote');
});

test('valid quote exposes fixed terms but never reports a paid audit or verified recipient', () => {
  const output = quote();
  assert.equal(output.status, 'payment_required');
  assert.equal(output.amountUsdc, '0.25');
  assert.equal(output.paid, false);
  assert.equal(output.pageFetched, false);
  assert.equal(output.recipientIndependentlyVerified, false);
});

test('errors, missing headers, malformed JSON and changed terms become unavailable', () => {
  for (const status of [200, 301, 400, 403, 409, 429, 500, 503]) assert.equal(quote(challenge(), status).status, 'unavailable');
  for (const headers of [{}, { 'payment-required': 'bad!' }, { 'payment-required': 'bm90IGpzb24=' }]) {
    assert.equal(execute('Inspect quote', { statusCode: 402, headers }).status, 'unavailable');
  }
  for (const body of [null, true, 42, 'not an object', [], {}, { ...challenge(), accepts: null }]) {
    assert.equal(quote(body).status, 'unavailable');
  }
  for (const terms of [{ amount: '1000000' }, { network: 'eip155:84532' }, { payTo: '0x' + '0'.repeat(40) }, { maxTimeoutSeconds: 1000 }, { extra: { name: 'Unknown' } }]) {
    assert.equal(quote(challenge(terms)).status, 'unavailable');
  }
  const wrongResource = challenge(); wrongResource.resource.url = 'https://other.example/v1/page-audit';
  assert.equal(quote(wrongResource).status, 'unavailable');
});

test('input refuses credentials, unsupported ports, arbitrary mode and missing report', () => {
  for (const target of ['https://user:pass@example.com/', 'file:///tmp/page', 'https://example.com:8080/', 'https://example.com/\nsecret', 'https://example.com\\@evil.example']) {
    assert.throws(() => execute('Validate input', { mode: 'quote', url: target }));
  }
  assert.throws(() => execute('Validate input', { mode: 'buy', url }));
  assert.throws(() => execute('Validate input', { mode: 'review', url }));
  assert.equal(execute('Validate input', { mode: 'quote', url: url + '#part' }).url, url);
});

test('bundled report fixture produces a human review without payment claims', () => {
  const output = review(result());
  assert.equal(output.status, 'human_review_required');
  assert.equal(output.paymentVerified, false);
  assert.equal(output.counts.current, result().priorities.length);
  assert.equal(output.counts.new, 0);
  assert.match(output.markdown, /No baseline supplied/);
  assert.match(output.markdown, /not proof that it was fixed/);
});

test('snapshot comparison separates new, changed, unchanged and no-longer-flagged prompts', () => {
  const before = result();
  const current = structuredClone(afterFixture);
  current.priorities.find(p => p.id === 'dates').evidence = 'New evidence, still requires review.';
  const output = review(current, before);
  assert(output.counts.new >= 1);
  assert(output.counts.changed >= 1);
  assert(output.counts.unchanged >= 1);
  assert(output.reviewRows.some(p => p.id === 'attribution' && p.change === 'no_longer_flagged'));
});

test('bundled snapshots reproduce the published review Markdown exactly', async () => {
  const output = review(afterFixture, beforeFixture);
  const expected = await readFile(new URL('../fixtures/review.md', import.meta.url), 'utf8');
  assert.equal(output.markdown, expected.replace(/\r\n/g, '\n'));
  assert.equal(output.counts.new, 2);
  assert.equal(output.counts.unchanged, 3);
  assert.equal(output.counts.no_longer_flagged, 1);
});

test('uncertain or failed receipts and wrong report types are rejected', () => {
  for (const supplied of [challenge(), { error: 'failed' }, { ...result(), pages: [result()] },
    { httpStatus: 409, settlement: { success: false }, result: result() },
    { httpStatus: 200, settlement: { success: true, network: 'eip155:84532' }, result: result() }]) assert.throws(() => review(supplied));
  const output = review({ httpStatus: 200, settlement: { success: true, network: 'eip155:8453' }, result: result() });
  assert.equal(output.paymentVerified, false);
  assert.match(output.markdown, /no independent chain verification/);
});

test('baseline must be same page, older, and have unambiguous finding IDs', () => {
  const current = result();
  assert.throws(() => review(current, { ...result(), fetchedAt: '2026-10-21T00:00:00.000Z' }));
  assert.throws(() => review(current, { ...result(), url: 'https://other.example/' }));
  assert.throws(() => review({ ...current, priorities: [current.priorities[0], current.priorities[0]] }));
  assert.throws(() => review({ ...current, fetchedAt: 'yesterday' }));
});

test('untrusted Markdown/HTML is escaped and the supplied Markdown is never executed or exported', () => {
  const supplied = result();
  supplied.priorities[0].evidence = '<script>alert(1)</script> [click](javascript:alert(1))\n# injected';
  supplied.reportMarkdown = '<iframe src="https://evil.example"></iframe>';
  const output = review(supplied);
  assert(!output.markdown.includes('<script>'));
  assert(!output.markdown.includes('[click]('));
  assert(!output.markdown.includes('<iframe'));
  assert(!output.markdown.includes('\n# injected'));
});
