import { Effect } from "effect"
import { AUDIT_EVENT_KINDS } from "#constants/runs"
import { Db } from "#db/client"
import { withTransaction } from "#db/transaction"
import type { FigureClaim, FigureSet, VerifiedFigure } from "#types/figures"
import type { RunId } from "#types/ids"
import { appendEvent } from "#repositories/audit-events"
import { requireRunStatus } from "#repositories/runs"

/** Stores a verified figure, replacing any earlier value for the same key. */
export const recordFigure = (runId: RunId, figure: VerifiedFigure, actor: string) =>
  withTransaction(
    Effect.gen(function* () {
      const db = yield* Db
      yield* requireRunStatus(runId, ["extracting"], "record figures")
      yield* db.query(
        `insert into figures (run_id, key, reported, scale, value, page, quote) values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (run_id, key) do update set reported = excluded.reported, scale = excluded.scale,
         value = excluded.value, page = excluded.page, quote = excluded.quote, recorded_at = now()`,
        [runId, figure.key, figure.reported, figure.scale, figure.value, figure.page, figure.quote]
      )
      yield* appendEvent(runId, actor, AUDIT_EVENT_KINDS.FIGURE_VERIFIED, figure)
    })
  )

/** Logs a figure claim that failed verification. */
export const recordRejectedFigure = (
  runId: RunId,
  claim: FigureClaim,
  error: { readonly _tag: string },
  actor: string
) => appendEvent(runId, actor, AUDIT_EVENT_KINDS.FIGURE_REJECTED, { claim, error })

/** Lists a run's verified figures. */
export const listFigures = (runId: RunId) =>
  Effect.gen(function* () {
    const db = yield* Db
    return yield* db.query<VerifiedFigure>(
      `select key, reported::float8 as reported, scale::float8 as scale, value::float8 as value, page, quote
       from figures where run_id = $1 order by key`,
      [runId]
    )
  })

/** Returns a run's verified figures keyed by figure. */
export const getFigures = (runId: RunId) =>
  Effect.gen(function* () {
    const rows = yield* listFigures(runId)
    const figures: FigureSet = {}
    for (const row of rows) figures[row.key] = row
    return figures
  })
