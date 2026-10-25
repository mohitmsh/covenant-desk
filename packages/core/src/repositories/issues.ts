import { Effect } from "effect"
import { ISSUE_ACTION_STATUS } from "#constants/issues"
import { AUDIT_EVENT_KINDS } from "#constants/runs"
import { Db } from "#db/client"
import { withTransaction } from "#db/transaction"
import { InvalidDecision } from "#errors/issues"
import { NotFound } from "#errors/runs"
import { appendEvent } from "#repositories/audit-events"
import { requireRunStatus } from "#repositories/runs"
import type { BorrowerId, RunId } from "#types/ids"
import type { Issue, IssueDecision, IssueFinding, IssueResolution, IssueStatus } from "#types/issues"

const ISSUE_COLUMNS = `key, fingerprint, kind, category, severity, title, detail, page, box, status, resolution`

const ISSUE_SELECT = `${ISSUE_COLUMNS}, context->'evidence' as evidence, context->>'impact' as impact,
  context->'checks' as checks`

const insertIssue = (runId: RunId, finding: IssueFinding, status: IssueStatus, resolution: IssueResolution | null) =>
  Effect.gen(function* () {
    const db = yield* Db
    yield* db.query(
      `insert into review_issues (run_id, ${ISSUE_COLUMNS}, context)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        runId,
        finding.key,
        finding.fingerprint,
        finding.kind,
        finding.category,
        finding.severity,
        finding.title,
        finding.detail,
        finding.page,
        JSON.stringify(finding.box),
        status,
        JSON.stringify(resolution),
        JSON.stringify({ evidence: finding.evidence, impact: finding.impact, checks: finding.checks })
      ]
    )
  })

/**
 * Stores the findings of a check run. Open issues from an earlier check are
 * replaced; decided ones are kept. A finding the analyst asked to remember for
 * this borrower is decided automatically, the same way as before.
 */
export const recordIssues = (
  runId: RunId,
  borrowerId: BorrowerId,
  findings: ReadonlyArray<IssueFinding>,
  actor: string
) =>
  withTransaction(
    Effect.gen(function* () {
      const db = yield* Db
      yield* db.query("delete from review_issues where run_id = $1 and status = 'open'", [runId])
      const decided = new Set(
        (yield* db.query<{ key: string }>("select key from review_issues where run_id = $1", [runId])).map(
          (row) => row.key
        )
      )

      let remembered = 0
      for (const finding of findings) {
        if (decided.has(finding.key)) continue
        const [memory] = yield* db.query<{ decision: "accepted" | "overridden"; reason: string | null; by: string }>(
          `select decision, reason, decided_by as by from review_memories where borrower_id = $1 and fingerprint = $2`,
          [borrowerId, finding.fingerprint]
        )
        if (memory === undefined) {
          yield* insertIssue(runId, finding, "open", null)
          continue
        }
        const resolution: IssueResolution = {
          by: memory.by,
          at: new Date().toISOString(),
          reason: memory.reason,
          draft: null,
          remembered: true
        }
        yield* insertIssue(runId, finding, memory.decision, resolution)
        yield* appendEvent(runId, actor, AUDIT_EVENT_KINDS.ISSUE_REMEMBERED, {
          key: finding.key,
          title: finding.title,
          status: memory.decision,
          reason: memory.reason,
          decidedBy: memory.by
        })
        remembered++
      }
      yield* appendEvent(runId, actor, AUDIT_EVENT_KINDS.CHECKS_COMPLETED, { found: findings.length, remembered })
    })
  )

/** Lists a run's issues in document order. */
export const listIssues = (runId: RunId) =>
  Effect.gen(function* () {
    const db = yield* Db
    return yield* db.query<Issue>(
      `select ${ISSUE_SELECT} from review_issues where run_id = $1
       order by page, (box->>'y')::float8 nulls last, key`,
      [runId]
    )
  })

/** Number of issues still awaiting a decision. */
export const countOpenIssues = (runId: RunId) =>
  Effect.gen(function* () {
    const db = yield* Db
    const [row] = yield* db.query<{ count: number }>(
      "select count(*)::int as count from review_issues where run_id = $1 and status = 'open'",
      [runId]
    )
    return row?.count ?? 0
  })

const blank = (text: string | undefined) => (text ?? "").trim() === ""

/**
 * Records an analyst's decision on an issue: accept it (optionally with a note),
 * override it with a reason, draft a query to the borrower (held, not sent),
 * mark it as caused by an extraction error, or reopen it.
 * Accepted and overridden decisions can be remembered for the borrower's later packs.
 */
export const decideIssue = (runId: RunId, key: string, decision: IssueDecision) =>
  withTransaction(
    Effect.gen(function* () {
      const db = yield* Db
      yield* requireRunStatus(runId, ["awaiting_signoff"], "review issues")
      if (decision.action === "override" && blank(decision.reason)) {
        return yield* new InvalidDecision({ reason: "An override needs a reason." })
      }
      if (decision.action === "query" && blank(decision.draft)) {
        return yield* new InvalidDecision({ reason: "A query needs a draft message to the borrower." })
      }
      const remember = decision.remember === true && (decision.action === "accept" || decision.action === "override")

      const [issue] = yield* db.query<{ fingerprint: string; title: string; borrowerId: BorrowerId }>(
        `select i.fingerprint, i.title, r.borrower_id as "borrowerId"
         from review_issues i join runs r on r.id = i.run_id where i.run_id = $1 and i.key = $2`,
        [runId, key]
      )
      if (issue === undefined) return yield* new NotFound({ entity: "issue", id: key })

      const status = ISSUE_ACTION_STATUS[decision.action]
      const resolution: IssueResolution | null =
        decision.action === "reopen"
          ? null
          : {
              by: decision.actor,
              at: new Date().toISOString(),
              reason: blank(decision.reason) ? null : (decision.reason ?? "").trim(),
              draft: decision.action === "query" ? (decision.draft ?? "").trim() : null,
              remembered: false
            }
      yield* db.query("update review_issues set status = $3, resolution = $4 where run_id = $1 and key = $2", [
        runId,
        key,
        status,
        JSON.stringify(resolution)
      ])

      if (remember && (status === "accepted" || status === "overridden")) {
        yield* db.query(
          `insert into review_memories (borrower_id, fingerprint, decision, reason, decided_by) values ($1, $2, $3, $4, $5)
           on conflict (borrower_id, fingerprint) do update set decision = excluded.decision, reason = excluded.reason,
             decided_by = excluded.decided_by, decided_at = now()`,
          [issue.borrowerId, issue.fingerprint, status, resolution?.reason ?? null, decision.actor]
        )
      }

      yield* appendEvent(
        runId,
        decision.actor,
        decision.action === "reopen" ? AUDIT_EVENT_KINDS.ISSUE_REOPENED : AUDIT_EVENT_KINDS.ISSUE_DECIDED,
        {
          key,
          title: issue.title,
          action: decision.action,
          status,
          reason: resolution?.reason ?? null,
          draft: resolution?.draft ?? null,
          remember
        }
      )
    })
  )
