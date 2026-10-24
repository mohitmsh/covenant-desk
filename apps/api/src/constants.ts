/** `PORT` is set by hosting platforms such as Render. */
export const API_PORT = Number(process.env.PORT ?? process.env.API_PORT ?? 4310)

/** Agent runs allowed per 24 hours; unset means no limit. Guards API spend on a public deployment. */
export const DAILY_AGENT_RUN_LIMIT = process.env.DAILY_AGENT_RUN_LIMIT
  ? Number(process.env.DAILY_AGENT_RUN_LIMIT)
  : Number.POSITIVE_INFINITY

/** Built web app, served by the API in production. */
export const WEB_DIST_DIR = process.env.WEB_DIST_DIR

export const API_PREFIX = "/api"

export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  UNPROCESSABLE: 422,
  INTERNAL: 500,
  SERVICE_UNAVAILABLE: 503
} as const

/** Largest reporting pack accepted for upload. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export const PDF_SIGNATURE = "%PDF-"
