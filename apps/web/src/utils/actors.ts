import { formatDateTime } from "@/utils/format"

const AGENT_PREFIX = "agent:"
const SEED_PREFIX = "seed:"

/** `claude-haiku-5-5` → `Claude Haiku 5.5`. */
const formatModel = (model: string): string => {
  const parts = model.split("-")
  const version = parts.filter((part) => /^\d+$/.test(part)).join(".")
  const words = parts.filter((part) => !/^\d+$/.test(part)).map((word) => word[0]?.toUpperCase() + word.slice(1))
  return [...words, version].filter(Boolean).join(" ")
}

/** Short label for who started a run, e.g. `Agent · Claude Haiku 5.5` or `Seeded`. */
export const formatRunSource = (startedBy: string): string => {
  if (startedBy.startsWith(AGENT_PREFIX)) return `Agent · ${formatModel(startedBy.slice(AGENT_PREFIX.length))}`
  if (startedBy.startsWith(SEED_PREFIX)) return "Seeded"
  return startedBy
}

/** Run list subtitle: how the run started and when, so repeat runs for a borrower can be told apart. */
export const formatRunOrigin = (startedBy: string, createdAt: string): string =>
  `${startedBy.startsWith(AGENT_PREFIX) ? "Agent run" : "Seeded"} · ${formatDateTime(createdAt)}`
