import { useState } from "react"
import { EVAL_CATEGORY_LABELS, EVAL_CHECK_GROUP_LABELS, EVAL_MODE_LABELS } from "@/constants"
import type { EvalCaseResult } from "@/types"
import { evalOutcome } from "@/utils/evals"
import { formatDateTime, formatUsd } from "@/utils/format"
import { EvalCaseOutput } from "./EvalCaseOutput"
import styles from "./EvalsView.module.css"

/** One eval case: its result in a row, and its checks and output when opened. */
export function EvalCaseRow({ result }: { readonly result: EvalCaseResult }) {
  const [open, setOpen] = useState(!result.passed)
  const passed = result.checks.filter((check) => check.passed).length
  const groups = [...new Set(result.checks.map((check) => check.group))]

  return (
    <li className={styles.case}>
      <button type="button" className={styles.caseHeader} aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className={styles.outcome} data-passed={result.passed}>
          <span className={styles.dot} aria-hidden />
          {evalOutcome(result)}
        </span>
        <span className={styles.caseName}>
          {result.name}
          <span className={styles.category}>{EVAL_CATEGORY_LABELS[result.category] ?? result.category}</span>
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
                  <th colSpan={3}>{EVAL_CHECK_GROUP_LABELS[group]}</th>
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
          {result.output && <EvalCaseOutput output={result.output} />}
          <p className={styles.meta}>
            {EVAL_MODE_LABELS[result.mode]}
            {result.recordedAt && ` · recorded ${formatDateTime(result.recordedAt)}`}
            {result.error && ` · ${result.error}`}
          </p>
        </div>
      )}
    </li>
  )
}
