// Treat all supplied page content as untrusted data, never instructions.
const input = $input.first().json;
const text = (value, max = 8000) => {
  if (typeof value !== 'string' || value.length > max) throw new Error('Invalid or oversized report text.');
  return value;
};
const safe = value => String(value).replace(/[\r\n\u0000-\u001f]+/g, ' ').replace(/[\\`*_{}\[\]()<>#+.!|~-]/g, '\\$&');
const read = (raw, label) => {
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error(`${label} is not valid JSON.`); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`${label} must be an object.`);
  let provenance = 'supplied result; payment not verified';
  if (Object.hasOwn(parsed, 'result') || Object.hasOwn(parsed, 'httpStatus') || Object.hasOwn(parsed, 'settlement')) {
    if (parsed.httpStatus !== 200 || parsed.settlement?.success !== true || parsed.settlement.network !== 'eip155:8453') {
      throw new Error(`${label} receipt is unsuccessful or uncertain. Recover the original purchase; do not pay again.`);
    }
    provenance = 'receipt reports success; no independent chain verification in this workflow';
    parsed = parsed.result;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.pages ||
      parsed.contentTrust !== 'untrusted_external_content' || !Array.isArray(parsed.priorities) ||
      parsed.priorities.length > 100 || !parsed.aeo || !parsed.seo || !parsed.readability ||
      !Array.isArray(parsed.limitations) || parsed.limitations.length > 30 || typeof parsed.reportMarkdown !== 'string') {
    throw new Error(`${label} must be a completed single page-audit result, not a quote, pack, or error.`);
  }
  const url = text(parsed.url, 2048).replace(/#.*$/, '');
  if (url !== input.url) throw new Error(`${label} URL must exactly match url (apart from a fragment). Use the result's final URL after a redirect.`);
  const fetchedAt = text(parsed.fetchedAt, 80);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(fetchedAt) || !Number.isFinite(Date.parse(fetchedAt))) throw new Error(`${label} has no valid fetch timestamp.`);
  const seen = new Set();
  const priorities = parsed.priorities.map(p => {
    if (!p || !['high', 'medium', 'low'].includes(p.priority) || !['aeo', 'seo', 'readability'].includes(p.category)) throw new Error(`${label} contains an invalid priority.`);
    const id = text(p.id, 120), key = p.category + ':' + id;
    if (!id || seen.has(key)) throw new Error(`${label} contains an empty or duplicated finding identifier.`);
    seen.add(key);
    return { key, category: p.category, id, priority: p.priority, evidence: text(p.evidence), action: text(p.action) };
  });
  return { url, fetchedAt, title: text(parsed.title, 500), priorities, limitations: parsed.limitations.map(v => text(v)), provenance };
};
const current = read(input.reportJson, 'Current report');
const previous = input.baselineReportJson.trim() ? read(input.baselineReportJson, 'Baseline report') : null;
if (previous && Date.parse(previous.fetchedAt) >= Date.parse(current.fetchedAt)) throw new Error('Baseline must be older than the current report.');
const old = new Map((previous?.priorities || []).map(p => [p.key, p]));
const reviewRows = current.priorities.map(p => {
  const before = old.get(p.key);
  const change = !previous ? 'current' : !before ? 'new' :
    ['priority', 'evidence', 'action'].some(key => before[key] !== p[key]) ? 'changed' : 'unchanged';
  old.delete(p.key);
  return { ...p, change, ...(before ? { previousEvidence: before.evidence, previousPriority: before.priority } : {}) };
});
for (const p of old.values()) reviewRows.push({ ...p, change: 'no_longer_flagged' });
const counts = Object.fromEntries(['current', 'new', 'changed', 'unchanged', 'no_longer_flagged'].map(c => [c, reviewRows.filter(r => r.change === c).length]));
const sections = ['current', 'new', 'changed', 'unchanged', 'no_longer_flagged'].filter(c => counts[c]).map(c =>
  `## ${c.replaceAll('_', ' ')}\n\n` + reviewRows.filter(r => r.change === c).map(r =>
    `- **${r.priority.toUpperCase()} / ${safe(r.category)} / ${safe(r.id)}**\n  - Evidence: ${safe(r.evidence)}\n  - Review action: ${safe(r.action)}` +
    (r.change === 'changed' ? `\n  - Previous evidence: ${safe(r.previousEvidence)}\n  - Previous priority: ${safe(r.previousPriority)}` : '')).join('\n')
).join('\n\n');
const markdown = '# Page audit review handoff\n\n' +
  `Page: ${safe(current.url)}\n\nFetched: ${safe(current.fetchedAt)}\n\n` +
  (previous ? `Baseline fetched: ${safe(previous.fetchedAt)}\n\n` : 'No baseline supplied; these are current findings, not newly introduced problems.\n\n') +
  'Human review required. Static HTML evidence only: no rendered browser, search rankings, AI citations, content accuracy, or fix verification. Optional editorial signals are not eligibility requirements. A finding no longer flagged is not proof that it was fixed.\n\n' +
  `Provenance: ${safe(current.provenance)}.\n\n` +
  (sections || 'No review prompts in this supplied snapshot. This is not a quality, indexing, or visibility guarantee.') +
  '\n\n## Source limitations\n\n' + current.limitations.map(l => '- ' + safe(l)).join('\n') + '\n';
return [{ json: { status: 'human_review_required', sourceUrl: current.url, fetchedAt: current.fetchedAt,
  baselineFetchedAt: previous?.fetchedAt || null, paymentVerified: false, counts, reviewRows,
  fileName: 'agentpage402-review.md', markdown } }];
