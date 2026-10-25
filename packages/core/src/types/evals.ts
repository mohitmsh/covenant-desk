/** What a check in an eval case looked at. */
export type EvalCheckGroup = "run" | "figures" | "covenants" | "issues" | "certificate" | "note" | "grounding"

export interface EvalCheck {
  readonly group: EvalCheckGroup
  readonly name: string
  readonly passed: boolean
  readonly expected: string
  readonly actual: string
}

export interface EvalCaseResult {
  readonly id: string
  readonly name: string
  readonly category: string
  readonly description: string
  readonly passed: boolean
  readonly checks: ReadonlyArray<EvalCheck>
  /** `replay` re-runs a recorded model through the current code; `live` calls the model. */
  readonly mode: "live" | "replay" | "not-recorded"
  readonly recordedAt: string | null
  readonly costUsd: number
  readonly turns: number
  readonly error: string | null
}

/** One run of the eval suite, as shown on the test results page. */
export interface EvalReport {
  readonly ranAt: string
  readonly model: string
  readonly cases: ReadonlyArray<EvalCaseResult>
  readonly totals: {
    readonly cases: number
    readonly casesPassed: number
    readonly checks: number
    readonly checksPassed: number
    readonly costUsd: number
  }
}
