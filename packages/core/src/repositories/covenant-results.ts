import { Effect } from "effect"
import { AUDIT_EVENT_KINDS } from "#constants/runs"
import { Db } from "#db/client"
import { withTransaction } from "#db/transaction"
import type { CovenantResult } from "#types/covenants"
import type { RunId } from "#types/ids"
import { appendEvent } from "#repositories/audit-events"
import { requireRunStatus, setRunStatus } from "#repositories/runs"

/** Replaces a run's covenant results and moves it to `tested`. */
export const recordCovenantResults = (runId: RunId, results: ReadonlyArray<CovenantResult>, actor: string) =>
  withTransaction(
    Effect.gen(function* () {
      const db = yield* Db
      yield* requireRunStatus(runId, ["extracting", "tested"], "test covenants")
      yield* db.query("delete from covenant_results where run_id = $1", [runId])
      for (const r of results) {
        yield* db.query(
          `insert into covenant_results (run_id, covenant_id, covenant_version, name, metric, operator, limit_value, actual, headroom, status, formula, inputs)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            runId,
            r.covenantId,
            r.covenantVersion,
            r.name,
            r.metric,
            r.operator,
            r.limit,
            r.actual,
            r.headroom,
            r.status,
            r.formula,
            JSON.stringify(r.inputs)
          ]
        )
      }
      yield* setRunStatus(runId, "tested")
      yield* appendEvent(runId, actor, AUDIT_EVENT_KINDS.COVENANTS_TESTED, {
        results: results.map((r) => ({
          covenantId: r.covenantId,
          version: r.covenantVersion,
          actual: r.actual,
          status: r.status
        }))
      })
    })
  )

export const getCovenantResults = (runId: RunId) =>
  Effect.gen(function* () {
    const db = yield* Db
    return yield* db.query<CovenantResult>(
      `select covenant_id as "covenantId", covenant_version as "covenantVersion", name, metric, operator,
         limit_value::float8 as "limit", actual::float8 as actual, headroom::float8 as headroom, status, formula, inputs
       from covenant_results where run_id = $1 order by covenant_id`,
      [runId]
    )
  })
