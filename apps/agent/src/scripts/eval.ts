import { readdir, readFile, writeFile } from "node:fs/promises"
import { basename } from "node:path"
import {
  fileDocumentStoreLayer,
  migrate,
  pgliteLayer,
  readPdfText,
  upsertBorrower,
  type EvalCaseResult,
  type EvalReport
} from "@covenant-desk/core"
import { COVENANTS_EFFECTIVE_FROM, EVALS_DIR, FIXTURES_DIR } from "@covenant-desk/fixtures/constants"
import { EVAL_CASES } from "@covenant-desk/fixtures/evals"
import type { EvalExpectation } from "@covenant-desk/fixtures/types"
import { formatUsd } from "@covenant-desk/core/format"
import { Effect, Layer } from "effect"
import { AGENT_MODEL } from "#constants"
import { liveResponder, recordingResponder, runMonitoring } from "#run-monitoring"
import type { AgentRecording, ModelTurn, Responder } from "#types"
import { check, evaluateCase } from "#utils/eval-checks"
import { evalRecordingPath, loadRecordingAt, packRecordingPath, saveRecordingAt } from "#utils/recordings"

const live = process.argv.includes("--live")
const only = process.argv.slice(2).find((arg) => !arg.startsWith("--"))

const runCase = (expected: EvalExpectation) =>
  Effect.gen(function* () {
    const evalCase = EVAL_CASES.find((c) => c.id === expected.id)
    if (!evalCase) return yield* Effect.die(new Error(`No case definition for ${expected.id}`))
    const bytes = new Uint8Array(yield* Effect.promise(() => readFile(FIXTURES_DIR + expected.pack)))
    const pdf = yield* readPdfText(bytes)

    const ownPath = evalRecordingPath(expected.id)
    const recording: AgentRecording | null = live
      ? null
      : ((yield* Effect.promise(() => loadRecordingAt(ownPath))) ??
        (evalCase.existingPack ? yield* Effect.promise(() => loadRecordingAt(packRecordingPath(expected.pack))) : null))

    const base = {
      id: expected.id,
      name: expected.name,
      borrowerId: evalCase.spec.borrower.id,
      borrowerName: evalCase.spec.borrower.name,
      pack: expected.pack,
      category: expected.category,
      description: expected.description
    }
    if (!live && recording === null) {
      return {
        ...base,
        passed: false,
        checks: [check("run", "recorded", false, "a recording", "none: run with --live to record")],
        mode: "not-recorded",
        recordedAt: null,
        costUsd: 0,
        turns: 0,
        error: null,
        output: null
      } satisfies EvalCaseResult
    }

    const turns: ModelTurn[] = []
    const respond: Responder = recording
      ? recordingResponder(recording.turns)
      : (messages) => Effect.tap(liveResponder(messages), (turn) => Effect.sync(() => turns.push(turn)))

    return yield* Effect.gen(function* () {
      yield* migrate
      yield* upsertBorrower(evalCase.spec.borrower, evalCase.spec.covenants, COVENANTS_EFFECTIVE_FROM)
      const outcome = yield* Effect.result(
        runMonitoring(
          {
            borrowerId: evalCase.spec.borrower.id,
            period: expected.runPeriod,
            filename: basename(expected.pack),
            bytes
          },
          undefined,
          respond
        )
      )
      const recordedAt = recording?.recordedAt ?? new Date().toISOString()
      if (live) {
        yield* Effect.promise(() =>
          saveRecordingAt(ownPath, { model: AGENT_MODEL, recordedAt, pack: expected.pack, sha256: pdf.sha256, turns })
        )
      }
      if (outcome._tag === "Failure") {
        return {
          ...base,
          passed: false,
          checks: [check("run", "agent completed", false, "a note awaiting sign-off", outcome.failure._tag)],
          mode: live ? "live" : "replay",
          recordedAt,
          costUsd: 0,
          turns: live ? turns.length : (recording?.turns.length ?? 0),
          error: outcome.failure._tag,
          output: null
        } satisfies EvalCaseResult
      }
      const report = outcome.success
      const evaluated = yield* evaluateCase(expected, pdf, report.runId)
      const checks = [
        check("run", "agent completed", true, "a note awaiting sign-off", "completed"),
        ...evaluated.checks
      ]
      return {
        ...base,
        passed: checks.every((c) => c.passed),
        checks,
        mode: live ? "live" : "replay",
        recordedAt,
        costUsd: report.costUsd,
        turns: report.turns,
        error: null,
        output: evaluated.output
      } satisfies EvalCaseResult
    }).pipe(Effect.provide(Layer.mergeAll(Layer.fresh(pgliteLayer()), fileDocumentStoreLayer())))
  })

const program = Effect.gen(function* () {
  const files = (yield* Effect.promise(() => readdir(`${EVALS_DIR}expected`))).filter((f) => f.endsWith(".json")).sort()
  const expectations: EvalExpectation[] = []
  for (const file of files) {
    const text = yield* Effect.promise(() => readFile(`${EVALS_DIR}expected/${file}`, "utf8"))
    const expectation: EvalExpectation = JSON.parse(text)
    expectations.push(expectation)
  }
  const ordered = EVAL_CASES.flatMap((c) => expectations.filter((e) => e.id === c.id)).filter(
    (e) => only === undefined || e.id === only
  )

  console.log(`${live ? "Live" : "Replaying recorded"} ${AGENT_MODEL} on ${ordered.length} cases\n`)
  const cases: EvalCaseResult[] = []
  for (const expected of ordered) {
    const result = yield* runCase(expected)
    cases.push(result)
    const failed = result.checks.filter((c) => !c.passed)
    console.log(
      `${result.passed ? "PASS" : "FAIL"}  ${result.name} · ${result.checks.length - failed.length}/${result.checks.length} checks · ${result.turns} turns · ${formatUsd(result.costUsd)}`
    )
    for (const c of failed) console.log(`        ✗ ${c.group}: ${c.name}: expected ${c.expected}, got ${c.actual}`)
  }

  const report: EvalReport = {
    ranAt: new Date().toISOString(),
    model: AGENT_MODEL,
    cases,
    totals: {
      cases: cases.length,
      casesPassed: cases.filter((c) => c.passed).length,
      checks: cases.reduce((n, c) => n + c.checks.length, 0),
      checksPassed: cases.reduce((n, c) => n + c.checks.filter((k) => k.passed).length, 0),
      costUsd: cases.reduce((n, c) => n + c.costUsd, 0)
    }
  }
  if (only === undefined) {
    yield* Effect.promise(() => writeFile(`${EVALS_DIR}results.json`, `${JSON.stringify(report, null, 2)}\n`))
  }
  console.log(
    `\n${report.totals.casesPassed}/${report.totals.cases} cases · ${report.totals.checksPassed}/${report.totals.checks} checks · model cost ${formatUsd(report.totals.costUsd)}`
  )
})

Effect.runPromise(program).catch((error: Error) => {
  console.error(error)
  process.exit(1)
})
