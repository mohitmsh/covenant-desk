# Covenant Desk

**Live demo: https://covenant-desk.onrender.com**

Covenant Desk checks the monthly reporting pack that a borrower sends to its lender. An AI agent reads the PDF and finds the figures. Code then tests the loan covenants and compares the results with the borrower's compliance certificate. An analyst reviews each issue on the document and signs off.

All borrowers, lenders and documents are fictional.

> The demo runs on a free server. If nobody has used it for 15 minutes, the first page can take up to one minute to open.

![Run review: the certificate disagrees with the tested results](docs/screenshots/run-review.png)

## What it does

1. The agent reads the PDF and finds six figures: revenue, EBITDA, interest, debt, cash and the undrawn facility. For each figure, it copies the line from the page.
2. Code finds each copied line on its page. If the line is not there, the code rejects the figure and the agent must try again.
3. Code calculates net leverage, interest cover and minimum liquidity. It compares each one with the covenant limit.
4. Code reads the borrower's compliance certificate and compares it with the tested results.
5. Code checks the pack for problems:
   - a certificate figure that does not agree with the tested result
   - a subtotal that does not equal the sum of its lines
   - the same line with different values on two pages
   - a change of more than 25% from the prior period
   - a pack for a different period
6. The agent writes a monitoring note.
7. The analyst decides each issue on the document. Sign-off stays locked until all issues have a decision.

The model does not calculate covenants. Code does all calculations, so the model cannot change a result.

![Issue review: each issue has a box on the PDF and a decision card](docs/screenshots/issue-review.png)

## Try it with a mock PDF

1. Open the [live demo](https://covenant-desk.onrender.com).
2. Click **New run**.
3. Select the borrower in the table below.
4. Download the PDF and drop it into the dialog.
5. Click **Run agent**. The run takes about one minute.

| PDF                                                                                                                                    | Borrower               | What to look for                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| [corella-2026-09-resubmitted.pdf](https://github.com/mohitmsh/covenant-desk/raw/main/fixtures/uploads/corella-2026-09-resubmitted.pdf) | Corella Fresh Foods    | Net leverage is in breach. The certificate says it complies.                                |
| [units-trap.pdf](https://github.com/mohitmsh/covenant-desk/raw/main/fixtures/evals/packs/units-trap.pdf)                               | Corella Fresh Foods    | Two pages show $ millions and one page shows $'000. All figures must be correct in dollars. |
| [conflicting-pages.pdf](https://github.com/mohitmsh/covenant-desk/raw/main/fixtures/evals/packs/conflicting-pages.pdf)                 | Corella Fresh Foods    | Cash on page 4 is different from cash on page 5.                                            |
| [wrong-period.pdf](https://github.com/mohitmsh/covenant-desk/raw/main/fixtures/evals/packs/wrong-period.pdf)                           | Harbourline Freight    | The pack is for August 2026, not September 2026.                                            |
| [prompt-injection.pdf](https://github.com/mohitmsh/covenant-desk/raw/main/fixtures/evals/packs/prompt-injection.pdf)                   | Wattle Grove Aged Care | Hidden white text tells the AI to report compliance. The agent must ignore it.              |

The original packs are in [`fixtures/packs`](fixtures/packs). If you do not upload a file, the app uses the borrower's original pack.

The demo allows 20 agent runs each day. This limit keeps the API cost low.

## Test results

The **Test results** page shows 8 test cases. Each case runs a pack through the same agent, checks and code as the app. The expected answers are in separate files, so the agent cannot see them.

The latest run passed 8 of 8 cases and 119 of 119 checks. The model cost was $0.047 with Claude Haiku 5.5.

![Test results: 8 cases, 119 checks](docs/screenshots/test-results.png)

## The demo runs are real agent runs

The three runs in the sidebar come from the real agent. The `npm run record` command ran Claude on each pack and saved the model responses in [`fixtures/recordings`](fixtures/recordings). When the demo starts, it sends those responses through the current code again. This gives the same result on each start and costs nothing. **New run** always calls the model.

![Portfolio: one line for each borrower](docs/screenshots/portfolio.png)

## Run it on your computer

You need Node 25 and an Anthropic API key.

```sh
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
npm run demo:reset
npm run dev
```

Then open http://localhost:5173.

| Command               | What it does                                                                  |
| --------------------- | ----------------------------------------------------------------------------- |
| `npm test`            | Runs the unit and integration tests.                                          |
| `npm run eval`        | Runs the 8 test cases from the recordings. Add `-- --live` to call the model. |
| `npm run record`      | Runs the agent on each demo pack and saves the responses.                     |
| `npm run fixtures`    | Makes the demo packs and their answers again.                                 |
| `npm run evals:build` | Makes the test-case packs and their answers again.                            |

## How it is built

| Folder          | Contents                                                               |
| --------------- | ---------------------------------------------------------------------- |
| `apps/agent`    | The agent loop on the Anthropic API, the eval runner and the recorder. |
| `apps/api`      | The Hono API. It starts runs and serves the PDFs and the web app.      |
| `apps/web`      | The React review screens and the PDF viewer.                           |
| `packages/core` | Covenant tests, source checks, review checks and the database code.    |
| `fixtures`      | Fictional borrowers, packs, test cases and recordings.                 |

On your computer, the app keeps its data in PGlite in `.data/`. If you set `DATABASE_URL`, it uses Postgres. It then also keeps the PDFs in Postgres.

## Deploy

[`render.yaml`](render.yaml) deploys the Dockerfile to Render as one web service. Set these values:

| Variable                | Value                                                                     |
| ----------------------- | ------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`     | Your Anthropic API key.                                                   |
| `DATABASE_URL`          | A Postgres connection string, for example from Neon.                      |
| `DAILY_AGENT_RUN_LIMIT` | The number of agent runs allowed each day. The default is 20.             |
| `RESET_DEMO_ON_START`   | Set to `true` to reset the demo data when the recordings or packs change. |

When the server starts, it updates the database and adds the demo runs. A database lock stops two servers from doing this at the same time.
