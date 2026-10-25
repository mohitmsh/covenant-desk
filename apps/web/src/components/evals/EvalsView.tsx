import { useState } from "react"
import type { EvalReport } from "@/types"
import { evalClients } from "@/utils/evals"
import { formatDateTime, formatUsd } from "@/utils/format"
import { StatTile } from "@/components/ui/StatTile"
import { EvalCaseRow } from "./EvalCaseRow"
import styles from "./EvalsView.module.css"

interface EvalsViewProps {
  readonly report: EvalReport
}

/** Results of the latest eval run: each case through the real agent pipeline, checked against stored answers. */
export function EvalsView({ report }: EvalsViewProps) {
  const { totals } = report
  const failed = report.cases.filter((c) => !c.passed)
  const [client, setClient] = useState<string | null>(null)
  const clients = evalClients(report.cases)
  const shown = report.cases.filter((c) => client === null || c.borrowerId === client)

  return (
    <div className={styles.scroll}>
      <div className={styles.content}>
        <header>
          <h1 className={styles.title}>Test results</h1>
          <p className={styles.subtitle}>
            {report.model} · ran {formatDateTime(report.ranAt)}
          </p>
        </header>

        <div className={styles.stats}>
          <StatTile
            label="Cases passed"
            value={`${totals.casesPassed}/${totals.cases}`}
            tone={totals.casesPassed === totals.cases ? "neutral" : "breach"}
          />
          <StatTile label="Checks passed" value={`${totals.checksPassed}/${totals.checks}`} />
          <StatTile label="Model cost" value={formatUsd(totals.costUsd)} detail="For every case, as recorded" />
        </div>

        <div className={styles.method}>
          <p>
            <strong>These test the agent, not your clients.</strong> Each case takes one client's reporting pack, often
            deliberately altered (pages in $ millions, the wrong month, a hidden instruction to the AI), runs the agent
            on it in a separate scratch database, and compares what came out with answers written down in advance. None
            of it touches the runs in the sidebar.
          </p>
          <p>
            Open a case to see every check and what the agent actually produced: its covenant results, the issues it
            raised and the note it wrote. Recorded model responses are replayed through the current code, so a code
            change that breaks a case shows up here without calling the model.
          </p>
        </div>

        {failed.length > 0 && (
          <p className={styles.failures}>
            <span className={styles.dot} aria-hidden />
            {failed.length} case{failed.length === 1 ? "" : "s"} failing: {failed.map((c) => c.name).join(", ")}
          </p>
        )}

        <div className={styles.filters} role="group" aria-label="Filter by client">
          <button type="button" aria-pressed={client === null} onClick={() => setClient(null)}>
            All clients
          </button>
          {clients.map(({ id, name, passed, total }) => (
            <button key={id} type="button" aria-pressed={client === id} onClick={() => setClient(id)}>
              {name}
              <span className={styles.filterCount}>
                {passed}/{total}
              </span>
            </button>
          ))}
        </div>

        <div>
          <div className={styles.columns} aria-hidden>
            <span>Result</span>
            <span>Case</span>
            <span>Client</span>
            <span className={styles.numeric}>Checks</span>
            <span className={styles.numeric}>Turns</span>
            <span className={styles.numeric}>Cost</span>
            <span />
          </div>
          <ol className={styles.cases}>
            {shown.map((result) => (
              <EvalCaseRow key={result.id} result={result} />
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
