import type { ContentfulStatusCode } from "hono/utils/http-status"
import { HTTP_STATUS } from "#constants"

export interface ApiErrorBody {
  readonly error: { readonly code: string; readonly message: string }
}

interface TaggedFailure {
  readonly _tag: string
  readonly reason?: string
  readonly message?: string
  readonly entity?: string
}

const CLIENT_ERRORS: Readonly<Record<string, ContentfulStatusCode>> = {
  NotFound: HTTP_STATUS.NOT_FOUND,
  RunNotReady: HTTP_STATUS.CONFLICT,
  AgentBusy: HTTP_STATUS.CONFLICT,
  RunLimitReached: HTTP_STATUS.TOO_MANY_REQUESTS,
  SchemaError: HTTP_STATUS.UNPROCESSABLE,
  InvalidUpload: HTTP_STATUS.UNPROCESSABLE,
  PdfUnreadable: HTTP_STATUS.UNPROCESSABLE,
  AgentUnavailable: HTTP_STATUS.SERVICE_UNAVAILABLE
}

/** Maps a domain failure to an HTTP status and a response body safe to return to clients. */
export const toHttpError = (failure: TaggedFailure): { status: ContentfulStatusCode; body: ApiErrorBody } => {
  const status = CLIENT_ERRORS[failure._tag]
  if (status === undefined) {
    console.error(failure)
    return { status: HTTP_STATUS.INTERNAL, body: { error: { code: "InternalError", message: "Something went wrong" } } }
  }
  return {
    status,
    body: {
      error: {
        code: failure._tag,
        message:
          failure.reason || (failure.entity && `The ${failure.entity} was not found`) || failure.message || failure._tag
      }
    }
  }
}
