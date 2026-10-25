import Anthropic from "@anthropic-ai/sdk"
import {
  appendEvent,
  AUDIT_EVENT_KINDS,
  DocumentStore,
  getMonitoringContext,
  markRunFailed,
  readPdfText,
  registerDocument,
  startRun,
  toError,
  type BorrowerId
} from "@covenant-desk/core"
import { Effect } from "effect"
import { AGENT_ACTOR, AGENT_MAX_TOKENS, AGENT_MAX_TURNS, AGENT_MODEL, RUN_BUDGET_USD, TOOL_NAMES } from "#constants"
import { AgentStopped, BudgetExceeded, ModelRequestFailed } from "#errors"
import { SYSTEM_PROMPT } from "#prompts"
import { TOOLS } from "#tools/definitions"
import { handleToolCall } from "#tools/handlers"
import type { ModelTurn, Responder, RunContext, RunReport } from "#types"
import { describeAgentFailure } from "#utils/failures"
import { costOf } from "#utils/pricing"

const PDF_MEDIA_TYPE = "application/pdf"

export interface MonitoringRequest {
  readonly borrowerId: BorrowerId
  readonly period: string
  readonly filename: string
  readonly bytes: Uint8Array
}

/** A run that has been registered and is ready for the agent. */
export interface PreparedRun {
  readonly ctx: RunContext
  readonly filename: string
  readonly bytes: Uint8Array
}

let client: Anthropic | undefined

/** Calls the model. The client is created on first use, so replaying a recording needs no API key. */
export const liveResponder: Responder = (messages) =>
  Effect.tryPromise({
    try: async (): Promise<ModelTurn> => {
      client ??= new Anthropic()
      const started = performance.now()
      const response = await client.messages.create({
        model: AGENT_MODEL,
        max_tokens: AGENT_MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: [...messages]
      })
      return { response, latencyMs: Math.round(performance.now() - started) }
    },
    catch: (cause) =>
      new ModelRequestFailed({
        status: cause instanceof Anthropic.APIError ? cause.status : null,
        cause: toError(cause)
      })
  })

/** Returns recorded responses in order, as if the model were answering again. */
export const recordingResponder = (turns: ReadonlyArray<ModelTurn>): Responder => {
  let next = 0
  return () => {
    const turn = turns[next++]
    return turn ? Effect.succeed(turn) : Effect.fail(new AgentStopped({ reason: "The recording ended early" }))
  }
}

const openingMessage = ({ ctx, filename, bytes }: PreparedRun): Anthropic.MessageParam => ({
  role: "user",
  content: [
    {
      type: "document",
      source: { type: "base64", media_type: PDF_MEDIA_TYPE, data: Buffer.from(bytes).toString("base64") },
      title: filename,
      cache_control: { type: "ephemeral" }
    },
    {
      type: "text",
      text: `Run the ${ctx.period} covenant monitoring for ${ctx.borrower.name}. The reporting pack ${filename} is attached (${ctx.pdf.pages.length} pages).`
    }
  ]
})

/** Stores the pack, registers it and opens a run for the agent. */
export const prepareRun = (request: MonitoringRequest) =>
  Effect.gen(function* () {
    const store = yield* DocumentStore
    const pdf = yield* readPdfText(request.bytes)
    const { borrower, covenants } = yield* getMonitoringContext(request.borrowerId)

    const documentId = yield* registerDocument({
      borrowerId: borrower.id,
      period: request.period,
      filename: request.filename,
      sha256: pdf.sha256,
      storageKey: yield* store.put(request.bytes),
      pageCount: pdf.pages.length
    })
    const runId = yield* startRun({
      borrowerId: borrower.id,
      period: request.period,
      documentId,
      startedBy: AGENT_ACTOR
    })

    return {
      ctx: { runId, period: request.period, borrower, covenants, pdf },
      filename: request.filename,
      bytes: request.bytes
    } satisfies PreparedRun
  })

const driveLoop = (prepared: PreparedRun, budgetUsd: number, respond: Responder) =>
  Effect.gen(function* () {
    const { ctx } = prepared
    const messages: Anthropic.MessageParam[] = [openingMessage(prepared)]
    let costUsd = 0
    let rejectedFigures = 0
    let noteSaved = false

    for (let turn = 1; turn <= AGENT_MAX_TURNS; turn++) {
      const { response, latencyMs } = yield* respond(messages)
      costUsd += costOf(AGENT_MODEL, response.usage)
      yield* appendEvent(ctx.runId, AGENT_ACTOR, AUDIT_EVENT_KINDS.AGENT_TURN, {
        turn,
        stopReason: response.stop_reason ?? "unknown",
        costUsd: Number(costUsd.toFixed(6)),
        toolCalls: response.content.filter((block) => block.type === "tool_use").length,
        latencyMs
      })
      if (costUsd > budgetUsd) return yield* new BudgetExceeded({ spentUsd: costUsd, budgetUsd })

      switch (response.stop_reason) {
        case "end_turn":
          if (!noteSaved) return yield* new AgentStopped({ reason: "The agent finished without saving a note" })
          return { runId: ctx.runId, turns: turn, costUsd, rejectedFigures, completed: true } satisfies RunReport
        case "refusal":
          return yield* new AgentStopped({ reason: "The model declined the request" })
        case "max_tokens":
          return yield* new AgentStopped({ reason: "The response hit the output token limit" })
        case "tool_use":
          break
        default:
          return yield* new AgentStopped({ reason: `Unexpected stop reason: ${response.stop_reason}` })
      }

      messages.push({ role: "assistant", content: response.content })
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type !== "tool_use") continue
        const outcome = yield* handleToolCall(ctx, block.name, block.input)
        rejectedFigures += outcome.rejected
        if (block.name === TOOL_NAMES.SUBMIT_NOTE && !outcome.isError) noteSaved = true
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: outcome.content,
          is_error: outcome.isError
        })
      }
      messages.push({ role: "user", content: toolResults })
    }

    return yield* new AgentStopped({ reason: `No conclusion after ${AGENT_MAX_TURNS} turns` })
  })

/** Drives the model through extraction, testing and the note. Failures are recorded on the run. */
export const driveAgent = (prepared: PreparedRun, budgetUsd = RUN_BUDGET_USD, respond = liveResponder) =>
  driveLoop(prepared, budgetUsd, respond).pipe(
    Effect.tapError((error) => markRunFailed(prepared.ctx.runId, AGENT_ACTOR, describeAgentFailure(error)))
  )

/** Prepares a run and drives the agent to completion. */
export const runMonitoring = (request: MonitoringRequest, budgetUsd = RUN_BUDGET_USD, respond = liveResponder) =>
  Effect.flatMap(prepareRun(request), (prepared) => driveAgent(prepared, budgetUsd, respond))
