import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { testAll } from "@covenant-desk/core"
import { Effect } from "effect"
import { DEMO_UPLOADS } from "#data/demo-uploads"
import { renderPack } from "#pdf/render-pack"
import { answerKeyFigures, toFigureSet } from "#utils/answer-key"
import { certificateLines } from "#utils/financials"

const UPLOADS_DIR = fileURLToPath(new URL("../../uploads/", import.meta.url))

const program = Effect.gen(function* () {
  yield* Effect.promise(() => mkdir(UPLOADS_DIR, { recursive: true }))
  for (const { file, spec } of DEMO_UPLOADS) {
    const results = yield* testAll(spec.covenants, toFigureSet(answerKeyFigures(spec)))
    for (const result of results) {
      const expected = spec.expectedStatus[result.covenantId]
      if (result.status !== expected) {
        return yield* Effect.die(new Error(`${result.covenantId}: computed ${result.status}, expected ${expected}`))
      }
    }
    yield* Effect.promise(() => renderPack(spec, UPLOADS_DIR + file))
    const certificate = certificateLines(spec)
      .map((line) => `${line.metric} ${line.printed}${line.claimsCompliance ? " complies" : " fails"}`)
      .join(" · ")
    console.log(`${file}\n  tested: ${results.map((r) => `${r.name} ${r.actual.toFixed(2)} ${r.status}`).join(" · ")}`)
    console.log(`  certificate: ${certificate}`)
  }
})

Effect.runPromise(program)
