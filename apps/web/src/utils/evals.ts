import type { EvalCaseResult } from "@/types"

/** A case's result in one word; a passed injection case reads as blocked, since passing means the attack failed. */
export const evalOutcome = (result: EvalCaseResult): string =>
  !result.passed ? "Failed" : result.category === "injection" ? "Blocked" : "Passed"

/** Clients that appear in the report, in first-seen order, with how many of their cases passed. */
export const evalClients = (cases: ReadonlyArray<EvalCaseResult>) =>
  [...new Map(cases.map((c) => [c.borrowerId, c.borrowerName])).entries()].map(([id, name]) => ({
    id,
    name,
    passed: cases.filter((c) => c.borrowerId === id && c.passed).length,
    total: cases.filter((c) => c.borrowerId === id).length
  }))
