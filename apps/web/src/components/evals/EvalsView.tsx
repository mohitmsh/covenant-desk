import { useState } from "react"
import { METRICS } from "@covenant-desk/core/constants"
import { COVENANT_STATUS_LABELS, ISSUE_CATEGORY_LABELS, OPERATOR_SYMBOLS } from "@/constants"
import type {
  CovenantStatus,
  EvalCaseResult,
  EvalCheck,
  EvalOutput,
  EvalReport,
  IssueCategory,
  Metric,
  Operator
} from "@/types"
import { formatDateTime, formatMetric } from "@/utils/format"
import { StatusDot } from "@/components/ui/StatusDot"
import { NoteText } from "@/components/review/NoteText"
import { formatUsd } from "@/utils/runs"
import { StatTile } from "@/components/ui/StatTile"
import styles from "./EvalsView.module.css"

interface EvalsViewProps {
  readonly report: EvalReport
}

const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  normal: "Normal",
  unseen: "Unseen pack",
  units: "Units trap",
  period: "Wrong period",
  conflict: "Conflicting pages",
  injection: "Prompt injection"
}

const GROUP_LABELS: Readonly<Record<EvalCheck["group"], string>> = {
  run: "Run",
  figures: "Figures",
  covenants: "Covenants",
  issues: "Review checks",
  certificate: "Certificate",
  note: "Note",
  grounding: "Grounding"
}

const MODE_LABELS: Readonly<Record<EvalCaseResult["mode"], string>> = {
  live: "Live",
  replay: "Replayed",
  "not-recorded": "Not recorded"
}

/** What a passing case proves, in one phrase, for the cases where passing means something was stopped. */
const outcomeLabel = (result: EvalCaseResult) =>
  !result.passed ? "Failed" : result.category === "injection" ? "Blocked" : "Passed"

const isStatus = (value: string): value is CovenantStatus => value in COVENANT_STATUS_LABELS
const isOperator = (value: string): value is Operator => value in OPERATOR_SYMBOLS
const isMetric = (value: string): value is Metric => METRICS.some((metric) => metric === value)
const isCategory = (value: string): value is IssueCategory => value in ISSUE_CATEGORY_LABELS

/** What the agent pipeline produced for the case: covenant results, review issues and the note. */
function CaseOutput({ output }: { readonly output: EvalOutput }) {
  return (
    <div className={styles.output}>
      <p className={styles.outputTitle}>What the agent produced</p>
      <table className={styles.covenants}>
        <tbody>
          {output.covenants.map((covenant) => (
            <tr key={covenant.metric}>
              <td>{covenant.name}</td>
              <td className={styles.numeric}>
                {isMetric(covenant.metric) ? formatMetric(covenant.metric, covenant.actual) : covenant.actual}
              </td>
              <td className={styles.limit}>
                limit {isOperator(covenant.operator) ? OPERATOR_SYMBOLS[covenant.operator] : ""}{" "}
                {isMetric(covenant.metric) ? formatMetric(covenant.metric, covenant.limit) : covenant.limit}
              </td>
              <td>
                {isStatus(covenant.status) && (
                  <span className={styles.status}>
                    <StatusDot status={covenant.status} />
                    {COVENANT_STATUS_LABELS[covenant.status]}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {output.issues.length > 0 && (
        <ul className={styles.issues}>
          {output.issues.map((issue) => (
            <li key={issue.title}>
              <span className={styles.issueCategory} data-category={issue.category}>
                {isCategory(issue.category) ? ISSUE_CATEGORY_LABELS[issue.category] : issue.category}
              </span>{" "}
              {issue.title}
            </li>
          ))}
        </ul>
      )}
      {output.note && (
        <details className={styles.note}>
          <summary>Monitoring note</summary>
          <NoteText body={output.note} />
        </details>
      )}
    </div>
  )
}

function CaseRow({ result }: { readonly result: EvalCaseResult }) {
  const [open, setOpen] = useState(!result.passed)
  const passed = result.checks.filter((check) => check.passed).length
  const groups = [...new Set(result.checks.map((check) => check.group))]

  return (
    <li className={styles.case}>
      <button type="button" className={styles.caseHeader} aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className={styles.outcome} data-passed={result.passed}>
          <span className={styles.dot} aria-hidden />
          {outcomeLabel(result)}
        </span>
        <span className={styles.caseName}>
          {result.name}
          <span className={styles.category}>{CATEGORY_LABELS[result.category] ?? result.category}</span>
        </span>
        <span className={styles.client}>{result.borrowerName}</span>
        <span className={`${styles.numeric} tabular`}>
          {passed}/{result.checks.length}
        </span>
        <span className={`${styles.numeric} tabular`}>{result.turns}</span>
        <span className={`${styles.numeric} tabular`}>{formatUsd(result.costUsd)}</span>
        <span className={styles.chevron} aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className={styles.detail}>
          <p className={styles.description}>{result.description}</p>
          <p className={styles.pack}>
            {result.borrowerName} · <code>{result.pack}</code>
          </p>
          <table className={styles.checks}>
            <thead>
              <tr>
                <th>Check</th>
                <th>Expected</th>
                <th>Actual</th>
              </tr>
            </thead>
            {groups.map((group) => (
              <tbody key={group}>
                <tr className={styles.groupRow}>
                  <th colSpan={3}>{GROUP_LABELS[group]}</th>
                </tr>
                {result.checks
                  .filter((check) => check.group === group)
                  .map((check) => (
                    <tr key={`${check.group}-${check.name}`} data-passed={check.passed}>
                      <td>
                        <span className={styles.mark} aria-label={check.passed ? "passed" : "failed"}>
                          {check.passed ? "✓" : "✕"}
                        </span>
                        {check.name}
                      </td>
                      <td className="tabular">{check.expected}</td>
                      <td className="tabular">{check.actual}</td>
                    </tr>
                  ))}
              </tbody>
            ))}
          </table>
          {result.output && <CaseOutput output={result.output} />}
          <p className={styles.meta}>
            {MODE_LABELS[result.mode]}
            {result.recordedAt && ` · recorded ${formatDateTime(result.recordedAt)}`}
            {result.error && ` · ${result.error}`}
          </p>
        </div>
      )}
    </li>
  )
}

/** Results of the latest eval run: each case through the real agent pipeline, checked against stored answers. */
export function EvalsView({ report }: EvalsViewProps) {
  const { totals } = report
  const failed = report.cases.filter((c) => !c.passed)
  const [client, setClient] = useState<string | null>(null)
  const clients = [...new Map(report.cases.map((c) => [c.borrowerId, c.borrowerName])).entries()]
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

        <p className={styles.method}>
          Each case is a reporting pack run through the same agent loop, verification, covenant tests and review checks
          as the app. What each case must produce is stored apart from its pack, so the agent never sees it. Recorded
          model responses are replayed through the current code, so a code change that breaks a case shows up here
          without calling the model.
        </p>

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
          {clients.map(([id, name]) => (
            <button key={id} type="button" aria-pressed={client === id} onClick={() => setClient(id)}>
              {name}
              <span className={styles.filterCount}>
                {report.cases.filter((c) => c.borrowerId === id && c.passed).length}/
                {report.cases.filter((c) => c.borrowerId === id).length}
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
              <CaseRow key={result.id} result={result} />
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
