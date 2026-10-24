import { FIGURE_LABELS } from "@covenant-desk/core/constants"
import type { VerifiedFigure } from "@/types"
import { formatAsReported, sortFigures } from "@/utils/figures"
import { formatDollars } from "@/utils/format"
import { PageTag } from "@/components/ui/PageTag"
import styles from "./FigureTable.module.css"

interface FigureTableProps {
  readonly figures: ReadonlyArray<VerifiedFigure>
  readonly focusedFigure: string | null
  readonly onFocusFigure: (figure: VerifiedFigure) => void
}

export function FigureTable({ figures, focusedFigure, onFocusFigure }: FigureTableProps) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Figure</th>
          <th className={styles.numeric}>Value</th>
          <th className={styles.numeric}>As reported</th>
          <th className={styles.source}>Source</th>
        </tr>
      </thead>
      <tbody>
        {sortFigures(figures).map((figure) => (
          <tr
            key={figure.key}
            className={styles.row}
            aria-selected={focusedFigure === figure.key}
            onClick={() => onFocusFigure(figure)}
          >
            <td>{FIGURE_LABELS[figure.key]}</td>
            <td className={`${styles.numeric} tabular`}>{formatDollars(figure.value)}</td>
            <td className={`${styles.numeric} ${styles.muted} tabular`}>{formatAsReported(figure)}</td>
            <td className={styles.source}>
              <PageTag page={figure.page} active={focusedFigure === figure.key} onClick={() => onFocusFigure(figure)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
