import { Effect } from "effect"
import { Db } from "#db/client"
import { isoTimestamp } from "#db/sql"
import type { RunId } from "#types/ids"
import type { AuditEvent } from "#types/runs"

/** Appends an event to a run's audit log. */
export const appendEvent = (runId: RunId, actor: string, kind: string, detail: object = {}) =>
  Effect.gen(function* () {
    const db = yield* Db
    yield* db.query("insert into audit_events (run_id, actor, kind, detail) values ($1, $2, $3, $4)", [
      runId,
      actor,
      kind,
      JSON.stringify(detail)
    ])
  })

/** Lists a run's audit events, oldest first. */
export const listEvents = (runId: RunId) =>
  Effect.gen(function* () {
    const db = yield* Db
    return yield* db.query<AuditEvent>(
      `select id::int as id, ${isoTimestamp("at")} as at, actor, kind, detail from audit_events where run_id = $1 order by id`,
      [runId]
    )
  })
