import { useState } from "react"
import { useApproveRun } from "@/hooks/use-runs"
import type { Approval, Note, RunStatus } from "@/types"
import { formatDateTime } from "@/utils/format"
import { Button } from "@/components/ui/Button"
import { Section } from "@/components/ui/Section"
import styles from "./SignOff.module.css"

interface SignOffProps {
  readonly runId: string
  readonly status: RunStatus
  readonly note: Note | null
  readonly approval: Approval | null
  /** The analyst who reviewed the run, who may not also approve it. */
  readonly analyst: string
  readonly openIssues: number
  readonly onReviewIssues: () => void
}

export function SignOff({ runId, status, note, approval, analyst, openIssues, onReviewIssues }: SignOffProps) {
  const [approver, setApprover] = useState("")
  const approve = useApproveRun(runId)

  if (approval) {
    return (
      <Section title="Sign-off">
        <p className={styles.approved}>
          <span className={styles.signedOff}>✓ Signed off</span>
          {approval.approver} · {formatDateTime(approval.approvedAt)} · Note version {approval.noteVersion}
        </p>
      </Section>
    )
  }

  const ready = status === "awaiting_signoff" && note !== null && openIssues === 0
  const isAnalyst = approver.trim().toLowerCase() === analyst.trim().toLowerCase()
  const canApprove = ready && approver.trim() !== "" && !isAnalyst

  return (
    <Section title="Sign-off">
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          if (canApprove) approve.mutate(approver.trim())
        }}
      >
        <p className={styles.detail}>
          {ready ? (
            `A second reviewer, not ${analyst}, approves note version ${note.version}. Approval records their name and closes the run.`
          ) : openIssues > 0 ? (
            <>
              Decide the {openIssues} open review issue{openIssues === 1 ? "" : "s"} before approving.{" "}
              <button type="button" className={styles.link} onClick={onReviewIssues}>
                Review issues
              </button>
            </>
          ) : (
            "A monitoring note is required before this run can be approved."
          )}
        </p>
        <div className={styles.controls}>
          <label className={styles.field}>
            <span>Approver</span>
            <input
              value={approver}
              placeholder="Second reviewer's name"
              onChange={(event) => setApprover(event.target.value)}
              disabled={!ready}
            />
          </label>
          <Button type="submit" variant="primary" disabled={!canApprove || approve.isPending}>
            {approve.isPending ? "Approving…" : "Approve run"}
          </Button>
        </div>
        {isAnalyst && ready && <p className={styles.error}>{analyst} reviewed this run, so cannot also approve it.</p>}
        {approve.isError && <p className={styles.error}>{approve.error.message}</p>}
      </form>
    </Section>
  )
}
