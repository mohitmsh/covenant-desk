import { useEffect, useRef, useState, type FormEvent } from "react"
import { AGENT_LABEL } from "@/constants"
import { useBorrowers, useStartAgentRun } from "@/hooks/use-runs"
import { Button } from "@/components/ui/Button"
import { BorrowerSelect } from "./BorrowerSelect"
import { FileDrop } from "./FileDrop"
import styles from "./NewRunDialog.module.css"

interface NewRunDialogProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly onStarted: (runId: string) => void
}

export function NewRunDialog({ open, onClose, onStarted }: NewRunDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const borrowers = useBorrowers()
  const startRun = useStartAgentRun()
  const [borrowerId, setBorrowerId] = useState("")
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const selectedBorrower = borrowerId || borrowers.data?.[0]?.id || ""

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedBorrower) return
    startRun.mutate(
      { borrowerId: selectedBorrower, file },
      {
        onSuccess: ({ runId }) => {
          setFile(null)
          onStarted(runId)
        }
      }
    )
  }

  return (
    <dialog ref={dialogRef} className={styles.dialog} onClose={onClose} aria-labelledby="new-run-title">
      <form className={styles.form} onSubmit={submit}>
        <header>
          <h2 id="new-run-title" className={styles.title}>
            New monitoring run
          </h2>
          <p className={styles.subtitle}>
            The agent extracts the figures, verifies each one against its page, tests the covenants and drafts a note
            for your sign-off.
          </p>
        </header>

        <div className={styles.field}>
          <span className={styles.label}>Borrower</span>
          <BorrowerSelect borrowers={borrowers.data ?? []} value={selectedBorrower} onChange={setBorrowerId} />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Reporting pack</span>
          <FileDrop file={file} onChange={setFile} />
          <small>Optional. Without a file, the borrower's September 2026 sample pack is used.</small>
        </div>

        {startRun.isError && <p className={styles.error}>{startRun.error.message}</p>}

        <footer className={styles.footer}>
          <span className={styles.model}>{AGENT_LABEL} · about $0.003 per run</span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!selectedBorrower || startRun.isPending}>
            {startRun.isPending ? "Starting…" : "Run agent"}
          </Button>
        </footer>
      </form>
    </dialog>
  )
}
