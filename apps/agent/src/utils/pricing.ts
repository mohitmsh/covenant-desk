import type Anthropic from "@anthropic-ai/sdk"

const PER_MILLION = 1_000_000

interface ModelPricing {
  readonly input: number
  readonly output: number
  readonly cacheRead: number
}

/** List prices per million tokens, US dollars. */
const MODEL_PRICING: Readonly<Record<string, ModelPricing>> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 }
}

const CACHE_WRITE_MULTIPLIER = 1.25

/** Cost of one response in US dollars. Unknown models are priced at the most expensive rate listed. */
export const costOf = (model: string, usage: Anthropic.Usage): number => {
  const price = MODEL_PRICING[model] ?? MODEL_PRICING["claude-opus-5-5"] ?? { input: 0, output: 0, cacheRead: 0 }
  const cacheWrite = (usage.cache_creation_input_tokens ?? 0) * price.input * CACHE_WRITE_MULTIPLIER
  const cacheRead = (usage.cache_read_input_tokens ?? 0) * price.cacheRead
  return (usage.input_tokens * price.input + cacheWrite + cacheRead + usage.output_tokens * price.output) / PER_MILLION
}

export const formatUsd = (value: number): string => `$${value.toFixed(4)}`
