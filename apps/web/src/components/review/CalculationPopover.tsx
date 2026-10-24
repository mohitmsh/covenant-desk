import { useRef } from "react"
import { FIGURE_LABELS, METRIC_DEFINITIONS } from "@covenant-desk/core/constants"
import { OPERATOR_SYMBOLS } from "@/constants"
import { useDismiss } from "@/hooks/use-dismiss"
import type { CovenantResult, VerifiedFigure } from "@/types"
import { substitutedFormula } from "@/utils/covenants"
import { formatCompactDollars, formatMetric, formatPage } from "@/utils/format"
import { DocumentIcon } from "@/components/ui/DocumentIcon"
import styles from "./CalculationPopover.module.css"

interface CalculationPopoverProps {
  readonly covenant: CovenantResult
  readonly figures: ReadonlyArray<VerifiedFigure>
  readonly focusedFigure: string | null
  readonly onFocusFigure: (figure: VerifiedFigure) => void
  readonly onClose: () => void
}

export function CalculationPopover({
  covenant,
  figures,
  focusedFigure,
  onFocusFigure,
  onClose
}: CalculationPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, onClose, true)

  const inputs = METRIC_DEFINITIONS[covenant.metric].inputs.flatMap((key) =>
    figures.filter((figure) => figure.key === key)
  )

  return (
    <div ref={ref} className={styles.popover} role="dialog" aria-label={`${covenant.name} calculation`}>
      <p className={styles.heading}>{covenant.name} calculation</p>

      <div className={styles.equation}>
        <p className={styles.formula}>{covenant.formula}</p>
        <p className={`${styles.values} tabular`}>
          {substitutedFormula(covenant)} ={" "}
          <span className={styles.result} data-status={covenant.status}>
            {formatMetric(covenant.metric, covenant.actual)}
          </span>
        </p>
        <p className={styles.limit}>
          Limit {OPERATOR_SYMBOLS[covenant.operator]} {formatMetric(covenant.metric, covenant.limit)} · Covenant v
          {covenant.covenantVersion}
        </p>
      </div>

      <p className={styles.sourceHeading}>From the management accounts</p>
      <ul className={styles.inputs}>
        {inputs.map((figure) => (
          <li key={figure.key}>
            <button
              type="button"
              className={styles.input}
              aria-pressed={focusedFigure === figure.key}
              onClick={() => onFocusFigure(figure)}
            >
              <DocumentIcon />
              <span className={styles.label}>
                {FIGURE_LABELS[figure.key]}, <span className={styles.page}>{formatPage(figure.page)}</span>
              </span>
              <span className={`${styles.amount} tabular`}>{formatCompactDollars(figure.value)}</span>
              <span className={styles.open} aria-hidden>
                ↗
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className={styles.verified}>✓ Verified to source</p>
    </div>
  )
}
