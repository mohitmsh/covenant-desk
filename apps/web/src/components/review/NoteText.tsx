import type { ReactNode } from "react"
import styles from "./MonitoringNote.module.css"

interface NoteTextProps {
  readonly body: string
  /** Without it, page references are shown as plain text. */
  readonly onShowPage?: (page: number) => void
}

type Block = { readonly type: "paragraph"; readonly text: string } | { readonly type: "list"; readonly items: string[] }

const LIST_ITEM = /^\s*[-*•]\s+/

/** Splits a note into paragraphs and bullet lists. Only this small subset of markdown is understood. */
const parseBlocks = (body: string): Block[] =>
  body.split(/\n\s*\n/).flatMap((chunk): Block[] => {
    const lines = chunk.split("\n").filter((line) => line.trim() !== "")
    const blocks: Block[] = []
    for (const line of lines) {
      const last = blocks.at(-1)
      if (LIST_ITEM.test(line)) {
        const item = line.replace(LIST_ITEM, "")
        if (last?.type === "list") last.items.push(item)
        else blocks.push({ type: "list", items: [item] })
      } else if (last?.type === "paragraph") {
        blocks[blocks.length - 1] = { type: "paragraph", text: `${last.text} ${line.trim()}` }
      } else {
        blocks.push({ type: "paragraph", text: line.trim() })
      }
    }
    return blocks
  })

/** `**bold**`, and page references such as `page 6`, `(p. 4)` or `pages 3`, which become links into the PDF. */
const INLINE = /\*\*(.+?)\*\*|\b(pages?|p\.)\s?(\d{1,2})\b/gi

const renderInline = (text: string, onShowPage: ((page: number) => void) | undefined): ReactNode[] => {
  const nodes: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(INLINE)) {
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
  const [summary, ...rest] = parseBlocks(body)
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
