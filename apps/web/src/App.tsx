import { useEffect, useRef, useState } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { PortfolioView } from "@/components/portfolio/PortfolioView"
import { RunReview } from "@/components/review/RunReview"
import { NewRunDialog } from "@/components/runs/NewRunDialog"
import { RunList } from "@/components/runs/RunList"
import { Message } from "@/components/ui/Message"
import { FEATURED_BORROWER_ID } from "@/constants"
import { useRoute } from "@/hooks/use-route"
import { useEvals, usePortfolio, useRun, useRuns } from "@/hooks/use-runs"
import { EvalsView } from "@/components/evals/EvalsView"

export function App() {
  const { route, navigate } = useRoute()
  const runId = route.view === "run" ? route.runId : null
  const runs = useRuns()
  const run = useRun(runId)
  const portfolio = usePortfolio()
  const evals = useEvals()
  const [isNewRunOpen, setNewRunOpen] = useState(false)

  const openRun = (id: string) => navigate({ view: "run", runId: id })

  // A visitor arriving at the bare URL lands on the featured run rather than the portfolio.
  const isLanding = useRef(route.view === "portfolio" && window.location.search === "")
  useEffect(() => {
    if (!isLanding.current || !runs.data) return
    isLanding.current = false
    const featured = runs.data.find((r) => r.borrowerId === FEATURED_BORROWER_ID && r.status !== "failed")
    if (featured) navigate({ view: "run", runId: featured.id }, { replace: true })
  }, [runs.data, navigate])

  const sidebar = runs.isPending ? (
    <Message title="Loading runs" />
  ) : runs.isError ? (
    <Message title="Runs could not be loaded" tone="error">
      {runs.error.message}
    </Message>
  ) : (
    <RunList
      runs={runs.data}
      selectedRunId={runId}
      onSelect={openRun}
      onNewRun={() => setNewRunOpen(true)}
      isPortfolioOpen={route.view === "portfolio"}
      onOpenPortfolio={() => navigate({ view: "portfolio" })}
      isEvalsOpen={route.view === "evals"}
      onOpenEvals={() => navigate({ view: "evals" })}
    />
  )

  const main =
    route.view === "evals" ? (
      evals.isPending ? (
        <Message title="Loading test results" />
      ) : evals.isError ? (
        <Message title="Test results could not be loaded" tone="error">
          {evals.error.message}
        </Message>
      ) : (
        <EvalsView report={evals.data} />
      )
    ) : route.view === "portfolio" ? (
      portfolio.isPending ? (
        <Message title="Loading portfolio" />
      ) : portfolio.isError ? (
        <Message title="Portfolio could not be loaded" tone="error">
          {portfolio.error.message}
        </Message>
      ) : (
        <PortfolioView portfolio={portfolio.data} onOpenRun={openRun} />
      )
    ) : run.isPending ? (
      <Message title="Loading run" />
    ) : run.isError ? (
      <Message title="Run could not be loaded" tone="error">
        {run.error.message}
      </Message>
    ) : (
      <RunReview key={run.data.run.id} detail={run.data} onOpenRun={openRun} />
    )

  return (
    <AppShell sidebar={sidebar}>
      <NewRunDialog
        open={isNewRunOpen}
        onClose={() => setNewRunOpen(false)}
        onStarted={(newRunId) => {
          setNewRunOpen(false)
          openRun(newRunId)
        }}
      />
      {main}
    </AppShell>
  )
}
