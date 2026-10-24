import { Effect } from "effect"
import { AUDIT_EVENT_KINDS } from "#constants/runs"
import { Db } from "#db/client"
import { firstRow } from "#db/rows"
import { isoTimestamp } from "#db/sql"
import { withTransaction } from "#db/transaction"
import { RunNotReady } from "#errors/runs"
import { appendEvent } from "#repositories/audit-events"
import { countOpenIssues } from "#repositories/issues"
import { requireRunStatus, setRunStatus } from "#repositories/runs"
import type { RunId } from "#types/ids"
import type { Approval } from "#types/runs"

/** Approves the latest note version and closes the run. */
export const approveRun = (runId: RunId, approver: string) =>
  withTransaction(
    Effect.gen(function* () {
      const db = yield* Db
      yield* requireRunStatus(runId, ["awaiting_signoff"], "approve")
      const openIssues = yield* countOpenIssues(runId)
      if (openIssues > 0) {
        return yield* new RunNotReady({
          runId,
          status: "awaiting_signoff",
          reason: `Decide the ${openIssues} open issue${openIssues === 1 ? "" : "s"} before signing off`
        })
      }
      const rows = yield* db.query<{ version: number }>("select max(version) as version from notes where run_id = $1", [
        runId
      ])
      const { version } = yield* firstRow(rows, "approveRun")
      yield* db.query("insert into approvals (run_id, note_version, approver) values ($1, $2, $3)", [
        runId,
        version,
        approver
      ])
      yield* setRunStatus(runId, "approved")
      yield* appendEvent(runId, approver, AUDIT_EVENT_KINDS.RUN_APPROVED, { noteVersion: version })
    })
  )

export const getApproval = (runId: RunId) =>
  Effect.gen(function* () {
    const db = yield* Db
    const [approval] = yield* db.query<Approval>(
      `select note_version as "noteVersion", approver, ${isoTimestamp("approved_at")} as "approvedAt"
       from approvals where run_id = $1`,
      [runId]
    )
    return approval ?? null
  })
