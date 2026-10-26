import {
  appendEvent,
  AUDIT_EVENT_KINDS,
  getDemoVersion,
  listRuns,
  lockDemoSeed,
  migrate,
  setDemoVersion,
  sha256,
  storageLayerFromEnv,
  truncateAll,
  withTransaction,
  upsertBorrower
} from "@covenant-desk/core"
import { readdir, readFile } from "node:fs/promises"
import { COVENANTS_EFFECTIVE_FROM, PACKS_DIR, RECORDINGS_DIR } from "@covenant-desk/fixtures/constants"
import type { PackSpec } from "@covenant-desk/fixtures/types"
import { Effect } from "effect"
import { AGENT_ACTOR, DEMO_DATA_REVISION } from "#constants"
import { driveAgent, prepareRun, recordingResponder } from "#run-monitoring"
import { packFilename, PACKS, readPack } from "#utils/packs"
import { formatUsd } from "@covenant-desk/core/format"
import { loadRecording } from "#utils/recordings"

/**
 * Replays a recorded agent run: the model's saved responses drive the same
 * agent loop, so verification, covenant tests, review checks and the note all
 * run through the current code without calling the API.
 */
const replayPack = (spec: PackSpec) =>
  Effect.gen(function* () {
    const recording = yield* Effect.promise(() => loadRecording(spec))
    if (recording === null) {
      console.log(`Skipped ${spec.borrower.name}: no recording. Run \`npm run record -w @covenant-desk/agent\`.`)
      return
    }
    const bytes = yield* Effect.promise(() => readPack(spec))
    const prepared = yield* prepareRun({
      borrowerId: spec.borrower.id,
      period: spec.period,
      filename: packFilename(spec),
      bytes
    })
    if (prepared.ctx.pdf.sha256 !== recording.sha256) {
      console.log(`Warning: ${spec.borrower.name}'s pack changed since it was recorded; re-record it.`)
    }
    yield* appendEvent(prepared.ctx.runId, AGENT_ACTOR, AUDIT_EVENT_KINDS.AGENT_REPLAYED, {
      model: recording.model,
      recordedAt: recording.recordedAt,
      turns: recording.turns.length
    })
    const report = yield* driveAgent(prepared, undefined, recordingResponder(recording.turns))
    console.log(`Replayed agent run for ${spec.borrower.name}: ${report.turns} turns · ${formatUsd(report.costUsd)}`)
  })

/** Fingerprint of the recordings and packs the demo is seeded from, and its revision. */
const demoDataVersion = Effect.promise(async () => {
  const files = [
    ...(await readdir(RECORDINGS_DIR)).filter((f) => f.endsWith(".json")).map((f) => RECORDINGS_DIR + f),
    ...PACKS.map((spec) => PACKS_DIR + packFilename(spec))
  ].sort()
  const contents = await Promise.all(files.map((file) => readFile(file)))
  return `${DEMO_DATA_REVISION}:${sha256(new Uint8Array(Buffer.concat(contents)))}`
})

/**
 * Seeds the demo inside one transaction under a lock, so instances starting
 * together cannot interleave. With RESET_DEMO_ON_START, the data is reset only
 * when the recordings or packs differ from those it was last seeded from.
 */
const program = Effect.gen(function* () {
  const version = yield* demoDataVersion
  yield* withTransaction(
    Effect.gen(function* () {
      // Taken before migrating, so a second instance waits instead of racing to create the same tables.
      yield* lockDemoSeed
      yield* migrate
      if (process.env.RESET_DEMO_ON_START === "true" && (yield* getDemoVersion) !== version) {
        yield* truncateAll
        console.log("Reset demo data for a new demo version")
      }
      const existing = new Set((yield* listRuns).map((run) => `${run.borrowerId}/${run.period}`))
      for (const spec of PACKS) {
        yield* upsertBorrower(spec.borrower, spec.covenants, COVENANTS_EFFECTIVE_FROM)
        if (existing.has(`${spec.borrower.id}/${spec.period}`)) {
          console.log(`Skipped ${spec.borrower.name}: run already exists`)
          continue
        }
        yield* replayPack(spec)
      }
      yield* setDemoVersion(version)
    })
  )
})

Effect.runPromise(program.pipe(Effect.provide(storageLayerFromEnv()))).catch((error: Error) => {
  console.error(error)
  process.exit(1)
})
