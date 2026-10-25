import type { AuditEvent, JsonValue, PageBox } from "@covenant-desk/core/types"

/** How seriously a certificate disagrees: a different outcome, only a different figure, or not at all. */
export type DisagreementLevel = "compliance" | "value" | "none"

/** Colour of a status chip. */
export type ChipTone = "breach" | "watch" | "pass" | "neutral"

/** Colour of a run-status pill. */
export type PillTone = "neutral" | "accent" | "positive" | "negative"

/** Colour an issue is drawn in: by category while open, settled once decided. */
export type IssueTone = "breach" | "watch" | "decided"

/** A numbered issue box drawn over a page, like a field in a signing app. */
export interface PageMarker {
  readonly key: string
  readonly number: number
  readonly label: string
  readonly box: PageBox
  readonly tone: IssueTone
  readonly active: boolean
}

/** An extracted field outlined where it was read from. */
export interface PageField {
  readonly key: string
  readonly label: string
  readonly value: string
  readonly box: PageBox
  readonly active: boolean
}

/** Something drawn on a particular page of the document. */
export type OnPage<T> = T & { readonly page: number }

/** A paragraph or bullet list in a monitoring note. */
export type NoteBlock =
  | { readonly type: "paragraph"; readonly text: string }
  | { readonly type: "list"; readonly items: ReadonlyArray<string> }

/** An audit trail entry: one event, or a run of consecutive agent steps folded together. */
export type AuditEntry =
  | { readonly type: "event"; readonly event: AuditEvent }
  | { readonly type: "agent"; readonly turns: ReadonlyArray<AuditEvent> }

/** A borrower's position in one word, for the portfolio. */
export interface Standing {
  readonly tone: ChipTone
  readonly label: string
}

/** A run list split into what needs attention, what is done, and what a later run replaced. */
export interface RunGroups<T> {
  readonly pending: ReadonlyArray<T>
  readonly approved: ReadonlyArray<T>
  readonly superseded: ReadonlyArray<T>
}

/** A step shown while the agent works. */
export interface AgentStep {
  readonly id: number
  readonly label: string
  readonly detail: string | null
  readonly tone: "neutral" | "positive" | "negative"
}

export type JsonObject = { readonly [key: string]: JsonValue }

export interface AgentUsage {
  readonly costUsd: number
  readonly toolCalls: number
  /** Time spent waiting on the model, summed over turns. */
  readonly modelSeconds: number
  /** When the run is a replay of a recorded agent run, when it was recorded. */
  readonly recordedAt: string | null
}
