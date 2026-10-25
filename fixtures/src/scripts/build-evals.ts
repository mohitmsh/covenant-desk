import { mkdir, writeFile } from "node:fs/promises"
import { METRICS, testAll } from "@covenant-desk/core"
import { Effect } from "effect"
import { EVALS_DIR } from "#constants"
import { EVAL_CASES } from "#data/eval-cases"
import { renderPack } from "#pdf/render-pack"
import type { EvalCase, EvalExpectation } from "#types"
import { answerKeyFigures, toFigureSet } from "#utils/answer-key"

/** Renders a case's pack, unless it reuses an existing one, and writes what it must produce. */
const buildCase = (evalCase: EvalCase) =>
  Effect.gen(function* () {
    const pack = evalCase.existingPack ?? `evals/packs/${evalCase.id}.pdf`
    if (!evalCase.existingPack)
      yield* Effect.promise(() => renderPack(evalCase.spec, `${EVALS_DIR}packs/${evalCase.id}.pdf`))

    const answers = answerKeyFigures(evalCase.spec)
    const results = yield* testAll(evalCase.spec.covenants, toFigureSet(answers))
    const expectation: EvalExpectation = {
      ...evalCase.expect,
      id: evalCase.id,
      name: evalCase.name,
      category: evalCase.category,
      description: evalCase.description,
      borrowerId: evalCase.spec.borrower.id,
      pack,
      runPeriod: evalCase.runPeriod ?? evalCase.spec.period,
      figures: {
        revenue_ttm: answers.revenue_ttm.value,
        ebitda_ttm: answers.ebitda_ttm.value,
        interest_expense_ttm: answers.interest_expense_ttm.value,
        total_debt: answers.total_debt.value,
        cash: answers.cash.value,
        undrawn_facility: answers.undrawn_facility.value
      },
      covenants: Object.fromEntries(
        METRICS.flatMap((metric) => {
          const result = results.find((r) => r.metric === metric)
          return result ? [[metric, result.status]] : []
        })
      )
    }
    yield* Effect.promise(() =>
      writeFile(`${EVALS_DIR}expected/${evalCase.id}.json`, `${JSON.stringify(expectation, null, 2)}\n`)
    )
    console.log(`${evalCase.id}: ${pack}`)
  })

const program = Effect.gen(function* () {
  yield* Effect.promise(() => mkdir(`${EVALS_DIR}packs`, { recursive: true }))
  yield* Effect.promise(() => mkdir(`${EVALS_DIR}expected`, { recursive: true }))
  yield* Effect.forEach(EVAL_CASES, buildCase, { discard: true })
})

Effect.runPromise(program)
