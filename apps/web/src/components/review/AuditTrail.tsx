import { useState } from "react"
import { AUDIT_EVENT_LABELS } from "@/constants"
import type { AuditEvent } from "@/types"
import { describeAuditEvent, groupAgentTurns } from "@/utils/audit"
import { formatDateTime } from "@/utils/format"
import styles from "./AuditTrail.module.css"

interface AuditTrailProps {
  readonly events: ReadonlyArray<AuditEvent>
}

function EventRow({ event }: { readonly event: AuditEvent }) {
  const summary = describeAuditEvent(event)
  return (
    <li className={styles.event} data-kind={event.kind}>
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
}

function AgentTurns({ turns }: { readonly turns: ReadonlyArray<AuditEvent> }) {
  const [open, setOpen] = useState(false)
  const first = turns[0]
  if (!first) return null
  return (
    <li className={styles.event} data-kind="agent.turns">
      <span className={styles.marker} aria-hidden />
      <div className={styles.content}>
        <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className={styles.chevron} aria-hidden>
            {open ? "▾" : "▸"}
          </span>
          {turns.length === 1 ? "Agent step" : `${turns.length} agent steps`}
        </button>
        <p className={styles.meta}>
          {first.actor} · <time dateTime={first.at}>{formatDateTime(first.at)}</time>
        </p>
        {open && (
          <ol className={styles.turns}>
            {turns.map((turn) => (
              <li key={turn.id}>{describeAuditEvent(turn) ?? "Agent step"}</li>
            ))}
          </ol>
        )}
      </div>
    </li>
  )
}

export function AuditTrail({ events }: AuditTrailProps) {
  return (
    <ol className={styles.list}>
      {groupAgentTurns(events).map((entry) =>
        entry.type === "event" ? (
          <EventRow key={entry.event.id} event={entry.event} />
        ) : (
          <AgentTurns key={entry.turns[0]?.id ?? "agent"} turns={entry.turns} />
        )
      )}
    </ol>
  )
}
