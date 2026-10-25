/** Query string parameter holding the selected run. */
export const RUN_QUERY_PARAM = "run"

/** Query string parameter naming a top-level page other than the portfolio. */
export const VIEW_QUERY_PARAM = "view"

export const PDF_RENDER_SCALE_MAX = 2

export const PDF_PAGE_GUTTER = 24

/** Zoom steps for the document viewer, as multiples of fit-to-width. */
export const PDF_ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

/** Width of the source snippet image under the document, in CSS pixels. */
export const SOURCE_SNIPPET_WIDTH = 420

export const DATE_LOCALE = "en-AU"

/** Run statuses during which the agent is still working. */
export const IN_PROGRESS_RUN_STATUSES = ["extracting", "tested"] as const

export const RUN_POLL_INTERVAL_MS = 1_000

/** How often lists refresh while nothing is running, so changes from other sessions appear. */
export const LIVE_REFRESH_INTERVAL_MS = 10_000

export const AGENT_LABEL = "Claude Haiku 5.5"

/** Borrower whose run a first-time visitor lands on: the certificate mismatch story. */
export const FEATURED_BORROWER_ID = "wattle-grove"

/** Browser storage key remembering that the visitor dismissed the "Start here" guide. */
export const START_HERE_DISMISSED_KEY = "covenant-desk:start-here-dismissed"
