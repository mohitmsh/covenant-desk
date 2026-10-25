import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { fetchBorrowers } from "@/api/borrowers"
import { fetchEvals } from "@/api/evals"
import { fetchPortfolio } from "@/api/portfolio"
import { approveRun, decideIssue, fetchRun, fetchRuns, saveRunNote, startAgentRun } from "@/api/runs"
import { LIVE_REFRESH_INTERVAL_MS, QUERY_KEYS, RUN_POLL_INTERVAL_MS } from "@/constants"
import type { IssueDecision } from "@/types"
import { isRunInProgress } from "@/utils/runs"

export const useRuns = () =>
  useQuery({
    queryKey: QUERY_KEYS.runs,
    queryFn: fetchRuns,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.data?.some((run) => isRunInProgress(run.status)) ? RUN_POLL_INTERVAL_MS : LIVE_REFRESH_INTERVAL_MS
  })

export const useRun = (runId: string | null) =>
  useQuery({
    queryKey: QUERY_KEYS.run(runId ?? ""),
    queryFn: () => fetchRun(runId ?? ""),
    enabled: runId !== null,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const status = query.state.data?.run.status
      return status !== undefined && isRunInProgress(status) ? RUN_POLL_INTERVAL_MS : LIVE_REFRESH_INTERVAL_MS
    }
  })

export const usePortfolio = () =>
  useQuery({
    queryKey: QUERY_KEYS.portfolio,
    queryFn: fetchPortfolio,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.data?.rows.some((row) => row.run !== null && isRunInProgress(row.run.status))
        ? RUN_POLL_INTERVAL_MS
        : LIVE_REFRESH_INTERVAL_MS
  })

/** Refreshes the run list and portfolio after a change to a run. */
const invalidateSummaries = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.runs, exact: true })
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.portfolio })
}

export const useBorrowers = () => useQuery({ queryKey: QUERY_KEYS.borrowers, queryFn: fetchBorrowers })

export const useStartAgentRun = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ borrowerId, file }: { borrowerId: string; file: File | null }) => startAgentRun(borrowerId, file),
    onSuccess: () => invalidateSummaries(queryClient)
  })
}

export const useApproveRun = (runId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (approver: string) => approveRun(runId, approver),
    onSuccess: (detail) => {
      queryClient.setQueryData(QUERY_KEYS.run(runId), detail)
      invalidateSummaries(queryClient)
    }
  })
}

export const useSaveNote = (runId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ body, author }: { body: string; author: string }) => saveRunNote(runId, body, author),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.run(runId) })
      invalidateSummaries(queryClient)
    }
  })
}

export const useDecideIssue = (runId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ issueKey, decision }: { issueKey: string; decision: IssueDecision }) =>
      decideIssue(runId, issueKey, decision),
    onSuccess: (detail) => {
      queryClient.setQueryData(QUERY_KEYS.run(runId), detail)
      invalidateSummaries(queryClient)
    }
  })
}

export const useEvals = () => useQuery({ queryKey: QUERY_KEYS.evals, queryFn: fetchEvals })
