import { Effect } from "effect"
import { listBorrowers } from "#repositories/borrowers"
import { listCertificateClaims } from "#repositories/certificate-claims"
import { getCovenantResults } from "#repositories/covenant-results"
import { listRuns } from "#repositories/runs"
import { compareCertificates } from "#services/certificate"
import type { Portfolio, PortfolioRow, PortfolioTotals, RunSummary } from "#types/runs"

const count = <T>(items: ReadonlyArray<T>, predicate: (item: T) => boolean) => items.filter(predicate).length

const totalsFor = (rows: ReadonlyArray<PortfolioRow>): PortfolioTotals => ({
  facilities: rows.length,
  facilityLimit: rows.reduce((sum, row) => sum + row.borrower.facilityLimit, 0),
  breaches: rows.reduce((sum, row) => sum + count(row.covenants, (c) => c.status === "breach"), 0),
  watches: rows.reduce((sum, row) => sum + count(row.covenants, (c) => c.status === "watch"), 0),
  certificateMismatches: rows.reduce(
    (sum, row) => sum + count(row.certificateComparisons, (c) => c.disagreements.length > 0),
    0
  ),
  awaitingSignoff: count(rows, (row) => row.run?.status === "awaiting_signoff")
})

/** Latest run per borrower, skipping failed runs. `runs` must be ordered newest first. */
const latestRunByBorrower = (runs: ReadonlyArray<RunSummary>): ReadonlyMap<string, RunSummary> => {
  const latest = new Map<string, RunSummary>()
  for (const run of runs) {
    if (run.status !== "failed" && !latest.has(run.borrowerId)) latest.set(run.borrowerId, run)
  }
  return latest
}

/** Each borrower with its latest run, covenant results and certificate comparison. */
export const getPortfolio = Effect.gen(function* () {
  const [borrowers, runs] = yield* Effect.all([listBorrowers, listRuns])
  const latest = latestRunByBorrower(runs)

  const rows = yield* Effect.forEach(borrowers, (borrower) =>
    Effect.gen(function* () {
      const run = latest.get(borrower.id) ?? null
      if (run === null) return { borrower, run, covenants: [], certificateComparisons: [] } satisfies PortfolioRow
      const [covenants, claims] = yield* Effect.all([getCovenantResults(run.id), listCertificateClaims(run.id)])
      return {
        borrower,
        run,
        covenants,
        certificateComparisons: compareCertificates(covenants, claims)
      } satisfies PortfolioRow
    })
  )

  return { rows, totals: totalsFor(rows) } satisfies Portfolio
})
