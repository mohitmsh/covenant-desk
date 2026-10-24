import { useState } from "react"
import { ISSUE_KIND_LABELS, ISSUE_STATUS_LABELS } from "@/constants"
import { useDecideIssue } from "@/hooks/use-runs"
import type { Issue, IssueDecision } from "@/types"
import { formatDateTime, formatPage } from "@/utils/format"
import { countOpen, draftQuery, issueTone } from "@/utils/issues"
import { Button } from "@/components/ui/Button"
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
  /** Called after a decision with the updated issues, to move on to the next open one. */
  readonly onDecided: (key: string, issues: ReadonlyArray<Issue>) => void
  readonly onClose: () => void
}

type Mode = "choose" | "override" | "query"

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
  onDecided,
  onClose
}: IssueCardProps) {
  const decide = useDecideIssue(runId)
  const [mode, setMode] = useState<Mode>("choose")
  const [reason, setReason] = useState("")
  const [draft, setDraft] = useState(() => draftQuery(issue, borrowerName, period))
  const [remember, setRemember] = useState(false)

  const index = issues.findIndex((i) => i.key === issue.key)
  const previous = issues[index - 1]
  const next = issues[index + 1]
  const open = countOpen(issues)

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
          <span className={styles.remaining}>{open === 0 ? "· all decided" : `· ${open} to review`}</span>
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
        {ISSUE_KIND_LABELS[issue.kind]} · {formatPage(issue.page)}
      </p>
      <h3 className={styles.title}>{issue.title}</h3>
      <p className={styles.detail}>{issue.detail}</p>

      {issue.status !== "open" && issue.resolution ? (
        <div className={styles.decision}>
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
              onClick={() => {
                setMode("choose")
                submit({ action: "reopen" })
              }}
            >
              Change decision
            </Button>
          )}
        </div>
      ) : editable ? (
        <div className={styles.actions}>
          {mode === "choose" && (
            <>
              <div className={styles.buttons}>
                <Button
                  variant="primary"
                  disabled={decide.isPending}
                  onClick={() => submit({ action: "accept", remember })}
                >
                  Accept
                </Button>
                <Button disabled={decide.isPending} onClick={() => setMode("override")}>
                  Override…
                </Button>
                <Button disabled={decide.isPending} onClick={() => setMode("query")}>
                  Query borrower…
                </Button>
              </div>
              <label className={styles.remember}>
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                Remember for next time
                <span className={styles.hint}>Decide this the same way when it recurs for {borrowerName}</span>
              </label>
            </>
          )}

          {mode === "override" && (
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault()
                if (reason.trim() !== "") submit({ action: "override", reason, remember })
              }}
            >
              <label className={styles.field}>
                <span>Reason for override (required)</span>
                <textarea
                  rows={2}
                  value={reason}
                  autoFocus
                  placeholder="Why this does not need action"
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <label className={styles.remember}>
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                Remember for next time
              </label>
              <div className={styles.buttons}>
                <Button type="submit" variant="primary" disabled={decide.isPending || reason.trim() === ""}>
                  Override
                </Button>
                <Button variant="ghost" onClick={() => setMode("choose")}>
                  Back
                </Button>
              </div>
            </form>
          )}

          {mode === "query" && (
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault()
                if (draft.trim() !== "") submit({ action: "query", draft })
              }}
            >
              <label className={styles.field}>
                <span>Draft query to the borrower · held for approval, not sent</span>
                <textarea rows={6} value={draft} onChange={(event) => setDraft(event.target.value)} />
              </label>
              <div className={styles.buttons}>
                <Button type="submit" variant="primary" disabled={decide.isPending || draft.trim() === ""}>
                  Save draft
                </Button>
                <Button variant="ghost" onClick={() => setMode("choose")}>
                  Back
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {decide.isError && <p className={styles.error}>{decide.error.message}</p>}
    </section>
  )
}
