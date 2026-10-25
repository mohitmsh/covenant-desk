import {
  fileDocumentStoreLayer,
  getCovenantResults,
  getFigures,
  listCertificateClaims,
  migrate,
  pgliteLayer,
  readPdfText,
  upsertBorrower
} from "@covenant-desk/core"
import { COVENANTS_EFFECTIVE_FROM } from "@covenant-desk/fixtures/constants"
import type { PackSpec } from "@covenant-desk/fixtures/types"
import { Effect, Layer } from "effect"
import { AGENT_MODEL } from "#constants"
import { liveResponder, runMonitoring } from "#run-monitoring"
import type { ModelTurn, Responder } from "#types"
import { packFilename, PACKS, readPack } from "#utils/packs"
import { formatUsd } from "#utils/pricing"
import { saveRecording } from "#utils/recordings"
import { scorePack } from "#utils/scoring"

/** Runs the real agent on a pack in a scratch database and saves its model responses for replay. */
const recordPack = (spec: PackSpec) =>
  Effect.gen(function* () {
    yield* migrate
    yield* upsertBorrower(spec.borrower, spec.covenants, COVENANTS_EFFECTIVE_FROM)
    const bytes = yield* Effect.promise(() => readPack(spec))
    const turns: ModelTurn[] = []
    const capturingResponder: Responder = (messages) =>
      Effect.tap(liveResponder(messages), (turn) => Effect.sync(() => turns.push(turn)))

    const report = yield* runMonitoring(
      { borrowerId: spec.borrower.id, period: spec.period, filename: packFilename(spec), bytes },
      undefined,
      capturingResponder
    )
    const score = scorePack(
      spec,
      yield* getFigures(report.runId),
      yield* getCovenantResults(report.runId),
      yield* listCertificateClaims(report.runId)
    )
    yield* Effect.promise(async () =>
      saveRecording(spec, {
        model: AGENT_MODEL,
        recordedAt: new Date().toISOString(),
        pack: packFilename(spec),
        sha256: (await Effect.runPromise(readPdfText(bytes))).sha256,
        turns
      })
    )
    console.log(
      `${spec.borrower.name}: ${report.turns} turns · ${formatUsd(report.costUsd)} · figures ` +
        `${score.figuresCorrect}/${score.figures.length} · covenants ${score.covenantsCorrect}/${score.covenantsTotal}`
    )
  }).pipe(Effect.provide(Layer.mergeAll(Layer.fresh(pgliteLayer()), fileDocumentStoreLayer())))

const only = process.argv[2]
const program = Effect.forEach(
  PACKS.filter((spec) => only === undefined || spec.borrower.id === only),
  recordPack,
  { discard: true }
)

Effect.runPromise(program).catch((error: Error) => {
  console.error(error)
  process.exit(1)
})
