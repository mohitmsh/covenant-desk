import type { ApiErrorBody } from "@/types"

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message)
  }
}

/** Fetches JSON from the API, throwing `ApiError` for non-2xx responses. */
export const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const isJsonBody = typeof init?.body === "string"
  const response = await fetch(url, {
    ...init,
    headers: { ...(isJsonBody ? { "Content-Type": "application/json" } : {}), ...init?.headers }
  })
  if (!response.ok) {
    const body: Partial<ApiErrorBody> = await response.json().catch(() => ({}))
    throw new ApiError(response.status, body.error?.code ?? "HttpError", body.error?.message ?? response.statusText)
  }
  const data: T = await response.json()
  return data
}
