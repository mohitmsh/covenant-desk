import { formatPage } from "@/utils/format"
import styles from "./PageTag.module.css"

interface PageTagProps {
  readonly page: number
  readonly active?: boolean
  readonly onClick: () => void
}

/** Source page marker. Opens the page in the document viewer. */
export function PageTag({ page, active = false, onClick }: PageTagProps) {
  return (
    <button
      type="button"
      className={styles.tag}
      data-active={active}
      onClick={onClick}
      title={`Show source on page ${page}`}
    >
      {formatPage(page)}
    </button>
  )
}
