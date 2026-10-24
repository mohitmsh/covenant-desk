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
  readonly defaultApprover: string
  readonly openIssues: number
  readonly onReviewIssues: () => void
}

export function SignOff({ runId, status, note, approval, defaultApprover, openIssues, onReviewIssues }: SignOffProps) {
  const [approver, setApprover] = useState(defaultApprover)
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

  return (
    <Section title="Sign-off">
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault()
          if (ready && approver.trim() !== "") approve.mutate(approver.trim())
        }}
      >
        <p className={styles.detail}>
          {ready ? (
            `Approval records your name against note version ${note.version} and closes the run.`
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
            <input value={approver} onChange={(event) => setApprover(event.target.value)} disabled={!ready} />
          </label>
          <Button type="submit" variant="primary" disabled={!ready || approve.isPending || approver.trim() === ""}>
            {approve.isPending ? "Approving…" : "Approve run"}
          </Button>
        </div>
        {approve.isError && <p className={styles.error}>{approve.error.message}</p>}
      </form>
    </Section>
  )
}
