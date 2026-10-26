import type Anthropic from "@anthropic-ai/sdk"

export const AGENT_MODEL: Anthropic.Model = process.env.AGENT_MODEL ?? "claude-haiku-5-5"

/** Actor recorded on runs and audit events written by the agent. */
export const AGENT_ACTOR = `agent:${AGENT_MODEL}`

export const AGENT_MAX_TOKENS = 16_000

/** Maximum model turns per run before the agent gives up. */
export const AGENT_MAX_TURNS = 12

/** Spend ceiling for a single monitoring run, in US dollars. */
export const RUN_BUDGET_USD = Number(process.env.AGENT_RUN_BUDGET_USD ?? 0.1)

/** Spend ceiling for a full eval, in US dollars. */
export const EVAL_BUDGET_USD = Number(process.env.AGENT_EVAL_BUDGET_USD ?? 1)

export const TOOL_NAMES = {
  GET_CONTEXT: "get_monitoring_context",
  SUBMIT_FIGURES: "submit_figures",
  SUBMIT_CERTIFICATE: "submit_certificate",
  TEST_COVENANTS: "test_covenants",
  SUBMIT_NOTE: "submit_note"
} as const

export const MAX_NOTE_LENGTH = 4_000

/** Longest monitoring note the agent may save, in words. */
export const MAX_NOTE_WORDS = 220

/**
 * Part of the hosted demo's data fingerprint. Increase it to reset the demo on
 * the next deploy, for example to clear runs visitors have added.
 */
export const DEMO_DATA_REVISION = 2
