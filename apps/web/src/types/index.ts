import type { PageBox } from "@covenant-desk/core/types"

export type {
  Approval,
  CertificateComparison,
  VerifiedCertificateClaim,
  Portfolio,
  PortfolioRow,
  PortfolioTotals,
  AuditEvent,
  Borrower,
  CovenantResult,
  CovenantStatus,
  DocumentRecord,
  FigureKey,
  Issue,
  IssueAction,
  IssueDecision,
  IssueKind,
  IssueStatus,
  JsonValue,
  Metric,
  Note,
  Operator,
  PageBox,
  RunDetail,
  RunStatus,
  RunSummary,
  VerifiedFigure
} from "@covenant-desk/core/types"

/** Error payload returned by the API. */
export interface ApiErrorBody {
  readonly error: { readonly code: string; readonly message: string }
}

/** Top-level screen, kept in the URL. */
export type Route = { readonly view: "portfolio" } | { readonly view: "run"; readonly runId: string }

/** Where the document viewer should look, and what to highlight. */
export interface SourceFocus {
  readonly page: number
  readonly quote: string | null
  /** Reported number to emphasise within the quote. */
  readonly reported: number | null
  /** Where the quote sits on the page, for the source snippet. */
  readonly box: PageBox | null
}
