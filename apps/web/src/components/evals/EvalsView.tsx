import { useState } from "react"
import type { EvalCaseResult, EvalCheck, EvalReport } from "@/types"
import { formatDateTime } from "@/utils/format"
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

        <div>
          <div className={styles.columns} aria-hidden>
            <span>Result</span>
            <span>Case</span>
            <span className={styles.numeric}>Checks</span>
            <span className={styles.numeric}>Turns</span>
            <span className={styles.numeric}>Cost</span>
            <span />
          </div>
          <ol className={styles.cases}>
            {report.cases.map((result) => (
              <CaseRow key={result.id} result={result} />
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
