import { useRef, useState, type DragEvent } from "react"
import { DocumentIcon } from "@/components/ui/DocumentIcon"
import styles from "./FileDrop.module.css"

interface FileDropProps {
  readonly file: File | null
  readonly onChange: (file: File | null) => void
}

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

const isPdf = (file: File) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")

/** PDF drop zone drawn in the app's own style, replacing the native file input. */
export function FileDrop({ file, onChange }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [rejected, setRejected] = useState(false)

  const accept = (next: File | undefined) => {
    if (!next) return
    setRejected(!isPdf(next))
    if (isPdf(next)) onChange(next)
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    accept(event.dataTransfer.files[0])
  }

  const clear = () => {
    onChange(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className={styles.input}
        tabIndex={-1}
        aria-hidden
        onChange={(event) => accept(event.target.files?.[0])}
      />

      {file ? (
        <div className={styles.chosen}>
          <DocumentIcon />
          <span className={styles.fileName}>{file.name}</span>
          <span className={`${styles.size} tabular`}>{formatSize(file.size)}</span>
          <button type="button" className={styles.remove} onClick={clear} aria-label={`Remove ${file.name}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.zone}
          data-dragging={dragging}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <svg className={styles.icon} width="20" height="20" viewBox="0 0 20 20" aria-hidden>
            <path
              d="M10 13V4M6.5 7.5 10 4l3.5 3.5M4 13v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={styles.prompt}>
            Drop a PDF here or <span className={styles.browse}>browse</span>
          </span>
        </button>
      )}

      {rejected && <p className={styles.error}>Only PDF files can be used.</p>}
    </div>
  )
}
