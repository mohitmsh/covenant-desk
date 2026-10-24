import {
  compareCertificates,
  FIGURE_KEYS,
  getFigures,
  listCertificateClaims,
  METRIC_DEFINITIONS,
  recordCertificateClaim,
  recordRejectedCertificateClaim,
  recordCovenantResults,
  recordFigure,
  recordRejectedFigure,
  saveNote,
  testAll,
  verifyCertificateClaim,
  verifyFigure
} from "@covenant-desk/core"
import { Effect, Result, Schema } from "effect"
import { AGENT_ACTOR, MAX_NOTE_WORDS, TOOL_NAMES } from "#constants"
import { FIGURE_DEFINITIONS } from "#prompts"
import { SubmitCertificateInputSchema, SubmitFiguresInputSchema, SubmitNoteInputSchema } from "#schemas"
import { describeRejection } from "#tools/feedback"
import type { RunContext, ToolInput, ToolOutcome } from "#types"

const RATIO_DECIMALS = 4

const ok = (body: object, rejected = 0): ToolOutcome => ({ content: JSON.stringify(body), isError: false, rejected })
const fail = (message: string): ToolOutcome => ({ content: message, isError: true, rejected: 0 })

const decodeSubmitFigures = Schema.decodeUnknownEffect(SubmitFiguresInputSchema)
const decodeSubmitNote = Schema.decodeUnknownEffect(SubmitNoteInputSchema)
const decodeSubmitCertificate = Schema.decodeUnknownEffect(SubmitCertificateInputSchema)

const getContext = (ctx: RunContext) =>
  Effect.succeed(
    ok({
      borrower: ctx.borrower.name,
      facility: ctx.borrower.facilityName,
      period: ctx.period,
      pageCount: ctx.pdf.pages.length,
      covenants: ctx.covenants.map((c) => ({ name: c.name, metric: c.metric, operator: c.operator, limit: c.limit })),
      requiredFigures: FIGURE_KEYS.map((key) => ({ key, definition: FIGURE_DEFINITIONS[key] }))
    })
  )

const submitFigures = (ctx: RunContext, input: ToolInput) =>
  Effect.gen(function* () {
    const { figures } = yield* decodeSubmitFigures(input)
    const accepted: string[] = []
    const rejected: Array<{ key: string; reason: string }> = []

    for (const claim of figures) {
      const verified = yield* Effect.result(verifyFigure(claim, ctx.pdf))
      if (Result.isSuccess(verified)) {
        yield* recordFigure(ctx.runId, verified.success, AGENT_ACTOR)
        accepted.push(claim.key)
      } else {
        yield* recordRejectedFigure(ctx.runId, claim, verified.failure, AGENT_ACTOR)
        rejected.push({ key: claim.key, reason: describeRejection(verified.failure) })
      }
    }

    const recorded = yield* getFigures(ctx.runId)
    const outstanding = FIGURE_KEYS.filter((key) => recorded[key] === undefined)
    return ok({ accepted, rejected, outstanding }, rejected.length)
  })

const submitCertificate = (ctx: RunContext, input: ToolInput) =>
  Effect.gen(function* () {
    const { claims } = yield* decodeSubmitCertificate(input)
    const accepted: string[] = []
    const rejected: Array<{ metric: string; reason: string }> = []

    for (const claim of claims) {
      const verified = yield* Effect.result(verifyCertificateClaim(claim, ctx.pdf))
      if (Result.isSuccess(verified)) {
        yield* recordCertificateClaim(ctx.runId, verified.success, AGENT_ACTOR)
        accepted.push(claim.metric)
      } else {
        yield* recordRejectedCertificateClaim(ctx.runId, claim, verified.failure, AGENT_ACTOR)
        rejected.push({ metric: claim.metric, reason: describeRejection(verified.failure) })
      }
    }
    return ok({ accepted, rejected }, rejected.length)
  })

const testCovenants = (ctx: RunContext) =>
  Effect.gen(function* () {
    const results = yield* testAll(ctx.covenants, yield* getFigures(ctx.runId))
    yield* recordCovenantResults(ctx.runId, results, AGENT_ACTOR)
    const comparisons = compareCertificates(results, yield* listCertificateClaims(ctx.runId))
    return ok({
      certificateComparison: comparisons.map((c) => ({
        covenant: c.metric,
        certificateValue: c.certificateValue,
        certificateClaimsCompliance: c.claimsCompliance,
        testedValue: Number(c.testedValue.toFixed(RATIO_DECIMALS)),
        testedStatus: c.testedStatus,
        agrees: c.disagreements.length === 0,
        disagreements: c.disagreements,
        unit: METRIC_DEFINITIONS[c.metric].unit
      })),
      results: results.map((r) => ({
        covenant: r.name,
        formula: r.formula,
        tested: Number(r.actual.toFixed(RATIO_DECIMALS)),
        operator: r.operator,
        limit: r.limit,
        headroomPercent: Number((r.headroom * 100).toFixed(1)),
        status: r.status
      }))
    })
  }).pipe(
    Effect.catchTags({
      MissingFigures: (error) => Effect.succeed(fail(`Submit these figures first: ${error.missing.join(", ")}.`)),
      NotMeaningful: (error) => Effect.succeed(fail(error.reason))
    })
  )

const submitNote = (ctx: RunContext, input: ToolInput) =>
  Effect.gen(function* () {
    const { body } = yield* decodeSubmitNote(input)
    const words = body.trim().split(/\s+/).length
    if (words > MAX_NOTE_WORDS) {
      return fail(`The note is ${words} words. Rewrite it in at most ${MAX_NOTE_WORDS} words and submit again.`)
    }
    const version = yield* saveNote(ctx.runId, body.trim(), AGENT_ACTOR)
    return ok({ saved: true, version, next: "The run is awaiting analyst sign-off. Stop here." })
  })

/** Runs one tool call. Invalid input and run-state errors are returned to the model rather than thrown. */
export const handleToolCall = (ctx: RunContext, name: string, input: ToolInput) => {
  const outcome = (() => {
    switch (name) {
      case TOOL_NAMES.GET_CONTEXT:
        return getContext(ctx)
      case TOOL_NAMES.SUBMIT_FIGURES:
        return submitFigures(ctx, input)
      case TOOL_NAMES.SUBMIT_CERTIFICATE:
        return submitCertificate(ctx, input)
      case TOOL_NAMES.TEST_COVENANTS:
        return testCovenants(ctx)
      case TOOL_NAMES.SUBMIT_NOTE:
        return submitNote(ctx, input)
      default:
        return Effect.succeed(fail(`Unknown tool: ${name}`))
    }
  })()

  return outcome.pipe(
    Effect.catchTags({
      SchemaError: (error) => Effect.succeed(fail(`Invalid input: ${error.message}`)),
      RunNotReady: (error) => Effect.succeed(fail(error.reason))
    })
  )
}
