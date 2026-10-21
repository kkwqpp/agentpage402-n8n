const response = $input.first().json;
const url = $('Validate input').first().json.url;
const resource = 'https://agentpage402-demo.onrender.com/v1/page-audit';
const unavailable = reason => [{ json: {
  status: 'unavailable', paid: false, targetUrl: url, httpStatus: response.statusCode,
  reason, fileName: 'agentpage402-quote-unavailable.md',
  markdown: '# Quote unavailable\n\nNo payment was made and no page audit was produced.\n\n' + reason + '\n',
} }];
if (response.statusCode !== 402) return unavailable(`Expected HTTP 402, received ${Number(response.statusCode) || 'no status'}. Check service availability; this is not a clean audit.`);
const entry = Object.entries(response.headers || {}).find(([key]) => key.toLowerCase() === 'payment-required');
const encoded = entry?.[1];
if (typeof encoded !== 'string' || encoded.length > 16000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
  return unavailable('Missing or malformed PAYMENT-REQUIRED header.');
}
let required;
try { required = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')); }
catch { return unavailable('The payment requirement could not be decoded as JSON.'); }
if (!required || typeof required !== 'object' || Array.isArray(required) || !Array.isArray(required.accepts)) {
  return unavailable('The payment requirement is not an x402 object with accepted payment terms.');
}
const terms = required.accepts?.[0];
if (required.x402Version !== 2 || required.resource?.url !== resource || required.accepts?.length !== 1 ||
    terms?.scheme !== 'exact' || terms.network !== 'eip155:8453' || terms.amount !== '250000' ||
    String(terms.asset).toLowerCase() !== '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913' ||
    !/^0x[0-9a-f]{40}$/i.test(terms.payTo || '') || /^0x0{40}$/i.test(terms.payTo) ||
    !Number.isInteger(terms.maxTimeoutSeconds) || terms.maxTimeoutSeconds < 1 || terms.maxTimeoutSeconds > 300 ||
    terms.extra?.name !== 'USD Coin' || terms.extra?.version !== '2' ||
    (terms.extra?.assetTransferMethod && terms.extra.assetTransferMethod !== 'eip3009')) {
  return unavailable('Unexpected protocol, resource, asset, network, price, recipient format, or authorization terms. Inspect the service documentation before proceeding.');
}
return [{ json: {
  status: 'payment_required', paid: false, targetUrl: url, resource,
  network: terms.network, asset: 'USDC', amountAtomic: terms.amount, amountUsdc: '0.25',
  advertisedRecipient: terms.payTo, recipientIndependentlyVerified: false,
  pageFetched: false, fileName: 'agentpage402-quote.md',
  markdown: '# Unsigned page-audit quote\n\nPrice: 0.25 USDC on Base (eip155:8453).\n\n' +
    'No payment, page fetch, or audit occurred. An unsigned quote does not prove the target page is fetchable.\n\n' +
    `Advertised recipient: ${terms.payTo}\n\n` +
    'Independently verify the recipient before using the owner-controlled local buyer client. This workflow cannot sign or buy.\n\n' +
    'After a successful purchase, paste only the result (or completed receipt) into reportJson and select review mode. Never paste a private key, seed phrase, or signed payment proof into n8n.\n',
} }];
