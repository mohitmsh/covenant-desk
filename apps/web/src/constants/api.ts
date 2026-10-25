export const API_BASE = "/api"

export const API_ROUTES = {
  borrowers: `${API_BASE}/borrowers`,
  portfolio: `${API_BASE}/portfolio`,
  evals: `${API_BASE}/evals`,
  runs: `${API_BASE}/runs`,
  run: (runId: string) => `${API_BASE}/runs/${runId}`,
  runDocument: (runId: string) => `${API_BASE}/runs/${runId}/document`,
  runNotes: (runId: string) => `${API_BASE}/runs/${runId}/notes`,
  runApprove: (runId: string) => `${API_BASE}/runs/${runId}/approve`,
  issueDecision: (runId: string, issueKey: string) =>
    `${API_BASE}/runs/${runId}/issues/${encodeURIComponent(issueKey)}/decision`
} as const

export const QUERY_KEYS = {
  borrowers: ["borrowers"],
  portfolio: ["portfolio"],
  evals: ["evals"],
  runs: ["runs"],
  run: (runId: string) => ["runs", runId]
} as const
