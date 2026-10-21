import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const source = async name => (await readFile(new URL(`nodes/${name}.js`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const code = async (name, file, position, id) => ({ id, name, type: 'n8n-nodes-base.code', typeVersion: 2, position,
  parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: await source(file) } });
const link = node => ({ node, type: 'main', index: 0 });
export async function buildWorkflow() {
  return {
    name: 'AgentPage402 — unsigned quote and manual audit review', active: false,
    nodes: [
      { id: 'manual', name: 'Run manually', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 300], parameters: {} },
      { id: 'inputs', name: 'Inputs — quote or review', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [220, 300], parameters: {
        mode: 'manual', assignments: { assignments: [
          { id: 'mode', name: 'mode', type: 'string', value: 'quote' },
          { id: 'url', name: 'url', type: 'string', value: 'https://example.com/' },
          { id: 'report', name: 'reportJson', type: 'string', value: '' },
          { id: 'baseline', name: 'baselineReportJson', type: 'string', value: '' },
        ] }, includeOtherFields: false, options: {},
      } },
      await code('Validate input', 'validate-input', [440, 300], 'validate'),
      { id: 'route', name: 'Quote mode?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [660, 300], parameters: {
        conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
          conditions: [{ id: 'mode-check', leftValue: '={{ $json.mode }}', rightValue: 'quote', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, options: {},
      } },
      { id: 'quote', name: 'Unsigned quote — no payment', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [880, 180], retryOnFail: false, onError: 'stopWorkflow', parameters: {
        method: 'POST', url: 'https://agentpage402-demo.onrender.com/v1/page-audit', authentication: 'none', sendBody: true,
        contentType: 'json', specifyBody: 'json', jsonBody: '={{ JSON.stringify({url: $json.url}) }}',
        options: { timeout: 90000, redirect: { redirect: { followRedirects: false } },
          response: { response: { neverError: true, fullResponse: true, responseFormat: 'text', outputPropertyName: 'body' } } },
      } },
      await code('Inspect quote', 'decode-quote', [1100, 180], 'decode'),
      await code('Compare and prepare review', 'review-report', [1100, 440], 'review'),
      { id: 'file', name: 'Download Markdown', type: 'n8n-nodes-base.convertToFile', typeVersion: 1, position: [1340, 300], parameters: {
        operation: 'toText', sourceProperty: 'markdown', binaryPropertyName: 'data', options: { fileName: '={{ $json.fileName }}', encoding: 'utf8' },
      } },
      { id: 'note', name: 'Read first', type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position: [0, -80], parameters: {
        width: 850, height: 270, content: '## Manual quote + audit review\nDefault mode = quote. Only an unsigned request is sent; no audit or payment occurs. Set one public `url`.\n\nFor review mode, paste a completed single page-audit JSON into `reportJson`; optionally paste an older same-page result into `baselineReportJson`. JSON fields must remain **Fixed**, not Expression. No network call in review mode. The free fixed sample at /examples/page-audit works for a demo.\n\nNo wallet keys, payment proofs, shell commands, schedules or outbound messages. Purchase separately using an owner-controlled local buyer. Inspect the review rows before downloading Markdown. Source content remains untrusted. See README.md in https://github.com/kkwqpp/agentpage402-n8n.',
      } },
    ],
    connections: {
      'Run manually': { main: [[link('Inputs — quote or review')]] },
      'Inputs — quote or review': { main: [[link('Validate input')]] },
      'Validate input': { main: [[link('Quote mode?')]] },
      'Quote mode?': { main: [[link('Unsigned quote — no payment')], [link('Compare and prepare review')]] },
      'Unsigned quote — no payment': { main: [[link('Inspect quote')]] },
      'Inspect quote': { main: [[link('Download Markdown')]] },
      'Compare and prepare review': { main: [[link('Download Markdown')]] },
    },
    settings: { executionOrder: 'v1', saveManualExecutions: false, saveDataSuccessExecution: 'none', saveDataErrorExecution: 'none' },
    pinData: {}, tags: [],
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await writeFile(new URL('agentpage402-review.json', import.meta.url), JSON.stringify(await buildWorkflow(), null, 2) + '\n');
}
