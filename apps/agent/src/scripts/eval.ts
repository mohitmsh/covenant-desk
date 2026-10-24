import {
  getCovenantResults,
  getFigures,
  getLatestNote,
  listCertificateClaims,
  migrate,
  pgliteLayer,
  fileDocumentStoreLayer,
  upsertBorrower
} from "@covenant-desk/core"
import { COVENANTS_EFFECTIVE_FROM } from "@covenant-desk/fixtures/constants"
import type { PackSpec } from "@covenant-desk/fixtures/types"
import { Effect, Layer } from "effect"
import { AGENT_MODEL, EVAL_BUDGET_USD, RUN_BUDGET_USD } from "#constants"
import { runMonitoring } from "#run-monitoring"
import { packFilename, PACKS, readPack } from "#utils/packs"
import { formatUsd } from "#utils/pricing"
import { scorePack } from "#utils/scoring"

const evaluatePack = (spec: PackSpec, budgetUsd: number) =>
  Effect.gen(function* () {
    yield* migrate
    yield* upsertBorrower(spec.borrower, spec.covenants, COVENANTS_EFFECTIVE_FROM)
    const bytes = yield* Effect.promise(() => readPack(spec))
    const report = yield* runMonitoring(
      { borrowerId: spec.borrower.id, period: spec.period, filename: packFilename(spec), bytes },
      budgetUsd
    )
    const note = yield* getLatestNote(report.runId)
    const score = scorePack(
      spec,
      yield* getFigures(report.runId),
      yield* getCovenantResults(report.runId),
      yield* listCertificateClaims(report.runId)
    )
    return { report, score, note }
  }).pipe(Effect.provide(Layer.mergeAll(Layer.fresh(pgliteLayer()), fileDocumentStoreLayer())))

const program = Effect.gen(function* () {
  console.log(`Evaluating ${AGENT_MODEL} on ${PACKS.length} packs (budget ${formatUsd(EVAL_BUDGET_USD)})\n`)
  let spentUsd = 0
  let figuresCorrect = 0
  let figuresTotal = 0
  let covenantsCorrect = 0
  let covenantsTotal = 0
  let certificateCorrect = 0
  let certificateTotal = 0
  let mismatchesExpected = 0
  let mismatchesFound = 0

  for (const spec of PACKS) {
    const remaining = EVAL_BUDGET_USD - spentUsd
    if (remaining <= 0) {
      console.log("Eval budget exhausted; stopping.")
      break
    }
    const outcome = yield* Effect.result(evaluatePack(spec, Math.min(RUN_BUDGET_USD, remaining)))
    if (outcome._tag === "Failure") {
      console.log(`${spec.borrower.name}: FAILED (${outcome.failure._tag})\n`)
      continue
    }

    const { report, score, note } = outcome.success
    spentUsd += report.costUsd
    figuresCorrect += score.figuresCorrect
    figuresTotal += score.figures.length
    covenantsCorrect += score.covenantsCorrect
    covenantsTotal += score.covenantsTotal
    certificateCorrect += score.certificateCorrect
    certificateTotal += score.certificateTotal
    mismatchesExpected += score.mismatchesExpected
    mismatchesFound += score.mismatchesFound

    console.log(`${spec.borrower.name}`)
    console.log(
      `  figures ${score.figuresCorrect}/${score.figures.length} · covenants ${score.covenantsCorrect}/${score.covenantsTotal} · ` +
        `rejected claims ${report.rejectedFigures} · turns ${report.turns} · ${formatUsd(report.costUsd)}`
    )
    for (const figure of score.figures.filter((f) => !f.correctValue || !f.correctPage)) {
      console.log(`  ✗ ${figure.key}: expected ${figure.expected}, got ${figure.actual ?? "nothing"}`)
    }
    console.log(
      `  certificate ${score.certificateCorrect}/${score.certificateTotal} · misreported covenants caught ${score.mismatchesFound}/${score.mismatchesExpected}`
    )
    console.log(`  note: ${note?.body.split("\n")[0] ?? "(none)"}\n`)
  }

  console.log(
    `Total: figures ${figuresCorrect}/${figuresTotal} · covenants ${covenantsCorrect}/${covenantsTotal} · ` +
      `certificate ${certificateCorrect}/${certificateTotal} · misreports caught ${mismatchesFound}/${mismatchesExpected} · ` +
      `cost ${formatUsd(spentUsd)}`
  )
})

Effect.runPromise(program)
