import { Effect } from "effect"
import { getApproval } from "#repositories/approvals"
import { listEvents } from "#repositories/audit-events"
import { getBorrower } from "#repositories/borrowers"
import { listCertificateClaims } from "#repositories/certificate-claims"
import { getCovenantResults } from "#repositories/covenant-results"
import { getDocument } from "#repositories/documents"
import { listFigures } from "#repositories/figures"
import { getLatestNote } from "#repositories/notes"
import { getRunDocumentId, getRunSummary } from "#repositories/runs"
import { compareCertificates } from "#services/certificate"
import type { RunId } from "#types/ids"
import type { RunDetail } from "#types/runs"

/** Assembles everything an analyst needs to review and sign off a run. */
export const getRunDetail = (runId: RunId) =>
  Effect.gen(function* () {
    const run = yield* getRunSummary(runId)
    const documentId = yield* getRunDocumentId(runId)
    const [borrower, document, figures, covenants, certificateClaims, note, approval, events] = yield* Effect.all([
      getBorrower(run.borrowerId),
      getDocument(documentId),
      listFigures(runId),
      getCovenantResults(runId),
      listCertificateClaims(runId),
      getLatestNote(runId),
      getApproval(runId),
      listEvents(runId)
    ])
    return {
      run,
      borrower,
      document,
      figures,
      covenants,
      certificateClaims,
      certificateComparisons: compareCertificates(covenants, certificateClaims),
      note,
      approval,
      events
    } satisfies RunDetail
  })
