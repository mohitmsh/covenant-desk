import { Effect } from "effect"
import { ACTIVE_RUN_WINDOW_MINUTES, AUDIT_EVENT_KINDS } from "#constants/runs"
import { Db } from "#db/client"
import { firstRow } from "#db/rows"
import { isoTimestamp } from "#db/sql"
import { withTransaction } from "#db/transaction"
import { NotFound, RunNotReady } from "#errors/runs"
import { appendEvent } from "#repositories/audit-events"
import type { DocumentId, RunId } from "#types/ids"
import type { NewRun, RunStatus, RunSummary } from "#types/runs"

const RUN_SUMMARY_SELECT = `
  select r.id, r.borrower_id as "borrowerId", b.name as "borrowerName", r.period, r.status,
    r.started_by as "startedBy", ${isoTimestamp("r.created_at")} as "createdAt",
    count(c.*) filter (where c.status = 'breach')::int as breaches,
    count(c.*) filter (where c.status = 'watch')::int as watches,
    (select count(*) from review_issues i where i.run_id = r.id and i.status = 'open')::int as "openIssues"
  from runs r
  join borrowers b on b.id = r.borrower_id
  left join covenant_results c on c.run_id = r.id`

const RUN_SUMMARY_GROUP = "group by r.id, b.name"

/** Starts a monitoring run for a registered document. */
export const startRun = (run: NewRun) =>
  withTransaction(
    Effect.gen(function* () {
      const db = yield* Db
      const rows = yield* db.query<{ id: RunId }>(
        "insert into runs (borrower_id, period, document_id, started_by) values ($1, $2, $3, $4) returning id",
        [run.borrowerId, run.period, run.documentId, run.startedBy]
      )
      const { id } = yield* firstRow(rows, "startRun")
      yield* appendEvent(id, run.startedBy, AUDIT_EVENT_KINDS.RUN_STARTED, {
        period: run.period,
        documentId: run.documentId
      })
      return id
    })
  )

/** Locks the run row and fails unless the run is in one of the allowed statuses. */
export const requireRunStatus = (runId: RunId, allowed: ReadonlyArray<RunStatus>, action: string) =>
  Effect.gen(function* () {
    const db = yield* Db
    const [run] = yield* db.query<{ status: RunStatus }>("select status from runs where id = $1 for update", [runId])
    if (run === undefined) return yield* new NotFound({ entity: "run", id: runId })
    if (!allowed.includes(run.status)) {
      return yield* new RunNotReady({
        runId,
        status: run.status,
        reason: `Cannot ${action} while the run is ${run.status}`
      })
    }
  })

/** Sets a run's status. Callers are responsible for checking the transition. */
export const setRunStatus = (runId: RunId, status: RunStatus) =>
  Effect.gen(function* () {
    const db = yield* Db
    yield* db.query("update runs set status = $2 where id = $1", [runId, status])
  })

/** Lists runs, newest first. */
export const listRuns = Effect.gen(function* () {
  const db = yield* Db
  return yield* db.query<RunSummary>(`${RUN_SUMMARY_SELECT} ${RUN_SUMMARY_GROUP} order by r.created_at desc`)
})

export const getRunSummary = (runId: RunId) =>
  Effect.gen(function* () {
    const db = yield* Db
    const [run] = yield* db.query<RunSummary>(`${RUN_SUMMARY_SELECT} where r.id = $1 ${RUN_SUMMARY_GROUP}`, [runId])
    if (run === undefined) return yield* new NotFound({ entity: "run", id: runId })
    return run
  })

export const getRunDocumentId = (runId: RunId) =>
  Effect.gen(function* () {
    const db = yield* Db
    const [run] = yield* db.query<{ documentId: DocumentId }>(
      `select document_id as "documentId" from runs where id = $1`,
      [runId]
    )
    if (run === undefined) return yield* new NotFound({ entity: "run", id: runId })
    return run.documentId
  })

/** Marks a run as failed and records why. */
export const markRunFailed = (runId: RunId, actor: string, reason: string) =>
  withTransaction(
    Effect.gen(function* () {
      yield* setRunStatus(runId, "failed")
      yield* appendEvent(runId, actor, AUDIT_EVENT_KINDS.RUN_FAILED, { reason })
    })
  )

/** Whether an agent run started in the last few minutes is still extracting. */
export const hasActiveAgentRun = Effect.gen(function* () {
  const db = yield* Db
  const [row] = yield* db.query<{ active: boolean }>(
    `select exists (
       select 1 from runs
       where status = 'extracting' and started_by like 'agent:%'
         and created_at > now() - make_interval(mins => $1)
     ) as active`,
    [ACTIVE_RUN_WINDOW_MINUTES]
  )
  return row?.active ?? false
})

/** Agent runs started in the last 24 hours. */
export const countRecentAgentRuns = Effect.gen(function* () {
  const db = yield* Db
  const [row] = yield* db.query<{ count: number }>(
    `select count(*)::int as count from runs
     where started_by like 'agent:%' and created_at > now() - interval '24 hours'`,
    []
  )
  return row?.count ?? 0
})
