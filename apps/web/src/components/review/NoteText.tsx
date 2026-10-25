import type { ReactNode } from "react"
import { NOTE_INLINE_PATTERN } from "@/constants"
import { parseNoteBlocks } from "@/utils/note"
import styles from "./MonitoringNote.module.css"

interface NoteTextProps {
  readonly body: string
  /** Without it, page references are shown as plain text. */
  readonly onShowPage?: (page: number) => void
}

const renderInline = (text: string, onShowPage: ((page: number) => void) | undefined): ReactNode[] => {
  const nodes: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(NOTE_INLINE_PATTERN)) {
    const index = match.index ?? 0
    if (index > last) nodes.push(text.slice(last, index))
    const [whole, bold, , page] = match
    if (bold !== undefined) {
      nodes.push(<strong key={index}>{bold}</strong>)
    } else if (page !== undefined && onShowPage === undefined) {
      nodes.push(whole)
    } else if (page !== undefined && onShowPage) {
      const pageNumber = Number(page)
      nodes.push(
        <button key={index} type="button" className={styles.pageLink} onClick={() => onShowPage(pageNumber)}>
          {whole}
        </button>
      )
    }
    last = index + whole.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

/**
 * Renders a monitoring note safely: paragraphs, bullet lists, bold and page
 * links, built as React elements, never as HTML from the note. The first
 * paragraph, the conclusion, is set apart as a summary.
 */
export function NoteText({ body, onShowPage }: NoteTextProps) {
  const [summary, ...rest] = parseNoteBlocks(body)
  return (
    <div className={styles.text}>
      {summary?.type === "paragraph" && <p className={styles.summary}>{renderInline(summary.text, onShowPage)}</p>}
      {[...(summary?.type === "list" ? [summary] : []), ...rest].map((block, index) =>
        block.type === "paragraph" ? (
          <p key={index}>{renderInline(block.text, onShowPage)}</p>
        ) : (
          <ul key={index} className={styles.list}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{renderInline(item, onShowPage)}</li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}
