import type Anthropic from "@anthropic-ai/sdk"
import type { Borrower, CovenantDefinition, PdfText, RunId } from "@covenant-desk/core"
import type { Effect } from "effect"
import type { AgentStopped, ModelRequestFailed } from "#errors"

/** State shared by the tools during one monitoring run. */
export interface RunContext {
  readonly runId: RunId
  readonly period: string
  readonly borrower: Borrower
  readonly covenants: ReadonlyArray<CovenantDefinition>
  readonly pdf: PdfText
}

/** Content returned to the model for one tool call. */
export interface ToolOutcome {
  readonly content: string
  readonly isError: boolean
  /** Figure claims rejected by verification in this call. */
  readonly rejected: number
}

export interface RunReport {
  readonly runId: RunId
  readonly turns: number
  readonly costUsd: number
  readonly rejectedFigures: number
  readonly completed: true
}

/** Tool input as received from the model, before schema decoding. */
export type ToolInput = Anthropic.ToolUseBlock["input"]

/** One model response and how long the request took. */
export interface ModelTurn {
  readonly response: Anthropic.Message
  readonly latencyMs: number
}

/** Produces the model's next response: live from the API, or from a recording. */
export type Responder = (
  messages: ReadonlyArray<Anthropic.MessageParam>
) => Effect.Effect<ModelTurn, ModelRequestFailed | AgentStopped>

/** A real agent run's model responses, saved so the run can be replayed without calling the API. */
export interface AgentRecording {
  readonly model: string
  readonly recordedAt: string
  readonly pack: string
  readonly sha256: string
  readonly turns: ReadonlyArray<ModelTurn>
}
