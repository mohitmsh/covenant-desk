import { ISSUE_KIND_LABELS, ISSUE_STATUS_LABELS } from "@/constants"
import type { Issue } from "@/types"
import { formatPage } from "@/utils/format"
import { countOpen, issueTone } from "@/utils/issues"
import { Button } from "@/components/ui/Button"
import { Section } from "@/components/ui/Section"
import styles from "./IssuesPanel.module.css"

interface IssuesPanelProps {
  readonly issues: ReadonlyArray<Issue>
  readonly activeKey: string | null
  readonly onStart: () => void
  readonly onSelect: (key: string) => void
}

/** The run's review issues, with progress towards sign-off. */
export function IssuesPanel({ issues, activeKey, onStart, onSelect }: IssuesPanelProps) {
  const open = countOpen(issues)
  const decided = issues.length - open

  if (issues.length === 0) {
    return (
      <Section title="Review issues">
        <p className={styles.clear}>
          <span aria-hidden>✓</span> Checks found nothing to review: certificate claims agree, subtotals add up and no
          line moved more than 25% on the prior period.
        </p>
      </Section>
    )
  }

  return (
    <Section
      title="Review issues"
      meta={
        <Button variant={open > 0 ? "primary" : "secondary"} onClick={onStart}>
          {open === 0 ? "Review again" : decided === 0 ? "Start review" : "Continue review"}
        </Button>
      }
    >
      <div className={styles.progress}>
        <div
          className={styles.bar}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={issues.length}
          aria-valuenow={decided}
          aria-label="Issues decided"
        >
          <span style={{ width: `${(decided / issues.length) * 100}%` }} />
        </div>
        <span className={styles.count}>
          {decided} of {issues.length} decided
          {open > 0 && ` · sign-off unlocks when all are decided`}
        </span>
      </div>

      <ol className={styles.list}>
        {issues.map((issue, index) => (
          <li key={issue.key}>
            <button
              type="button"
              className={styles.item}
              data-tone={issueTone(issue)}
              aria-current={issue.key === activeKey}
              onClick={() => onSelect(issue.key)}
            >
              <span className={styles.number}>{index + 1}</span>
              <span className={styles.body}>
                <span className={styles.title}>{issue.title}</span>
                <span className={styles.meta}>
                  {ISSUE_KIND_LABELS[issue.kind]} · {formatPage(issue.page)}
                </span>
              </span>
              <span className={styles.status} data-status={issue.status}>
                {issue.resolution?.remembered ? "Remembered" : ISSUE_STATUS_LABELS[issue.status]}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </Section>
  )
}
