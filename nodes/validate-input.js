// No network, wallet, environment, or filesystem access.
const items = $input.all();
if (items.length !== 1) throw new Error('Run one explicit page at a time.');
const input = items[0].json;
if (!['quote', 'review'].includes(input.mode)) throw new Error('mode must be quote or review.');
if (typeof input.url !== 'string' || input.url.length > 2048) throw new Error('Supply one absolute public HTTP(S) URL.');
// n8n task runners do not guarantee a global URL constructor. Parsing and
// public-IP/redirect validation remain the paid service's responsibility.
if (!/^https?:\/\/(?:\[[0-9a-f:]+\]|[a-z0-9.-]+)(?::(?:80|443))?(?:[/?#][^\s]*)?$/i.test(input.url) || /[\\<>]/.test(input.url)) {
  throw new Error('Supply one HTTP(S) URL without credentials, whitespace, or backslashes.');
}
const url = input.url.replace(/#.*$/, '');
if (input.mode === 'review' && (typeof input.reportJson !== 'string' || !input.reportJson.trim())) {
  throw new Error('review mode needs the completed page-audit JSON in reportJson.');
}
for (const key of ['reportJson', 'baselineReportJson']) {
  if (input[key] != null && (typeof input[key] !== 'string' || input[key].length > 1_000_000)) {
    throw new Error(`${key} must be a JSON string under 1 MB.`);
  }
}
return [{ json: { mode: input.mode, url, reportJson: input.reportJson || '', baselineReportJson: input.baselineReportJson || '' } }];
