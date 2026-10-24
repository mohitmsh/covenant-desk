# Covenant Desk

An agent that reads a borrower's monthly reporting pack, tests its loan covenants, and checks the borrower's own compliance certificate against the numbers. Every figure is tied back to the page and line it came from, and nothing is final until an analyst signs off.

**Eval, three reporting packs:** 18/18 figures extracted correctly, 9/9 covenants tested correctly, 9/9 certificate claims read correctly, and 1/1 misreported breach caught, for $0.017 in model cost (Claude Haiku 5.5).

The borrowers, lender and documents are fictional.

## What it does

1. **Extracts** revenue, EBITDA, interest, debt, cash and undrawn facility from the PDF, each with a quote from its source page.
2. **Verifies** every quote against the page text before the figure is accepted. A figure the model can't ground is rejected and sent back.
3. **Tests** net leverage, interest cover and minimum liquidity against the facility's covenants, with headroom and a watch band.
4. **Checks the compliance certificate.** It reads what the borrower claims and flags any claim that disagrees with the tested result, such as EBITDA flattered by add-backs that hide a breach.
5. **Runs review checks in code** after extraction: certificate claims that disagree with the tested results, subtotals that don't add up, and lines that moved more than 25% on the prior period. Each issue is boxed on the PDF, and the analyst steps through them like a signing flow: accept, override with a reason, draft a query to the borrower (held, never sent), or remember the decision for the borrower's next pack. Sign-off stays locked until every issue is decided.
6. **Drafts a monitoring note** for the analyst to edit and approve. Every step is recorded in an audit trail.

## Run it locally

Requires Node 25.

```sh
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
npm run demo:reset   # seed three borrowers and their September 2026 runs
npm run dev          # http://localhost:5173
```

`fixtures/uploads/corella-2026-09-resubmitted.pdf` is a pack the app has never seen. Upload it under Corella Fresh Foods to watch the agent find a breach that the certificate claims is compliant.

| Command                             | What it does                                                   |
| ----------------------------------- | -------------------------------------------------------------- |
| `npm test`                          | Unit and integration tests                                     |
| `npm run eval`                      | Runs the agent on every pack and scores it against answer keys |
| `npm run fixtures`                  | Regenerates the sample packs and their answer keys             |
| `npm run build:uploads -w fixtures` | Regenerates the unseen demo upload                             |

## How it's built

- `apps/agent`: the tool-using agent loop on the Anthropic API, with tools for recording and verifying figures and certificate claims.
- `apps/api`: Hono API. It starts runs in the background and serves PDFs and, in production, the web app.
- `apps/web`: React review UI with a PDF viewer that highlights the source line of each figure.
- `packages/core`: domain logic (covenant tests, quote verification, PDF text) and Postgres repositories.
- `fixtures`: fictional borrowers, generated reporting packs and answer keys.

Locally the database is embedded PGlite under `.data/`. Set `DATABASE_URL` to use Postgres instead; PDFs are then stored in the database too, so nothing depends on local disk.

## Deploy

`render.yaml` deploys the Dockerfile as one web service on Render. It needs:

- `ANTHROPIC_API_KEY`
- `DATABASE_URL`: any Postgres, for example a free Neon database
- `DAILY_AGENT_RUN_LIMIT`: agent runs allowed per 24 hours (20 by default), so a public link can't run up API spend
- `RESET_DEMO_ON_START`: when `true`, empties the database on start so every boot is a clean demo

On start it applies migrations and seeds the demo runs if they aren't there yet.
