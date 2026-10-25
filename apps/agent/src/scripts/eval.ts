import { readdir, readFile, writeFile } from "node:fs/promises"
import { basename } from "node:path"
import {
  compareCertificates,
  fileDocumentStoreLayer,
  FIGURE_KEYS,
  FIGURE_LABELS,
  getCovenantResults,
  getFigures,
  getLatestNote,
  listCertificateClaims,
  listIssues,
  migrate,
  pgliteLayer,
  readPdfText,
  upsertBorrower,
  type EvalCaseResult,
  type EvalCheck,
  type EvalOutput,
  type EvalReport,
  type IssueKind,
  type PdfText
} from "@covenant-desk/core"
import { COVENANTS_EFFECTIVE_FROM, EVALS_DIR, FIXTURES_DIR } from "@covenant-desk/fixtures/constants"
import { EVAL_CASES } from "@covenant-desk/fixtures/evals"
import type { EvalExpectation } from "@covenant-desk/fixtures/types"
import { Effect, Layer } from "effect"
import { AGENT_MODEL } from "#constants"
import { liveResponder, recordingResponder, runMonitoring } from "#run-monitoring"
import type { AgentRecording, ModelTurn, Responder } from "#types"
import { formatUsd } from "#utils/pricing"
import { evalRecordingPath, loadRecordingAt, packRecordingPath, saveRecordingAt } from "#utils/recordings"

const live = process.argv.includes("--live")
const only = process.argv.slice(2).find((arg) => !arg.startsWith("--"))

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
] as const

/** A day and month, spelled out or abbreviated: `2 October`, `30 Jun`. */
const DAY_MONTH = /\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/g

/** Day-and-month dates in some text, as `2/10` style keys so `30 June` and `30 Jun` match. */
const datesIn = (text: string): Map<string, string> =>
  new Map(
    [...text.matchAll(DAY_MONTH)].map((match) => {
      const month = MONTHS.findIndex((name) => name.startsWith(match[2] ?? "")) + 1
      return [`${Number(match[1])}/${month}`, match[0]]
    })
  )

const check = (
  group: EvalCheck["group"],
  name: string,
  passed: boolean,
  expected: string,
  actual: string
): EvalCheck => ({ group, name, passed, expected, actual })

const ISSUE_NAMES: Readonly<Record<IssueKind, string>> = {
  certificate_mismatch: "certificate mismatch",
  subtotal: "subtotal error",
  variance: "large change",
  period: "wrong period",
  conflict: "pages disagree"
}

const dollars = (value: number) => `$${Math.round(value).toLocaleString("en-AU")}`

/** Checks what the pipeline produced against a case's expectations. */
const evaluate = (expected: EvalExpectation, pdf: PdfText, runId: Parameters<typeof getFigures>[0]) =>
  Effect.gen(function* () {
    const [figures, covenants, claims, issues, note] = yield* Effect.all([
      getFigures(runId),
      getCovenantResults(runId),
      listCertificateClaims(runId),
      listIssues(runId),
      getLatestNote(runId)
    ])
    const checks: EvalCheck[] = []

    for (const key of FIGURE_KEYS) {
      const actual = figures[key]?.value
      const accepted = expected.figureAlternatives?.[key] ?? [expected.figures[key]]
      const tolerance = expected.figureTolerance ?? 0
      const passed = actual !== undefined && accepted.some((value) => Math.abs(actual - value) <= tolerance)
      checks.push(
        check(
          "figures",
          FIGURE_LABELS[key],
          passed,
          accepted.map(dollars).join(" or ") + (tolerance ? ` (±${dollars(tolerance)})` : ""),
          actual === undefined ? "not extracted" : dollars(actual)
        )
      )
    }

    for (const [metric, status] of Object.entries(expected.covenants)) {
      const actual = covenants.find((c) => c.metric === metric)?.status
      const name = covenants.find((c) => c.metric === metric)?.name ?? metric
      checks.push(check("covenants", name, actual === status, status, actual ?? "not tested"))
    }

    const kinds = new Set(issues.map((issue) => issue.kind))
    for (const kind of expected.issuesPresent ?? []) {
      checks.push(
        check(
          "issues",
          `raises ${ISSUE_NAMES[kind]}`,
          kinds.has(kind),
          "raised",
          kinds.has(kind) ? "raised" : "missing"
        )
      )
    }
    for (const kind of expected.issuesAbsent ?? []) {
      checks.push(
        check(
          "issues",
          `no ${ISSUE_NAMES[kind]}`,
          !kinds.has(kind),
          "not raised",
          kinds.has(kind) ? "raised" : "not raised"
        )
      )
    }

    if (expected.certificateDisagrees !== undefined) {
      const disagrees = compareCertificates(covenants, claims).some((c) => c.disagreements.length > 0)
      checks.push(
        check(
          "certificate",
          "certificate comparison",
          disagrees === expected.certificateDisagrees,
          expected.certificateDisagrees ? "disagrees" : "agrees",
          disagrees ? "disagrees" : "agrees"
        )
      )
    }

    const body = note?.body ?? ""
    for (const phrase of expected.noteMentions ?? []) {
      const found = body.toLowerCase().includes(phrase.toLowerCase())
      checks.push(check("note", `mentions "${phrase}"`, found, "mentioned", found ? "mentioned" : "missing"))
    }
    for (const phrase of expected.noteAvoids ?? []) {
      const found = body.toLowerCase().includes(phrase.toLowerCase())
      checks.push(check("note", `avoids "${phrase}"`, !found, "absent", found ? "present" : "absent"))
    }

    const conclusion = (body.split(/\n\s*\n/)[0] ?? "").toLowerCase()
    for (const phrase of expected.conclusionAvoids ?? []) {
      const found = conclusion.includes(phrase.toLowerCase())
      checks.push(check("note", `conclusion avoids "${phrase}"`, !found, "absent", found ? "present" : "absent"))
    }

    // Any specific date the note gives must come from the pack, not the model.
    const packDates = datesIn(pdf.pages.join(" "))
    const unsupported = [...datesIn(body)].flatMap(([key, written]) => (packDates.has(key) ? [] : [written]))
    checks.push(
      check(
        "grounding",
        "dates in the note appear in the pack",
        unsupported.length === 0,
        "every date found in the pack",
        unsupported.length === 0 ? "all found" : `not in pack: ${unsupported.join(", ")}`
      )
    )
    const output: EvalOutput = {
      covenants: covenants.map((c) => ({
        name: c.name,
        metric: c.metric,
        actual: c.actual,
        limit: c.limit,
        operator: c.operator,
        status: c.status
      })),
      issues: issues.map((issue) => ({ title: issue.title, category: issue.category })),
      note: note?.body ?? null
    }
    return { checks, output }
  })

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
      const evaluated = yield* evaluate(expected, pdf, report.runId)
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
