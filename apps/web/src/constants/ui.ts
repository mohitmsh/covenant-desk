/** Query string parameter holding the selected run. */
export const RUN_QUERY_PARAM = "run"

export const PDF_RENDER_SCALE_MAX = 2

export const PDF_PAGE_GUTTER = 24

export const DATE_LOCALE = "en-AU"

/** Run statuses during which the agent is still working. */
export const IN_PROGRESS_RUN_STATUSES = ["extracting", "tested"] as const

export const RUN_POLL_INTERVAL_MS = 1_000

/** How often lists refresh while nothing is running, so changes from other sessions appear. */
export const LIVE_REFRESH_INTERVAL_MS = 10_000

export const AGENT_LABEL = "Claude Haiku 5.5"
