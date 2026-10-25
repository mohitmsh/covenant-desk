import { useState } from "react"
import { useSaveNote } from "@/hooks/use-runs"
import type { Note } from "@/types"
import { formatDateTime } from "@/utils/format"
import { Button } from "@/components/ui/Button"
import { Section } from "@/components/ui/Section"
import { NoteText } from "./NoteText"
import styles from "./MonitoringNote.module.css"

interface MonitoringNoteProps {
  readonly runId: string
  readonly note: Note | null
  readonly author: string
  readonly editable: boolean
  readonly onShowPage: (page: number) => void
}

export function MonitoringNote({ runId, note, author, editable, onShowPage }: MonitoringNoteProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const saveNote = useSaveNote(runId)

  const save = () => {
    if (draft === null || draft.trim() === "") return
    saveNote.mutate({ body: draft, author }, { onSuccess: () => setDraft(null) })
  }

  const meta = note && `Version ${note.version} · ${note.author} · ${formatDateTime(note.createdAt)}`

  return (
    <Section
      title="Monitoring note"
      meta={
        editable && draft === null && note ? (
          <Button variant="ghost" onClick={() => setDraft(note.body)}>
            Edit
          </Button>
        ) : (
          meta
        )
      }
    >
      <div className={styles.body}>
        {draft !== null ? (
          <>
            <textarea
              className={styles.editor}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={Math.max(8, draft.split("\n").length + 2)}
              aria-label="Monitoring note"
            />
            <div className={styles.actions}>
              {saveNote.isError && <span className={styles.error}>{saveNote.error.message}</span>}
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={save} disabled={saveNote.isPending || draft.trim() === ""}>
                Save as version {(note?.version ?? 0) + 1}
              </Button>
            </div>
          </>
        ) : note ? (
          <>
            <NoteText body={note.body} onShowPage={onShowPage} />
            {editable && <p className={styles.meta}>{meta}</p>}
          </>
        ) : (
          <p className={styles.empty}>No note has been drafted for this run.</p>
        )}
      </div>
    </Section>
  )
}
