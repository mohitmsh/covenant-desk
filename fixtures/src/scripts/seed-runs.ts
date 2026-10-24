import { readFile } from "node:fs/promises"
import {
  DocumentStore,
  FIGURE_KEYS,
  getFigures,
  getMonitoringContext,
  listRuns,
  migrate,
  readPdfText,
  recordCertificateClaim,
  recordCovenantResults,
  recordFigure,
  registerDocument,
  saveNote,
  startRun,
  storageLayerFromEnv,
  testAll,
  upsertBorrower,
  verifyCertificateClaim,
  verifyFigure
} from "@covenant-desk/core"
import { Effect } from "effect"
import {
  CERTIFICATE_LABELS,
  COVENANTS_EFFECTIVE_FROM,
  FIGURE_SOURCE_LABELS,
  PACK_PAGES,
  PACKS_DIR,
  SEED_ACTOR,
  THOUSAND
} from "#constants"
import { PACKS } from "#data/borrowers"
import { DEMO_NOTES } from "#data/demo-notes"
import type { PackSpec } from "#types"
import { answerKeyFigures } from "#utils/answer-key"
import { certificateLines } from "#utils/financials"
import { formatThousands } from "#utils/format"
import { quoteFromPage } from "#utils/quotes"

/** Creates a run awaiting sign-off from a pack's answer key, verifying every figure against the PDF. */
const seedRun = (spec: PackSpec) =>
  Effect.gen(function* () {
    const store = yield* DocumentStore
    const filename = `${spec.borrower.id}-${spec.period}.pdf`
    const bytes = new Uint8Array(yield* Effect.promise(() => readFile(PACKS_DIR + filename)))
    const pdf = yield* readPdfText(bytes)

    const documentId = yield* registerDocument({
      borrowerId: spec.borrower.id,
      period: spec.period,
      filename,
      sha256: pdf.sha256,
      storageKey: yield* store.put(bytes),
      pageCount: pdf.pages.length
    })
    const runId = yield* startRun({
      borrowerId: spec.borrower.id,
      period: spec.period,
      documentId,
      startedBy: SEED_ACTOR
    })

    const answers = answerKeyFigures(spec)
    for (const key of FIGURE_KEYS) {
      const { value, pages } = answers[key]
      const page = pages[0] ?? 1
      const reported = value / THOUSAND
      const quote = quoteFromPage(pdf.pages[page - 1] ?? "", FIGURE_SOURCE_LABELS[key], formatThousands(reported))
      if (quote === null) {
        return yield* Effect.die(new Error(`${filename}: no source quote for ${key} on page ${page}`))
      }
      const figure = yield* verifyFigure({ key, reported, scale: THOUSAND, page, quote }, pdf)
      yield* recordFigure(runId, figure, SEED_ACTOR)
    }

    const certificatePage = PACK_PAGES.complianceCertificate
    for (const line of certificateLines(spec)) {
      const quote = quoteFromPage(pdf.pages[certificatePage - 1] ?? "", CERTIFICATE_LABELS[line.metric], line.printed)
      if (quote === null) {
        return yield* Effect.die(new Error(`${filename}: no certificate quote for ${line.metric}`))
      }
      const claim = yield* verifyCertificateClaim(
        {
          metric: line.metric,
          reported: line.reported,
          scale: line.scale,
          claimsCompliance: line.claimsCompliance,
          page: certificatePage,
          quote
        },
        pdf
      )
      yield* recordCertificateClaim(runId, claim, SEED_ACTOR)
    }

    const { covenants } = yield* getMonitoringContext(spec.borrower.id)
    const results = yield* testAll(covenants, yield* getFigures(runId))
    yield* recordCovenantResults(runId, results, SEED_ACTOR)
    yield* saveNote(runId, DEMO_NOTES[spec.borrower.id] ?? "", SEED_ACTOR)

    console.log(`Seeded run for ${spec.borrower.name}: ${results.map((r) => `${r.name} ${r.status}`).join(", ")}`)
  })

const program = Effect.gen(function* () {
  yield* migrate
  const existing = new Set((yield* listRuns).map((run) => `${run.borrowerId}/${run.period}`))
  for (const spec of PACKS) {
    yield* upsertBorrower(spec.borrower, spec.covenants, COVENANTS_EFFECTIVE_FROM)
    if (existing.has(`${spec.borrower.id}/${spec.period}`)) {
      console.log(`Skipped ${spec.borrower.name}: run already exists`)
      continue
    }
    yield* seedRun(spec)
  }
})

Effect.runPromise(program.pipe(Effect.provide(storageLayerFromEnv())))
