# Validation record

Recorded October 20, 2026 Pacific with Node **24.18.0** on Windows. This
repository contains only the curated public integration sources and fictional
fixtures. Reports here are not customer audits, payment receipts or sales.

## Standalone package checks

- `npm run build`: generated the self-contained workflow JSON.
- `npm test`: **10/10 passed**, with no dependency installation or network access.
- The tests execute the exact embedded Code-node bodies in a Node VM with mocked
  n8n helpers. They cover graph integrity, unsigned-only requests, malformed and
  changed payment terms, unsupported inputs, uncertain receipts, same-page and
  timestamp checks, snapshot differences, and escaped untrusted source text.
- The bundled before/after snapshots reproduce `fixtures/review.md` exactly
  after normalizing fixture line endings. This package treats them as fixed
  exported data; it does not import the private application or its generator.
- All **11 relative README links** resolve locally.
- The executable workflow matches the curated integration exactly. Only the
  sticky note's documentation link points to this standalone repository.
- `node --check test/runtime.mjs` passed.
- `git diff --cached --check` passed across the full initial package.

## Actual n8n runtime verification

The integration maintainer completed the curated workflow check against
**n8n 2.44.4** at **2026-10-21 03:53:37 UTC**. It used a temporary local install,
new SQLite state, and the ordinary `import:workflow` followed by
`execute --id --rawOutput` commands. Only the SQLite native install script was
enabled after installing dependencies with `--ignore-scripts`.

Verified outcomes in the actual internal JavaScript task runner:

- Both inactive workflow copies imported successfully.
- Fixture review completed with `human_review_required`, new and
  no-longer-flagged prompts, and no HTTP-node execution.
- Convert to File produced `agentpage402-review.md`; decoded binary bytes matched
  the expected fixture Markdown after normalizing line endings.
- The default branch made one unsigned live POST and received HTTP **402**,
  decoded as `payment_required`, `amountUsdc: "0.25"`, and `paid: false`.
- The review node did not execute in quote mode. No wallet, key, signature,
  payment proof, paid request or automatic purchase was involved.

The standalone public package independently reproduced **all of these runtime
checks at 2026-10-21 03:58:33 UTC**, using its own relocated checker, committed
workflow and fixtures. It reused the same pinned n8n executable through the
documented optional CLI-path argument, with a fresh separate SQLite state
directory. Both CLI executions exited successfully; the unsigned quote was
HTTP 402 for 0.25 USDC and `paid: false`. No private app source was loaded.

The standalone package checker retains those assertions and adapts only the
repository paths. Its raw-output parser strips ANSI sequences and tolerates
startup/shutdown logging. It uses info-level logs because n8n emits raw execution
JSON through that logger. See the README for pinned installation and reproduction
commands. Every run uses a new ignored `.testnet/n8n-validation-*` folder; it
never loads an existing n8n database or wallet environment. A supplied CLI path
reuses software only, not its state.

## Coverage limits

The browser editor, clicking its download button, n8n Cloud, other n8n versions,
and external task-runner deployments are not tested. Binary-file content was
verified through the CLI execution result. Malformed quotes, uncertain receipts
and other failure cases are tested by the offline Node VM suite. The Windows
runtime warned that a Python runner was unavailable; this workflow uses only
JavaScript and its JavaScript runner completed both branches.

No real purchase, settlement, independent chain verification, paid customer
audit or customer workflow is claimed. This is a manual unsigned-quote and
completed-report review utility, not an autonomous paid agent or citation monitor.
