import { Effect } from "effect"
import { AUDIT_EVENT_KINDS } from "#constants/runs"
import { Db } from "#db/client"
import { withTransaction } from "#db/transaction"
import { appendEvent } from "#repositories/audit-events"
import { requireRunStatus } from "#repositories/runs"
import type { CertificateClaim, VerifiedCertificateClaim } from "#types/certificate"
import type { RunId } from "#types/ids"

/** Stores a verified certificate claim, replacing any earlier claim for the same covenant. */
export const recordCertificateClaim = (runId: RunId, claim: VerifiedCertificateClaim, actor: string) =>
  withTransaction(
    Effect.gen(function* () {
      const db = yield* Db
      yield* requireRunStatus(runId, ["extracting", "tested"], "record certificate claims")
      yield* db.query(
        `insert into certificate_claims (run_id, metric, reported, scale, value, claims_compliance, page, quote, box)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         on conflict (run_id, metric) do update set reported = excluded.reported, scale = excluded.scale,
           value = excluded.value, claims_compliance = excluded.claims_compliance, page = excluded.page,
           quote = excluded.quote, box = excluded.box, recorded_at = now()`,
        [
          runId,
          claim.metric,
          claim.reported,
          claim.scale,
          claim.value,
          claim.claimsCompliance,
          claim.page,
          claim.quote,
          JSON.stringify(claim.box)
        ]
      )
      yield* appendEvent(runId, actor, AUDIT_EVENT_KINDS.CERTIFICATE_VERIFIED, claim)
    })
  )

/** Logs a certificate claim that failed verification. */
export const recordRejectedCertificateClaim = (
  runId: RunId,
  claim: CertificateClaim,
  error: { readonly _tag: string },
  actor: string
) => appendEvent(runId, actor, AUDIT_EVENT_KINDS.CERTIFICATE_REJECTED, { claim, error })

export const listCertificateClaims = (runId: RunId) =>
  Effect.gen(function* () {
    const db = yield* Db
    return yield* db.query<VerifiedCertificateClaim>(
      `select metric, reported::float8 as reported, scale::float8 as scale, value::float8 as value,
         claims_compliance as "claimsCompliance", page, quote, box
       from certificate_claims where run_id = $1 order by metric`,
      [runId]
    )
  })
