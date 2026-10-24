import { mkdir, readFile, writeFile } from "node:fs/promises"
import { readPdfText, testAll } from "@covenant-desk/core"
import { Effect } from "effect"
import { PACK_PAGE_COUNT, PACKS_DIR } from "#constants"
import { PACKS } from "#data/borrowers"
import { renderPack } from "#pdf/render-pack"
import type { AnswerKey, PackSpec } from "#types"
import { answerKeyFigures, toFigureSet } from "#utils/answer-key"

const buildPack = (spec: PackSpec) =>
  Effect.gen(function* () {
    const file = `${spec.borrower.id}-${spec.period}.pdf`
    yield* Effect.promise(() => renderPack(spec, PACKS_DIR + file))

    const figures = answerKeyFigures(spec)
    const results = yield* testAll(spec.covenants, toFigureSet(figures))
    for (const result of results) {
      const expected = spec.expectedStatus[result.covenantId]
      if (result.status !== expected) {
        return yield* Effect.die(new Error(`${result.covenantId}: computed ${result.status}, expected ${expected}`))
      }
    }

    const pdf = yield* readPdfText(new Uint8Array(yield* Effect.promise(() => readFile(PACKS_DIR + file))))
    if (pdf.pages.length !== PACK_PAGE_COUNT) {
      return yield* Effect.die(new Error(`${file}: expected ${PACK_PAGE_COUNT} pages, found ${pdf.pages.length}`))
    }

    const answerKey: AnswerKey = {
      borrowerId: spec.borrower.id,
      period: spec.period,
      file,
      sha256: pdf.sha256,
      figures,
      covenants: Object.fromEntries(results.map((r) => [r.covenantId, { status: r.status, actual: r.actual }]))
    }
    yield* Effect.promise(() =>
      writeFile(PACKS_DIR + file.replace(".pdf", ".answers.json"), `${JSON.stringify(answerKey, null, 2)}\n`)
    )

    console.log(`${file}  ${results.map((r) => `${r.name}: ${r.status}`).join(" · ")}`)
  })

const program = Effect.gen(function* () {
  yield* Effect.promise(() => mkdir(PACKS_DIR, { recursive: true }))
  yield* Effect.forEach(PACKS, buildPack, { discard: true })
})

Effect.runPromise(program)
