import { AUDIT_EVENT_LABELS } from "@/constants"
import type { AuditEvent } from "@/types"
import { describeAuditEvent } from "@/utils/audit"
import { formatDateTime } from "@/utils/format"
import styles from "./AuditTrail.module.css"

interface AuditTrailProps {
  readonly events: ReadonlyArray<AuditEvent>
}

export function AuditTrail({ events }: AuditTrailProps) {
  return (
    <ol className={styles.list}>
      {events.map((event) => {
        const summary = describeAuditEvent(event)
        return (
          <li key={event.id} className={styles.event} data-kind={event.kind}>
            <span className={styles.marker} aria-hidden />
            <div className={styles.content}>
              <p className={styles.title}>
                {AUDIT_EVENT_LABELS[event.kind] ?? event.kind}
                {summary && <span className={styles.summary}>{summary}</span>}
              </p>
              <p className={styles.meta}>
                {event.actor} · <time dateTime={event.at}>{formatDateTime(event.at)}</time>
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
