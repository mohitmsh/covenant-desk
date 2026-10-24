import { AUDIT_EVENT_KINDS, FIGURE_LABELS } from "@covenant-desk/core/constants"
import { isFigureKey } from "@/utils/figures"
import type { AuditEvent } from "@/types"
import { formatPage } from "./format"

/** One-line summary of an audit event's detail. */
export const describeAuditEvent = (event: AuditEvent): string | null => {
  const { detail } = event
  switch (event.kind) {
    case AUDIT_EVENT_KINDS.FIGURE_VERIFIED:
    case AUDIT_EVENT_KINDS.FIGURE_REJECTED: {
      const key = typeof detail.key === "string" ? detail.key : null
      const page = typeof detail.page === "number" ? formatPage(detail.page) : null
      return [key && isFigureKey(key) ? FIGURE_LABELS[key] : key, page].filter(Boolean).join(" · ")
    }
    case AUDIT_EVENT_KINDS.CERTIFICATE_VERIFIED:
      return [
        typeof detail.metric === "string" ? detail.metric.replace("_", " ") : null,
        typeof detail.page === "number" ? formatPage(detail.page) : null
      ]
        .filter(Boolean)
        .join(" · ")
    case AUDIT_EVENT_KINDS.NOTE_SAVED:
      return typeof detail.version === "number" ? `Version ${detail.version}` : null
    case AUDIT_EVENT_KINDS.RUN_APPROVED:
      return typeof detail.noteVersion === "number" ? `Note version ${detail.noteVersion}` : null
    case AUDIT_EVENT_KINDS.COVENANTS_TESTED:
      return Array.isArray(detail.results) ? `${detail.results.length} covenants` : null
    default:
      return null
  }
}
