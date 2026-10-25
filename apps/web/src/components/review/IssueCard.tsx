import { useState } from "react"
import { ISSUE_CATEGORY_LABELS, ISSUE_KIND_LABELS, ISSUE_STATUS_LABELS } from "@/constants"
import { useDecideIssue } from "@/hooks/use-runs"
import type { Issue, IssueDecision, IssueEvidence } from "@/types"
import { formatDateTime, formatPage } from "@/utils/format"
import { canRemember, decisionLabels, draftQuery, issueTone } from "@/utils/issues"
import { Button } from "@/components/ui/Button"
import { PageTag } from "@/components/ui/PageTag"
import styles from "./IssueCard.module.css"

interface IssueCardProps {
  readonly runId: string
  readonly issues: ReadonlyArray<Issue>
  readonly issue: Issue
  readonly editable: boolean
  readonly actor: string
  readonly borrowerName: string
  readonly period: string
  readonly onSelect: (key: string) => void
  /** Shows where a value was read, without leaving the issue. */
  readonly onShowEvidence: (evidence: IssueEvidence) => void
  /** Called after a decision with the updated issues, to move on to the next open one. */
  readonly onDecided: (key: string, issues: ReadonlyArray<Issue>) => void
  readonly onClose: () => void
}

/** Step-by-step review of one issue, docked under the document like a signing flow. */
export function IssueCard({
  runId,
  issues,
  issue,
  editable,
  actor,
  borrowerName,
  period,
  onSelect,
  onShowEvidence,
  onDecided,
  onClose
}: IssueCardProps) {
  const decide = useDecideIssue(runId)
  const [note, setNote] = useState("")
  const [drafting, setDrafting] = useState(false)
  const [draft, setDraft] = useState(() => draftQuery(issue, borrowerName, period))
  const [remember, setRemember] = useState(false)

  const index = issues.findIndex((i) => i.key === issue.key)
  const previous = issues[index - 1]
  const next = issues[index + 1]
  const hasNote = note.trim() !== ""
  const labels = decisionLabels(issue)

  const submit = (decision: Omit<IssueDecision, "actor">) =>
    decide.mutate(
      { issueKey: issue.key, decision: { ...decision, actor } },
      { onSuccess: (detail) => decision.action !== "reopen" && onDecided(issue.key, detail.issues) }
    )

  return (
    <section className={styles.card} data-tone={issueTone(issue)} aria-label={`Issue ${index + 1} of ${issues.length}`}>
      <header className={styles.header}>
        <span className={styles.step}>
          <span className={styles.number}>{index + 1}</span>
          Issue {index + 1} of {issues.length}
        </span>
        <div className={styles.nav}>
          <Button
            variant="ghost"
            aria-label="Previous issue"
            disabled={!previous}
            onClick={() => previous && onSelect(previous.key)}
          >
            ←
          </Button>
          <Button variant="ghost" aria-label="Next issue" disabled={!next} onClick={() => next && onSelect(next.key)}>
            →
          </Button>
          <Button variant="ghost" aria-label="Close review" onClick={onClose}>
            ✕
          </Button>
        </div>
      </header>

      <p className={styles.kind}>
        <span className={styles.category} data-category={issue.category}>
          {ISSUE_CATEGORY_LABELS[issue.category]}
        </span>
        {ISSUE_KIND_LABELS[issue.kind]} · {formatPage(issue.page)}
      </p>
      <h3 className={styles.title}>{issue.title}</h3>

      {issue.evidence.length > 0 && (
        <dl className={styles.evidence}>
          {issue.evidence.map((item) => (
            <div key={`${item.label}-${item.value}`} className={styles.evidenceRow}>
              <dt>{item.label}</dt>
              <dd className="tabular">{item.value}</dd>
              <dd className={styles.evidenceSource}>
                {item.page !== null ? (
                  <PageTag page={item.page} onClick={() => onShowEvidence(item)} />
                ) : (
                  <span className={styles.computed}>computed</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {issue.impact && (
        <div className={styles.block}>
          <p className={styles.blockTitle}>Why it matters</p>
          <p className={styles.blockText}>{issue.impact}</p>
        </div>
      )}

      {issue.checks.length > 0 && issue.status === "open" && (
        <div className={styles.block}>
          <p className={styles.blockTitle}>What to check</p>
          <ul className={styles.checks}>
            {issue.checks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
        </div>
      )}

      {issue.status !== "open" && issue.resolution ? (
        <div className={styles.decision} data-status={issue.status}>
          <p className={styles.decisionStatus}>
            <span aria-hidden>✓</span> {ISSUE_STATUS_LABELS[issue.status]}
            {issue.status === "queried" && <span className={styles.held}>Held for approval, not sent</span>}
          </p>
          <p className={styles.decisionMeta}>
            {issue.resolution.remembered ? "Applied from an earlier decision by " : ""}
            {issue.resolution.by} · {formatDateTime(issue.resolution.at)}
          </p>
          {issue.resolution.reason && <p className={styles.quoteText}>“{issue.resolution.reason}”</p>}
          {issue.resolution.draft && <pre className={styles.draftText}>{issue.resolution.draft}</pre>}
          {editable && (
            <Button
              variant="ghost"
              className={styles.change}
              disabled={decide.isPending}
              onClick={() => submit({ action: "reopen" })}
            >
              Change decision
            </Button>
          )}
        </div>
      ) : editable && drafting ? (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault()
            if (draft.trim() !== "") submit({ action: "query", draft })
          }}
        >
          <label className={styles.field}>
            <span>Draft query to the borrower · held for approval, not sent</span>
            <textarea rows={6} value={draft} autoFocus onChange={(event) => setDraft(event.target.value)} />
          </label>
          <div className={styles.buttons}>
            <Button type="submit" variant="primary" disabled={decide.isPending || draft.trim() === ""}>
              Save draft
            </Button>
            <Button variant="ghost" onClick={() => setDrafting(false)}>
              Back
            </Button>
          </div>
        </form>
      ) : editable ? (
        <div className={styles.actions}>
          <label className={styles.field}>
            <span>Note · optional, required to override</span>
            <textarea
              rows={2}
              value={note}
              placeholder="e.g. Reason for the decision"
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <div className={styles.buttons}>
            <Button
              // A discrepancy has no safe default, so nothing is pre-emphasised.
              variant={issue.category === "discrepancy" ? "secondary" : "primary"}
              disabled={decide.isPending}
              onClick={() => submit({ action: "accept", reason: note, remember })}
            >
              {labels.confirm}
            </Button>
            <Button disabled={decide.isPending} onClick={() => setDrafting(true)}>
              Draft borrower query…
            </Button>
            <Button
              disabled={decide.isPending || !hasNote}
              title={hasNote ? undefined : "Add a note explaining the override"}
              onClick={() => submit({ action: "override", reason: note, remember })}
            >
              {labels.override}
            </Button>
            <Button
              variant="ghost"
              disabled={decide.isPending}
              onClick={() => submit({ action: "mark_extraction_error", reason: note })}
            >
              Mark as extraction error
            </Button>
          </div>
          {canRemember(issue) && (
            <label className={styles.remember}>
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              Remember for next time
              <span className={styles.hint}>Read {borrowerName}'s packs the same way when this recurs</span>
            </label>
          )}
        </div>
      ) : null}

      {decide.isError && <p className={styles.error}>{decide.error.message}</p>}
    </section>
  )
}
