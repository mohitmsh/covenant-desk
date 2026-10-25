import { migrate, storageLayerFromEnv, upsertBorrower } from "@covenant-desk/core"
import { COVENANTS_EFFECTIVE_FROM } from "@covenant-desk/fixtures/constants"
import { Effect } from "effect"
import { AGENT_MODEL } from "#constants"
import { runMonitoring } from "#run-monitoring"
import { findPack, packFilename, readPack } from "#utils/packs"
import { formatUsd } from "@covenant-desk/core/format"

const DEFAULT_BORROWER = "wattle-grove"

const borrowerId = process.argv[2] ?? DEFAULT_BORROWER
const spec = findPack(borrowerId)
if (!spec) {
  console.error(`Unknown borrower "${borrowerId}"`)
  process.exit(1)
}

const program = Effect.gen(function* () {
  yield* migrate
  yield* upsertBorrower(spec.borrower, spec.covenants, COVENANTS_EFFECTIVE_FROM)
  const bytes = yield* Effect.promise(() => readPack(spec))
  console.log(`Running ${AGENT_MODEL} on ${spec.borrower.name}…`)
  const report = yield* runMonitoring({
    borrowerId: spec.borrower.id,
    period: spec.period,
    filename: packFilename(spec),
    bytes
  })
  console.log(
    `Run ${report.runId}: ${report.completed ? "awaiting sign-off" : "incomplete"} · ${report.turns} turns · ` +
      `${report.rejectedFigures} rejected claims · ${formatUsd(report.costUsd)}`
  )
})

Effect.runPromise(program.pipe(Effect.provide(storageLayerFromEnv()))).catch((error: Error) => {
  console.error(error)
  process.exit(1)
})
