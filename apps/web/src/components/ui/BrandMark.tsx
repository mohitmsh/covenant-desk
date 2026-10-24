import styles from "./BrandMark.module.css"

/** Covenant Desk monogram and wordmark. */
export function BrandMark() {
  return (
    <span className={styles.brand}>
      <span className={styles.mark} aria-hidden>
        C
      </span>
      Covenant Desk
    </span>
  )
}
