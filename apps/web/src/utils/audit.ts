import { AUDIT_EVENT_KINDS, FIGURE_LABELS, ISSUE_STATUSES } from "@covenant-desk/core/constants"
import { ISSUE_STATUS_LABELS } from "@/constants"
import { isFigureKey } from "@/utils/figures"
import type { AuditEvent, IssueStatus, JsonValue } from "@/types"
import { formatPage } from "./format"

const isIssueStatus = (value: JsonValue | undefined): value is IssueStatus =>
  ISSUE_STATUSES.some((status) => status === value)

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
    case AUDIT_EVENT_KINDS.CHECKS_COMPLETED:
      return typeof detail.found === "number"
        ? `${detail.found} issue${detail.found === 1 ? "" : "s"} found` +
            (typeof detail.remembered === "number" && detail.remembered > 0 ? `, ${detail.remembered} from memory` : "")
        : null
    case AUDIT_EVENT_KINDS.ISSUE_DECIDED:
    case AUDIT_EVENT_KINDS.ISSUE_REMEMBERED:
    case AUDIT_EVENT_KINDS.ISSUE_REOPENED:
      return [
        typeof detail.title === "string" ? detail.title : null,
        isIssueStatus(detail.status) && event.kind !== AUDIT_EVENT_KINDS.ISSUE_REOPENED
          ? ISSUE_STATUS_LABELS[detail.status]
          : null,
        typeof detail.reason === "string" ? `“${detail.reason}”` : null
      ]
        .filter(Boolean)
        .join(" · ")
    default:
      return null
  }
}
