import { useState } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { PortfolioView } from "@/components/portfolio/PortfolioView"
import { RunReview } from "@/components/review/RunReview"
import { NewRunDialog } from "@/components/runs/NewRunDialog"
import { RunList } from "@/components/runs/RunList"
import { Message } from "@/components/ui/Message"
import { useRoute } from "@/hooks/use-route"
import { usePortfolio, useRun, useRuns } from "@/hooks/use-runs"

export function App() {
  const { route, navigate } = useRoute()
  const runId = route.view === "run" ? route.runId : null
  const runs = useRuns()
  const run = useRun(runId)
  const portfolio = usePortfolio()
  const [isNewRunOpen, setNewRunOpen] = useState(false)

  const openRun = (id: string) => navigate({ view: "run", runId: id })

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
    />
  )

  const main =
    route.view === "portfolio" ? (
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
      <RunReview key={run.data.run.id} detail={run.data} />
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
