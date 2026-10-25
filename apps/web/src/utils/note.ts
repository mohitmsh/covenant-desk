import { NOTE_LIST_ITEM_PATTERN } from "@/constants"
import type { NoteBlock } from "@/types"

/** Splits a monitoring note into paragraphs and bullet lists, the only markdown understood. */
export const parseNoteBlocks = (body: string): NoteBlock[] =>
  body.split(/\n\s*\n/).flatMap((chunk) => {
    const blocks: NoteBlock[] = []
    for (const line of chunk.split("\n").filter((l) => l.trim() !== "")) {
      const last = blocks.at(-1)
      if (NOTE_LIST_ITEM_PATTERN.test(line)) {
        const item = line.replace(NOTE_LIST_ITEM_PATTERN, "")
        if (last?.type === "list") blocks[blocks.length - 1] = { type: "list", items: [...last.items, item] }
        else blocks.push({ type: "list", items: [item] })
      } else if (last?.type === "paragraph") {
        blocks[blocks.length - 1] = { type: "paragraph", text: `${last.text} ${line.trim()}` }
      } else {
        blocks.push({ type: "paragraph", text: line.trim() })
      }
    }
    return blocks
  })
