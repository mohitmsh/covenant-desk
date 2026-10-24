import { useId, useRef, useState, type KeyboardEvent } from "react"
import { useDismiss } from "@/hooks/use-dismiss"
import type { Borrower } from "@/types"
import { formatCompactDollars } from "@/utils/format"
import styles from "./BorrowerSelect.module.css"

interface BorrowerSelectProps {
  readonly borrowers: ReadonlyArray<Borrower>
  readonly value: string
  readonly onChange: (borrowerId: string) => void
}

/** Borrower picker drawn in the app's own style, replacing the native select. */
export function BorrowerSelect({ borrowers, value, onChange }: BorrowerSelectProps) {
  const ref = useRef<HTMLDivElement>(null)
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const close = () => setOpen(false)
  useDismiss(ref, close, open)

  const selected = borrowers.find((borrower) => borrower.id === value)

  const openList = () => {
    setActiveIndex(
      Math.max(
        0,
        borrowers.findIndex((borrower) => borrower.id === value)
      )
    )
    setOpen(true)
  }

  const choose = (borrower: Borrower) => {
    onChange(borrower.id)
    setOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault()
        openList()
      }
      return
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const step = event.key === "ArrowDown" ? 1 : -1
      setActiveIndex((index) => (index + step + borrowers.length) % borrowers.length)
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      const borrower = borrowers[activeIndex]
      if (borrower) choose(borrower)
    } else if (event.key === "Escape") {
      // Keep Escape from also closing the surrounding dialog.
      event.preventDefault()
      event.stopPropagation()
      close()
    }
  }

  return (
    <div ref={ref} className={styles.root}>
      <button
        type="button"
        className={styles.trigger}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
      >
        <span className={styles.value}>
          {selected ? (
            <>
              <span className={styles.name}>{selected.name}</span>
              <span className={styles.meta}>{selected.facilityName}</span>
            </>
          ) : (
            <span className={styles.placeholder}>Loading borrowers…</span>
          )}
        </span>
        <svg className={styles.chevron} width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <ul id={listId} className={styles.list} role="listbox" aria-label="Borrower">
          {borrowers.map((borrower, index) => (
            <li
              key={borrower.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={borrower.id === value}
              data-active={index === activeIndex}
              className={styles.option}
              onPointerEnter={() => setActiveIndex(index)}
              onClick={() => choose(borrower)}
            >
              <span className={styles.name}>{borrower.name}</span>
              <span className={styles.meta}>
                {borrower.facilityName} ·{" "}
                <span className="tabular">{formatCompactDollars(borrower.facilityLimit)}</span>
              </span>
              {borrower.id === value && (
                <svg className={styles.check} width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path
                    d="M3 7.5 6 10.5 11 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
