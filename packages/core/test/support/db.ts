import {
  BorrowerIdSchema,
  DEFAULT_WATCH_HEADROOM,
  Db,
  migrate,
  pgliteLayer,
  registerDocument,
  startRun,
  upsertBorrower,
  type Borrower,
  type CovenantDefinition
} from "@covenant-desk/core"
import { Effect, Layer, Schema } from "effect"

export const TEST_ACTOR = "agent:test"
export const TEST_APPROVER = "Amelia Moreau"
export const TEST_ANALYST = "Jonah Okafor"
export const TEST_PERIOD = "2026-09"

export const testBorrower: Borrower = {
  id: Schema.decodeSync(BorrowerIdSchema)("acme"),
  name: "Acme Pty Ltd",
  facilityName: "Term loan",
  facilityLimit: 10_000_000,
  analyst: TEST_ANALYST
}

export const testCovenants: ReadonlyArray<CovenantDefinition> = [
  {
    id: "acme-lev",
    version: 1,
    name: "Net leverage",
    metric: "net_leverage",
    operator: "lte",
    limit: 3.5,
    watchHeadroom: DEFAULT_WATCH_HEADROOM
  },
  {
    id: "acme-icr",
    version: 1,
    name: "Interest cover",
    metric: "interest_cover",
    operator: "gte",
    limit: 2,
    watchHeadroom: DEFAULT_WATCH_HEADROOM
  }
]

/** Runs `program` against a fresh, migrated in-memory database seeded with the test borrower. */
export const runWithDb = <A, E>(program: Effect.Effect<A, E, Db>) =>
  Effect.runPromise(
    Effect.gen(function* () {
      yield* migrate
      yield* upsertBorrower(testBorrower, testCovenants, "2026-01-01")
      return yield* program
    }).pipe(Effect.provide(Layer.fresh(pgliteLayer())))
  )

/** Registers a document and starts a run for the test borrower. */
export const startTestRun = Effect.gen(function* () {
  const documentId = yield* registerDocument({
    borrowerId: testBorrower.id,
    period: TEST_PERIOD,
    filename: "pack.pdf",
    sha256: "a".repeat(64),
    storageKey: `${"a".repeat(64)}.pdf`,
    pageCount: 6
  })
  return yield* startRun({ borrowerId: testBorrower.id, period: TEST_PERIOD, documentId, startedBy: TEST_ACTOR })
})
