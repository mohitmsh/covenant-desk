import {
  approveRun,
  decideIssue,
  getFigures,
  listEvents,
  listIssues,
  recordCovenantResults,
  recordFigure,
  recordIssues,
  saveNote,
  testAll,
  type IssueFinding
} from "@covenant-desk/core"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { runWithDb, startTestRun, TEST_ACTOR, TEST_APPROVER, testBorrower, testCovenants } from "./support/db"
import { verifiedFigure } from "./support/figures"

const finding: IssueFinding = {
  key: "subtotal:p4:Total assets",
  fingerprint: "subtotal:Total assets",
  kind: "subtotal",
  category: "discrepancy",
  severity: "high",
  title: "Total assets does not add up",
  detail: "30 Sep 2026: printed $27,000k, but the lines = $26,910k (over by $90k).",
  page: 4,
  box: { x: 0.09, y: 0.26, width: 0.82, height: 0.02 },
  evidence: [{ label: "Total assets as printed", value: "$27,000k", page: 4, box: null }],
  impact: "The page contradicts itself.",
  checks: ["Ask the borrower to reissue the page"]
}

const periodFinding: IssueFinding = {
  ...finding,
  key: "period:p1",
  fingerprint: "period:2026-08",
  kind: "period",
  category: "verify",
  title: "Pack is for August 2026, not the September 2026 period being tested"
}

/** A run awaiting sign-off, with the finding recorded. */
const runAwaitingSignoff = (recorded: IssueFinding = finding) =>
  Effect.gen(function* () {
    const runId = yield* startTestRun
    for (const figure of [
      verifiedFigure("total_debt", 19_850_000),
      verifiedFigure("cash", 3_420_000),
      verifiedFigure("ebitda_ttm", 7_940_000),
      verifiedFigure("interest_expense_ttm", 1_310_000)
    ]) {
      yield* recordFigure(runId, figure, TEST_ACTOR)
    }
    yield* recordCovenantResults(runId, yield* testAll(testCovenants, yield* getFigures(runId)), TEST_ACTOR)
    yield* recordIssues(runId, testBorrower.id, [recorded], TEST_ACTOR)
    yield* saveNote(runId, "All covenants met.", TEST_ACTOR)
    return runId
  })

describe("review issues", () => {
  it("blocks sign-off until every issue is decided, and logs each decision", async () => {
    const { blocked, issues, events } = await runWithDb(
      Effect.gen(function* () {
        const runId = yield* runAwaitingSignoff()
        const blocked = yield* Effect.flip(approveRun(runId, TEST_APPROVER))
        yield* decideIssue(runId, finding.key, { action: "accept", actor: TEST_APPROVER })
        yield* approveRun(runId, TEST_APPROVER)
        return { blocked, issues: yield* listIssues(runId), events: yield* listEvents(runId) }
      })
    )
    expect(blocked).toMatchObject({ _tag: "RunNotReady", reason: "Decide the 1 open issue before signing off" })
    expect(issues[0]).toMatchObject({ status: "accepted", resolution: { by: TEST_APPROVER, remembered: false } })
    expect(issues[0]?.box).toEqual(finding.box)
    expect(events.map((e) => e.kind)).toContain("issue.decided")
  })

  it("requires a reason to override and a draft to query the borrower", async () => {
    const errors = await runWithDb(
      Effect.gen(function* () {
        const runId = yield* runAwaitingSignoff()
        return yield* Effect.all([
          Effect.flip(decideIssue(runId, finding.key, { action: "override", actor: TEST_APPROVER, reason: " " })),
          Effect.flip(decideIssue(runId, finding.key, { action: "query", actor: TEST_APPROVER }))
        ])
      })
    )
    expect(errors.map((e) => e._tag)).toEqual(["InvalidDecision", "InvalidDecision"])
  })

  it("holds a drafted query, and can reopen a decision", async () => {
    const [queried, reopened] = await runWithDb(
      Effect.gen(function* () {
        const runId = yield* runAwaitingSignoff()
        yield* decideIssue(runId, finding.key, {
          action: "query",
          actor: TEST_APPROVER,
          draft: "Please confirm trade receivables at 30 September."
        })
        const queried = yield* listIssues(runId)
        yield* decideIssue(runId, finding.key, { action: "reopen", actor: TEST_APPROVER })
        return [queried, yield* listIssues(runId)] as const
      })
    )
    expect(queried[0]).toMatchObject({
      status: "queried",
      resolution: { draft: "Please confirm trade receivables at 30 September." }
    })
    expect(reopened[0]).toMatchObject({ status: "open", resolution: null })
  })

  it("reapplies a remembered decision on how to read the pack to the borrower's next pack", async () => {
    const { issues, events } = await runWithDb(
      Effect.gen(function* () {
        const first = yield* runAwaitingSignoff(periodFinding)
        yield* decideIssue(first, periodFinding.key, {
          action: "override",
          actor: TEST_APPROVER,
          reason: "Known rounding in the borrower's template.",
          remember: true
        })
        const next = yield* runAwaitingSignoff(periodFinding)
        return { issues: yield* listIssues(next), events: yield* listEvents(next) }
      })
    )
    expect(issues[0]).toMatchObject({
      status: "overridden",
      resolution: { remembered: true, reason: "Known rounding in the borrower's template.", by: TEST_APPROVER }
    })
    expect(events.map((e) => e.kind)).toContain("issue.remembered")
  })

  it("does not remember decisions on discrepancies", async () => {
    const issues = await runWithDb(
      Effect.gen(function* () {
        const first = yield* runAwaitingSignoff()
        yield* decideIssue(first, finding.key, { action: "accept", actor: TEST_APPROVER, remember: true })
        return yield* listIssues(yield* runAwaitingSignoff())
      })
    )
    expect(issues[0]).toMatchObject({ status: "open", resolution: null })
  })

  it("does not let the analyst approve their own run", async () => {
    const error = await runWithDb(
      Effect.gen(function* () {
        const runId = yield* runAwaitingSignoff()
        yield* decideIssue(runId, finding.key, { action: "accept", actor: TEST_APPROVER })
        return yield* Effect.flip(approveRun(runId, testBorrower.analyst))
      })
    )
    expect(error).toMatchObject({ _tag: "RunNotReady" })
  })
})
