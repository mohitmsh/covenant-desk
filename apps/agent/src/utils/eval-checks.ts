import {
  compareCertificates,
  datesIn,
  FIGURE_KEYS,
  FIGURE_LABELS,
  getCovenantResults,
  getFigures,
  getLatestNote,
  listCertificateClaims,
  listIssues,
  type EvalCheck,
  type EvalOutput,
  type IssueKind,
  type PdfText,
  type RunId
} from "@covenant-desk/core"
import type { EvalExpectation } from "@covenant-desk/fixtures/types"
import { Effect } from "effect"

/** One named check of an eval case, with what was expected and what came out. */
export const check = (
  group: EvalCheck["group"],
  name: string,
  passed: boolean,
  expected: string,
  actual: string
): EvalCheck => ({ group, name, passed, expected, actual })

/** Issue kinds as an eval check names them. */
const ISSUE_NAMES: Readonly<Record<IssueKind, string>> = {
  certificate_mismatch: "certificate mismatch",
  subtotal: "subtotal error",
  variance: "large change",
  period: "wrong period",
  conflict: "pages disagree"
}

const dollars = (value: number) => `$${Math.round(value).toLocaleString("en-AU")}`

/** Checks what the pipeline produced against a case's expectations. */
export const evaluateCase = (expected: EvalExpectation, pdf: PdfText, runId: RunId) =>
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
