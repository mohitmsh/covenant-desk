import type { AuditEvent, RunStatus } from "@/types"
import { agentSteps, isRunInProgress } from "@/utils/runs"
import { Section } from "@/components/ui/Section"
import styles from "./AgentProgress.module.css"

interface AgentProgressProps {
  readonly status: RunStatus
  readonly events: ReadonlyArray<AuditEvent>
}

/** Live view of the agent's steps while a run is in progress, and the reason when it fails. */
export function AgentProgress({ status, events }: AgentProgressProps) {
  const working = isRunInProgress(status)
  const steps = agentSteps(events)

  return (
    <Section title={working ? "Agent working" : "Agent stopped"} meta={working ? "Updates live" : undefined}>
      <ol className={styles.steps}>
        {steps.map((step) => (
          <li key={step.id} className={styles.step} data-tone={step.tone}>
            <span className={styles.marker} aria-hidden />
            <span>{step.label}</span>
            {step.detail && <span className={styles.detail}>{step.detail}</span>}
          </li>
        ))}
        {working && (
          <li className={styles.step} data-tone="pending">
            <span className={styles.marker} aria-hidden />
            <span className={styles.pending}>Working…</span>
          </li>
        )}
      </ol>
    </Section>
  )
}
