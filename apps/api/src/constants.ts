export const API_PORT = Number(process.env.API_PORT ?? 4310)

export const API_PREFIX = "/api"

export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL: 500,
  SERVICE_UNAVAILABLE: 503
} as const

/** Largest reporting pack accepted for upload. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export const PDF_SIGNATURE = "%PDF-"
