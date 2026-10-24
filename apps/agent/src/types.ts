import type Anthropic from "@anthropic-ai/sdk"
import type { Borrower, CovenantDefinition, PdfText, RunId } from "@covenant-desk/core"

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
