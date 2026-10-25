import { COVENANT_STATUS_LABELS, ISSUE_CATEGORY_LABELS, OPERATOR_SYMBOLS } from "@/constants"
import type { EvalOutput } from "@/types"
import { formatMetric } from "@/utils/format"
import { isCovenantStatus, isIssueCategory, isMetric, isOperator } from "@/utils/guards"
import { NoteText } from "@/components/review/NoteText"
import { StatusDot } from "@/components/ui/StatusDot"
import styles from "./EvalsView.module.css"

/** What the agent pipeline produced for the case: covenant results, review issues and the note. */
export function EvalCaseOutput({ output }: { readonly output: EvalOutput }) {
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
                {isCovenantStatus(covenant.status) && (
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
                {isIssueCategory(issue.category) ? ISSUE_CATEGORY_LABELS[issue.category] : issue.category}
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
