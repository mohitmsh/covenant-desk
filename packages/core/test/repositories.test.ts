import {
  AUDIT_EVENT_KINDS,
  Db,
  appendEvent,
  approveRun,
  getFigures,
  getMonitoringContext,
  listEvents,
  recordCovenantResults,
  recordFigure,
  saveNote,
  testAll,
  upsertBorrower,
  withTransaction
} from "@covenant-desk/core"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { runWithDb, startTestRun, TEST_ACTOR, TEST_APPROVER, testBorrower, testCovenants } from "./support/db"
import { verifiedFigure } from "./support/figures"

class Aborted {
  readonly _tag = "Aborted"
}

describe("borrowers", () => {
  it("returns the latest version of each covenant", async () => {
    const [leverage] = testCovenants
    const context = await runWithDb(
      Effect.gen(function* () {
        if (leverage) yield* upsertBorrower(testBorrower, [{ ...leverage, version: 2, limit: 3.25 }], "2026-07-01")
        return yield* getMonitoringContext(testBorrower.id)
      })
    )
    expect(context.covenants).toHaveLength(2)
    expect(context.covenants.find((c) => c.id === "acme-lev")).toMatchObject({ version: 2, limit: 3.25 })
  })
})

describe("monitoring runs", () => {
  it("records each step of a run in the audit log", async () => {
    const { events, figures } = await runWithDb(
      Effect.gen(function* () {
        const runId = yield* startTestRun
        const extracted = [
          verifiedFigure("total_debt", 19_850_000),
          verifiedFigure("cash", 3_420_000),
          verifiedFigure("ebitda_ttm", 7_940_000),
          verifiedFigure("interest_expense_ttm", 1_310_000)
        ]
        for (const figure of extracted) yield* recordFigure(runId, figure, TEST_ACTOR)
        const figures = yield* getFigures(runId)
        yield* recordCovenantResults(runId, yield* testAll(testCovenants, figures), TEST_ACTOR)
        yield* saveNote(runId, "All covenants met.", TEST_ACTOR)
        yield* approveRun(runId, TEST_APPROVER)
        return { events: yield* listEvents(runId), figures }
      })
    )

    expect(figures.ebitda_ttm?.value).toBe(7_940_000)
    expect(events.map((e) => e.kind)).toEqual([
      AUDIT_EVENT_KINDS.RUN_STARTED,
      ...Array(4).fill(AUDIT_EVENT_KINDS.FIGURE_VERIFIED),
      AUDIT_EVENT_KINDS.COVENANTS_TESTED,
      AUDIT_EVENT_KINDS.NOTE_SAVED,
      AUDIT_EVENT_KINDS.RUN_APPROVED
    ])
    expect(events.at(-1)?.actor).toBe(TEST_APPROVER)
  })

  it("rejects approval before a note is saved", async () => {
    const error = await runWithDb(
      Effect.flip(Effect.flatMap(startTestRun, (runId) => approveRun(runId, TEST_APPROVER)))
    )
    expect(error._tag).toBe("RunNotReady")
  })

  it("rejects new figures after covenants are tested", async () => {
    const error = await runWithDb(
      Effect.flip(
        Effect.gen(function* () {
          const runId = yield* startTestRun
          yield* recordFigure(runId, verifiedFigure("cash", 1), TEST_ACTOR)
          yield* recordCovenantResults(runId, [], TEST_ACTOR)
          yield* recordFigure(runId, verifiedFigure("cash", 2), TEST_ACTOR)
        })
      )
    )
    expect(error._tag).toBe("RunNotReady")
  })
})

describe("transactions", () => {
  it("rolls back every write when the transaction fails", async () => {
    const figures = await runWithDb(
      Effect.gen(function* () {
        const runId = yield* startTestRun
        yield* withTransaction(
          Effect.gen(function* () {
            yield* recordFigure(runId, verifiedFigure("cash", 1), TEST_ACTOR)
            return yield* Effect.fail(new Aborted())
          })
        ).pipe(Effect.ignore)
        return yield* getFigures(runId)
      })
    )
    expect(figures).toEqual({})
  })
})

describe("audit log", () => {
  it("cannot be deleted", async () => {
    const error = await runWithDb(
      Effect.flip(
        Effect.gen(function* () {
          const runId = yield* startTestRun
          yield* appendEvent(runId, TEST_ACTOR, AUDIT_EVENT_KINDS.NOTE_SAVED)
          const db = yield* Db
          yield* db.query("delete from audit_events where run_id = $1", [runId])
        })
      )
    )
    expect(error._tag).toBe("DbError")
    expect(error._tag === "DbError" && error.cause.message).toContain("append-only")
  })
})
