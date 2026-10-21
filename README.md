# AgentPage402: manual quote and page-audit review for n8n

Import [agentpage402-review.json](agentpage402-review.json) to inspect an unsigned
0.25-USDC page-audit quote or turn an already completed report into a human
review checklist and downloadable Markdown. With an older report, the workflow
separates new, changed, unchanged, and no-longer-flagged review prompts.

This is a standalone, MIT-licensed integration for developers and agencies that
already use n8n. Wallet signing and purchases happen separately in an
owner-controlled browser checkout or local buyer process. There are no wallet credentials,
signed payment proofs, shell nodes, schedules, email nodes or account requirements
inside this template. An existing n8n installation is required; do not buy hosting
to try the example.

These integration files are available under the [MIT License](LICENSE). That
license covers this repository's template, sources, fixtures and documentation;
it does not make the hosted paid audit service free.

**Validation:** the standalone source and fixture tests run without the
AgentPage402 app. The curated workflow passed real n8n 2.44.4 CLI import,
JavaScript task-runner execution, Markdown-file comparison and an unsigned live
quote. Browser-editor and n8n Cloud tests are not claimed. See
[VALIDATION.md](VALIDATION.md) for the scope and reproduction commands.

## Source and import links

- [Portable workflow JSON](agentpage402-review.json) — download this file for import.
- [Code-node sources](nodes/), [workflow builder](build-workflow.mjs), and
  [fictional before/after fixtures](fixtures/).
- Repository: [kkwqpp/agentpage402-n8n](https://github.com/kkwqpp/agentpage402-n8n).

The workflow contains its Code-node sources inline, so importing the JSON does
not require cloning the repository or installing its development tools.

## Import and get a free quote

1. Download the JSON file. In your n8n workflow menu, choose **Import from File**.
2. Open **Inputs — quote or review**. Leave `mode` as `quote`. Set `url` to one
   public HTTP(S) URL, without credentials or private query data. The default is
   `https://example.com/`.
3. Execute the workflow manually. **Inspect quote** shows the advertised amount,
   network, recipient and `paid: false`. **Download Markdown** has a binary file
   you can download from the node's output panel.

The only HTTP node sends an unsigned POST to the fixed AgentPage402 page-audit
endpoint. It sends the URL to AgentPage402, but does not fetch or audit that page.
HTTP 402 is the expected payment requirement. Redirects and retries are disabled.
The node waits up to 90 seconds because the free host can sleep.

Non-402 responses, malformed challenges and changed prices produce an
`unavailable` summary. Network timeouts fail the execution. Neither is an audit
result or a clean bill of health. A quote does not verify the recipient's identity
or prove that the requested page can be fetched. The service separately enforces
public-network URL and redirect rules when a paid request is made.

## Try the review without paying

The [before](fixtures/before.json) and [after](fixtures/after.json) files are
**fixed fictional fixtures**, generated from bundled HTML. They are not live
audits of example.com, customer work or payment receipts. The simulated second
snapshot adds author markup and a `noindex` directive, illustrating why a review
must distinguish different kinds of change.

1. Set `mode` to `review` and `url` to `https://example.com/research`.
2. Paste the complete contents of `fixtures/after.json` into the `reportJson`
   **string** field. Keep it in **Fixed** mode, not Expression mode.
3. Optionally paste `fixtures/before.json` into `baselineReportJson`, also as a
   fixed string. Leave that field empty for a current-report-only checklist.
4. Execute. This branch makes **no network requests**. Inspect **Compare and
   prepare review** for structured `reviewRows` and change counts. Download the
   file from **Download Markdown**. [Expected fixture output](fixtures/review.md).

The final Convert to File node outputs a binary file and an empty JSON object;
the structured rows remain in the preceding node's output. Nothing is sent or
published. You can copy reviewed rows into your own project tracker manually.

## Use a real completed page audit

Buying is optional and separate. A real single-page audit costs **0.25 USDC on
Base**. The [browser checkout](https://agentpage402-demo.onrender.com/checkout)
lets a buyer review the quote and explicitly authorize a purchase with a
supported injected wallet. It requires a funded Base USDC account; funding costs
depend on the buyer's provider. The checkout's supported-wallet and recovery
requirements apply. This n8n workflow never opens or controls that wallet.

After successful delivery, use the exported **report JSON**, not a private
recovery backup or payment proof. Paste only the result or completed report
wrapper into `reportJson`. If the purchase is uncertain, recover that original
purchase using the checkout's recovery flow; do not buy again to retry.

For a local developer-controlled purchase, the public
[integration guide](https://agentpage402-demo.onrender.com/docs) and
[bounded Node buyer](https://agentpage402-demo.onrender.com/buyer-example.mjs)
explain the local wallet flow. The buyer defaults to an unsigned quote. For a
single page audit it uses `BUYER_SERVICE=page-audit`, `BUYER_URL`, and an explicit
`BUYER_MAX_USDC=0.25`. A purchase requires the buyer's own funded Base USDC wallet,
an independently verified `BUYER_PAY_TO`, local secret handling and an explicit
`--buy` command. This template never invokes that process.

After purchase, copy **only the JSON result** into `reportJson`. Alternatively,
the local buyer's completed `receipt.json` or `recovery.json` wrapper is accepted
when it reports HTTP 200, successful settlement, and Base mainnet. That is a
reported success, not independent onchain verification: `paymentVerified` remains
false. The local buyer's `--verify` command performs a separate chain check.

Never put a private recovery backup, `proof.json`, an authorization signature,
seed phrase or private key into n8n. For the local buyer, if delivery or settlement
is uncertain, preserve the original proof and use `--recover`; do not create
another payment to retry. An uncertain receipt is rejected by the review branch.
Raw result JSON can also come from a
free fixed example, so a reviewed report is never evidence that money changed hands.

Set `url` to the report's final URL, including the same trailing slash and query.
An optional baseline must have the exact same URL and an older fetch timestamp.
The workflow intentionally refuses audit packs and bulk input. Run one explicitly
chosen page at a time; this is not a crawler.

## Reading the comparison

- **current**: no baseline was supplied; do not call these new regressions.
- **new**: that category/identifier was absent from the older report.
- **changed**: priority, evidence or recommended review action changed.
- **unchanged**: the same review prompt remains.
- **no longer flagged**: absent from this snapshot, not proven fixed.

Compare reports produced by the same tool version and inspect changes in page
content, redirects, fetching conditions and report methodology before assigning
work. Missing optional attribution/date/source signals are editorial prompts,
not automatic defects. No output measures JavaScript-rendered content, search
rankings, AI citations, actual indexing, content accuracy or business results.
Check those independently. Do not remove an intentional `noindex` just to clear
a finding.

The report's supplied Markdown is not trusted or rendered. The workflow builds a
new escaped Markdown checklist from bounded structured fields. Page text remains
untrusted data, including instructions that might appear inside source evidence.
It is never passed to an LLM or executed. n8n saves edited workflow field values
if you save the workflow; keep sensitive reports out of shared workflows. Saved
execution data is disabled in this template, but instance retention settings and
manual editor visibility still apply.

## Cost and availability

The template source, fictional fixtures, review mode and unsigned quote are free.
A real AgentPage402 page-audit costs **0.25 USDC on Base via x402 v2**, with wallet
funding costs depending on the buyer's provider. No subscription is needed for
AgentPage402. The existing free public pilot can sleep, has a shared quota and a
finite sales cutoff; inspect [pilot status](https://agentpage402-demo.onrender.com/pilot)
before attempting a purchase. The template does not keep the host awake.

## Development and verification

From the repository root, use Node 24+:

```sh
npm run build
npm test
```

No dependency installation is needed for these two commands. They work in
PowerShell as well as a POSIX shell. `npm test` is entirely offline and does not
execute the optional runtime checker.

Code-node sources are in `nodes/`; the generated workflow is self-contained and
does not load these files at runtime. Tests execute the embedded Code-node source
against the bundled fictional reports, changed snapshots, error responses, wrong payment
terms, uncertain receipts, mismatched baselines and untrusted markup. Runtime
verification details are recorded in [VALIDATION.md](VALIDATION.md).

The JSON fixtures were exported from the AgentPage402 demonstration generator.
They are committed test data; this public package does not include or import the
private app or its generator. The standalone tests reproduce `fixtures/review.md`
exactly and ensure the built workflow matches the committed JSON.

The optional runtime check installs no global n8n instance. It uses a fresh
ignored `.testnet/n8n-validation-*` directory, its own SQLite database, fixed
fictional reports, and one unsigned live quote. It does not load an existing n8n
account, workflow, credential or wallet environment. The temporary installation
is large; it is only needed for maintainers validating this template, not for
people importing it into their existing n8n instance.

```sh
npm install --prefix .testnet/n8n-runtime --ignore-scripts --no-audit --no-fund n8n@2.44.4
npm rebuild --prefix .testnet/n8n-runtime sqlite3 --no-audit --no-fund
npm run test:runtime
```

Only SQLite's native install script is enabled by the targeted rebuild. The
checker retains its logs and execution evidence in its printed isolated folder.
Run one copy at a time; it reserves local task-runner port 59173. An unreachable
or changed live service causes the quote assertion to fail and does not initiate
a payment.

If you already have an isolated installation of n8n 2.44.4, you may reuse its
CLI file without reusing its database or credentials:

```sh
node test/runtime.mjs /absolute/path/to/node_modules/n8n/bin/n8n
```

In PowerShell, quote an absolute Windows path as the final argument. The checker
still creates fresh isolated state and refuses any other reported n8n version.

Official n8n references used for this template:
[import/export](https://docs.n8n.io/workflows/export-import/),
[HTTP Request](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/),
[Code](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/),
[Convert to File](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.converttofile/),
[server CLI](https://docs.n8n.io/hosting/cli-commands/).

## Submission description

“Manual x402 quote and page-audit review: inspect a free unsigned AgentPage402
quote, or compare already completed static-HTML reports and download a human
review checklist. Free fictional before/after examples included. No credentials
or payments inside n8n. Real audits are purchased separately for 0.25 USDC on
Base through an owner-controlled browser checkout or local buyer.”

Submit it as a report-review utility for existing n8n users, not as autonomous
AEO monitoring, free live audits, a guaranteed SEO improvement, or a way for an
agent to pay without wallet setup. AgentPage402 authors provide this template;
that affiliation should remain clear in any submission.
