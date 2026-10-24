import { API_ROUTES } from "@/constants"
import type { IssueDecision, RunDetail, RunSummary } from "@/types"
import { requestJson } from "./client"

export const fetchRuns = () => requestJson<ReadonlyArray<RunSummary>>(API_ROUTES.runs)

export const fetchRun = (runId: string) => requestJson<RunDetail>(API_ROUTES.run(runId))

export const saveRunNote = (runId: string, body: string, author: string) =>
  requestJson<{ version: number }>(API_ROUTES.runNotes(runId), {
    method: "POST",
    body: JSON.stringify({ body, author })
  })

export const approveRun = (runId: string, approver: string) =>
  requestJson<RunDetail>(API_ROUTES.runApprove(runId), {
    method: "POST",
    body: JSON.stringify({ approver })
  })

/** Starts an agent run for a borrower. Without a file, the borrower's sample pack is used. */
export const startAgentRun = (borrowerId: string, file: File | null) => {
  const form = new FormData()
  form.set("borrowerId", borrowerId)
  if (file) form.set("file", file)
  return requestJson<{ runId: string }>(API_ROUTES.runs, { method: "POST", body: form })
}

/** Records an analyst's decision on a review issue and returns the updated run. */
export const decideIssue = (runId: string, issueKey: string, decision: IssueDecision) =>
  requestJson<RunDetail>(API_ROUTES.issueDecision(runId, issueKey), {
    method: "POST",
    body: JSON.stringify(decision)
  })
