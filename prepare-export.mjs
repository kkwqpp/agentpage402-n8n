// Sanitize one actual `n8n export:workflow --id=... --output=...` result.
// Never replaces a native export with a generated graph.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const input = process.argv[2];
if (!input) throw new Error('Usage: node prepare-export.mjs path/to/n8n-export.json');
const raw = JSON.parse(await readFile(input, 'utf8'));
assert(Array.isArray(raw) && raw.length === 1, 'Export exactly one workflow');
const exported = raw[0];
const source = JSON.parse(await readFile(new URL('./agentpage402-review.json', import.meta.url), 'utf8'));
const portable = Object.fromEntries(Object.keys(source).map(key => [key, exported[key]]));
assert.deepEqual(portable, source, 'Native export must match the reviewed portable workflow exactly');
assert.equal(exported.active, false);
for (const node of portable.nodes) assert.equal(node.credentials, undefined);
const output = fileURLToPath(new URL('./exports/AgentPage402%20%E2%80%94%20unsigned%20quote%20and%20manual%20audit%20review.json', import.meta.url));
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(portable, null, 2) + '\n');
console.log('Saved sanitized native export; graph matches reviewed source exactly.');
